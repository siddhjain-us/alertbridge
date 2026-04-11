import { DispatchList } from '../matcher/types';
import { buildTranslationPrompt, buildEnglishPrompt, LANG_NAMES } from './prompt';
import { getCached, setCached, isReady } from './cache';

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2';

// Regex to detect lines that are likely purely ASCII-English
// (used to drop leaked English lines from non-English responses)
const ASCII_ONLY = /^[\x00-\x7F]*$/;

/**
 * Strip common model artifacts from a raw Ollama response:
 * - Leading/trailing quotes (" or ')
 * - Step markers: "1.", "2.", "①", "②", "- "
 * - For non-English: discard lines that are ASCII-only (leaked English),
 *   keeping lines that contain at least one non-ASCII character.
 * - Collapse multiple blank lines, trim, enforce 160-char limit.
 */
/** Truncate at the nearest word boundary at or under maxLen chars. Never cuts mid-word. */
function truncateAtWord(s: string, maxLen = 160): string {
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
}

/**
 * Returns true if the string contains NO non-ASCII characters (codePoint > 127).
 * English uses only ASCII. Any diacritic, CJK, Hangul, or accented Latin char
 * means the string is not English — covers es, zh, vi, ko correctly.
 * Tagalog (pure Latin) is a known limitation; bleed detection is skipped for tl.
 */
function looksLikeEnglish(s: string): boolean {
  return ![...s].some((c) => (c.codePointAt(0) ?? 0) > 127);
}

/** Languages where English-bleed detection is reliable (have non-ASCII chars when correct). */
const BLEED_DETECTABLE = new Set(['es', 'zh', 'vi', 'ko']);

function cleanResponse(raw: string, lang: string): string {
  let lines = raw.trim().split('\n');

  // For non-English, drop lines that are clearly leaked English/ASCII —
  // but preserve lines that are valid ASCII in the target language (e.g. "ID: 123").
  if (lang !== 'en') {
    const targetLines = lines.filter((l) => !ASCII_ONLY.test(l) || l.trim() === '');
    if (targetLines.some((l) => l.trim().length > 0)) {
      lines = targetLines;
    }
  }

  const cleaned = lines
    .map((l) => l
      .replace(/^[\s]*[①②③1-9][.)]\s*/u, '')  // numbered prefixes
      .replace(/^[\s]*[-–•]\s+/, '')             // bullets
      .replace(/^["'""]|["'""]$/gu, '')           // wrapping quotes
      .replace(/\s+/g, ' ')                       // collapse internal whitespace
      .trim()
    )
    .filter((l) => l.length > 0)
    .join(' ')
    .trim();

  // Word-boundary truncation — never cut mid-word
  const result = truncateAtWord(cleaned);

  // English-bleed guard: throw rather than silently return a bad translation.
  // Only applied to languages whose correct output reliably contains non-ASCII chars.
  if (BLEED_DETECTABLE.has(lang) && result.length > 0 && looksLikeEnglish(result)) {
    throw new Error(
      `[ai-rewriter] Language bleed detected for lang=${lang}: output appears to be English. ` +
      `Raw: "${result.slice(0, 80)}…"`
    );
  }

  return result;
}

/**
 * Translate one alert into one language.
 * Checks in-memory cache first — only calls Ollama on a cache miss.
 */
async function translateOne(alertId: string, alertText: string, lang: string): Promise<string> {
  const cached = getCached(alertId, lang);
  if (cached) {
    console.log(`[ai-rewriter] Cache hit: ${alertId}:${lang}`);
    return cached;
  }

  // English: rewrite only. All other languages: rewrite + translate.
  const prompt = lang === 'en'
    ? buildEnglishPrompt(alertText)
    : buildTranslationPrompt(alertText, lang);

  const langLabel = LANG_NAMES[lang] ?? lang;
  console.log(`[ai-rewriter] Calling Ollama (${OLLAMA_MODEL}) for ${alertId}:${lang} (${langLabel})...`);

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, num_predict: 80 }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as { response: string };
  const text = cleanResponse(data.response, lang);

  setCached(alertId, lang, text);
  console.log(`[ai-rewriter] Translated ${alertId}:${lang} → "${text}"`);
  return text;
}

/**
 * Process a full dispatch list: translate the alert for every unique language,
 * using one API call per (alertId, language) pair.
 * Returns a map of lang → translated SMS text.
 */
export async function rewriteDispatch(
  dispatch: DispatchList
): Promise<Record<string, string>> {
  const { alertId, alertText, users } = dispatch;
  const langs = [...new Set(users.map((u) => u.language))];

  console.log(`[ai-rewriter] Processing alert ${alertId} for languages: ${langs.join(', ')}`);

  const results: Record<string, string> = {};

  // One API call per language — never per user
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

export { getCached, setCached } from './cache';
