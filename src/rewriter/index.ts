import Anthropic from '@anthropic-ai/sdk';
import { DispatchList } from '../matcher/types';
import {
  buildTranslationPrompt,
  buildEnglishPrompt,
  buildSimpleRetryPrompt,
  LANG_NAMES,
} from './prompt';
import { getCached, setCached, isReady } from './cache';
import {
  libreTranslateEnglishTo,
  rewriteNeedsEnglishFirst,
  useLibreTranslateFor,
} from './libretranslate';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2';
const USE_CLAUDE = !!process.env.ANTHROPIC_API_KEY;
const USE_OPENROUTER = !USE_CLAUDE && !!process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.1-8b-instruct:free';
const anthropicClient = USE_CLAUDE ? new Anthropic() : null;

const ASCII_ONLY = /^[\x00-\x7F]*$/;

const HAS_HAN = /\p{Script=Han}/u;
const HAS_HANGUL = /\p{Script=Hangul}/u;

const HARDCODED_FALLBACK: Record<'zh' | 'vi' | 'ko', string> = {
  zh: '紧急警报：请立即采取行动保证安全。',
  vi: 'Cảnh báo khẩn cấp: Hãy hành động ngay để đảm bảo an toàn.',
  ko: '긴급 경보: 즉시 안전 조치를 취하십시오.',
};

const FALLBACK_LANGS = new Set<string>(['zh', 'vi', 'ko']);

function truncateForLang(s: string, lang: string, maxLen = 160): string {
  if (s.length <= maxLen) return s;
  if (lang === 'zh' || lang === 'ko') {
    return [...s].slice(0, maxLen).join('');
  }
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

function looksLikeEnglish(s: string): boolean {
  return ![...s].some((c) => (c.codePointAt(0) ?? 0) > 127);
}

/** True if output is empty or clearly unusable for zh/vi/ko (before hardcoded fallback). */
function translationUnacceptable(lang: string, text: string): boolean {
  if (text.length === 0) return true;
  if (lang === 'zh') return !HAS_HAN.test(text);
  if (lang === 'ko') {
    if (HAS_HANGUL.test(text)) return false;
    return looksLikeEnglish(text);
  }
  if (lang === 'vi') return looksLikeEnglish(text);
  return false;
}

/** Only es: zh/vi/ko use dedicated fallback chain. */
const BLEED_DETECTABLE = new Set(['es']);

function cleanResponse(raw: string, lang: string): string {
  let lines = raw.trim().split('\n');

  if (lang !== 'en') {
    const targetLines = lines.filter((l) => !ASCII_ONLY.test(l) || l.trim() === '');
    if (targetLines.some((l) => l.trim().length > 0)) {
      lines = targetLines;
    }
  }

  const cleaned = lines
    .map((l) => l
      .replace(/^[\s]*[①②③1-9][.)]\s*/u, '')
      .replace(/^[\s]*[-–•]\s+/, '')
      .replace(/^["'""]|["'""]$/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter((l) => l.length > 0)
    .join(' ')
    .trim();

  const result = truncateForLang(cleaned, lang);

  if (BLEED_DETECTABLE.has(lang) && result.length > 0 && looksLikeEnglish(result)) {
    throw new Error(
      `[ai-rewriter] Language bleed detected for lang=${lang}: output appears to be English. ` +
      `Raw: "${result.slice(0, 80)}…"`
    );
  }

  return result;
}

async function ollamaGenerate(
  prompt: string,
  numPredict: number,
  temperature?: number,
): Promise<{ response: string }> {
  const body: Record<string, unknown> = {
    model: OLLAMA_MODEL,
    prompt,
    stream: false,
    num_predict: numPredict,
  };
  if (temperature !== undefined) {
    body.options = { temperature };
  }
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as { response: string };
}

async function claudeGenerate(prompt: string, maxTokens: number): Promise<{ response: string }> {
  const msg = await anthropicClient!.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = (msg.content[0] as { type: 'text'; text: string }).text;
  return { response: text };
}

async function openrouterGenerate(prompt: string, maxTokens: number): Promise<{ response: string }> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return { response: json.choices[0].message.content };
}

async function generate(
  prompt: string,
  numPredict: number,
  temperature?: number,
): Promise<{ response: string }> {
  if (USE_CLAUDE) return claudeGenerate(prompt, numPredict);
  if (USE_OPENROUTER) return openrouterGenerate(prompt, numPredict);
  try {
    return await ollamaGenerate(prompt, numPredict, temperature);
  } catch {
    return { response: '' };
  }
}

export async function translateOne(alertId: string, alertText: string, lang: string): Promise<string> {
  if (lang === 'en') {
    const cached = getCached(alertId, lang);
    if (cached) {
      console.log(`[ai-rewriter] Cache hit: ${alertId}:${lang}`);
      return cached;
    }
    const data = await generate(buildEnglishPrompt(alertText), 80);
    const text = cleanResponse(data.response, 'en') || truncateForLang(alertText, 'en');
    setCached(alertId, lang, text);
    console.log(`[ai-rewriter] Translated ${alertId}:${lang} → "${text}"`);
    return text;
  }

  const cached = getCached(alertId, lang);
  if (cached) {
    if (FALLBACK_LANGS.has(lang) && translationUnacceptable(lang, cached)) {
      console.warn(`[ai-rewriter] Ignoring stale cache for ${lang} (${alertId})`);
    } else {
      console.log(`[ai-rewriter] Cache hit: ${alertId}:${lang}`);
      return cached;
    }
  }

  const langLabel = LANG_NAMES[lang] ?? lang;
  console.log(`[ai-rewriter] Calling Ollama (${OLLAMA_MODEL}) for ${alertId}:${lang} (${langLabel})...`);

  if (useLibreTranslateFor(lang)) {
    const enText = getCached(alertId, 'en');
    if (enText) {
      const lt = await libreTranslateEnglishTo(enText, lang);
      const candidate = lt ? truncateForLang(lt, lang) : '';
      if (candidate.length > 0 && !translationUnacceptable(lang, candidate)) {
        setCached(alertId, lang, candidate);
        console.log(`[ai-rewriter] LibreTranslate ${alertId}:${lang} → "${candidate}"`);
        return candidate;
      }
      console.warn(`[ai-rewriter] LibreTranslate miss for ${lang}, falling back to Ollama`);
    } else {
      console.warn(`[ai-rewriter] No English SMS cached for LT; using Ollama for ${lang}`);
    }
  }

  if (!FALLBACK_LANGS.has(lang)) {
    const prompt = buildTranslationPrompt(alertText, lang);
    const data = await generate(prompt, lang === 'zh' ? 120 : 80, lang === 'zh' ? 0.35 : undefined);
    const text = cleanResponse(data.response, lang) || truncateForLang(alertText, lang);
    setCached(alertId, lang, text);
    console.log(`[ai-rewriter] Translated ${alertId}:${lang} → "${text}"`);
    return text;
  }

  let text = '';
  try {
    const prompt = buildTranslationPrompt(alertText, lang);
    const data = await generate(prompt, lang === 'zh' ? 120 : 80, lang === 'zh' ? 0.35 : undefined);
    text = cleanResponse(data.response, lang);
  } catch (e) {
    console.warn(`[ai-rewriter] Primary pass failed for ${lang} (${alertId}):`, e);
    text = '';
  }

  if (!translationUnacceptable(lang, text)) {
    setCached(alertId, lang, text);
    console.log(`[ai-rewriter] Translated ${alertId}:${lang} → "${text}"`);
    return text;
  }

  let text2 = '';
  try {
    const data = await generate(buildSimpleRetryPrompt(alertText, lang), 120, 0.3);
    text2 = cleanResponse(data.response, lang);
  } catch (e) {
    console.warn(`[ai-rewriter] Retry failed for ${lang} (${alertId}):`, e);
    text2 = '';
  }

  if (translationUnacceptable(lang, text2)) {
    text2 = HARDCODED_FALLBACK[lang as 'zh' | 'vi' | 'ko'];
    console.warn(`[ai-rewriter] Using hardcoded fallback for ${lang} (${alertId})`);
  }

  setCached(alertId, lang, text2);
  console.log(`[ai-rewriter] Translated ${alertId}:${lang} → "${text2}"`);
  return text2;
}

export async function rewriteDispatch(
  dispatch: DispatchList
): Promise<Record<string, string>> {
  const { alertId, alertText, users } = dispatch;
  const langs = [...new Set(users.map((u) => u.language))];

  console.log(`[ai-rewriter] Processing alert ${alertId} for languages: ${langs.join(', ')}`);

  const results: Record<string, string> = {};

  if (rewriteNeedsEnglishFirst(langs)) {
    await translateOne(alertId, alertText, 'en');
  }

  await Promise.all(
    langs.map(async (lang) => {
      const text = await translateOne(alertId, alertText, lang);
      results[lang] = text;
    })
  );

  const allDone = isReady(alertId, langs);
  console.log(`[ai-rewriter] Alert ${alertId} ready=${allDone} for ${langs.length} language(s)`);

  return results;
}

export function startRewriter() {
  if (USE_CLAUDE) {
    console.log(`[ai-rewriter] Using Claude API (claude-haiku-4-5-20251001)`);
  } else if (USE_OPENROUTER) {
    console.log(`[ai-rewriter] Using OpenRouter (${OPENROUTER_MODEL})`);
  } else if (process.env.OLLAMA_URL) {
    console.log(`[ai-rewriter] Using Ollama at ${OLLAMA_URL} with model ${OLLAMA_MODEL}`);
  } else {
    console.log(`[ai-rewriter] No AI backend — using raw alert text passthrough`);
  }
  if (process.env.LIBRETRANSLATE_URL?.trim()) {
    console.log(`[ai-rewriter] LibreTranslate URL set; LIBRETRANSLATE_LANGS=${process.env.LIBRETRANSLATE_LANGS ?? 'zh,vi,ko'}`);
  }
}

export { getCached, setCached, clearTranslationCache } from './cache';
