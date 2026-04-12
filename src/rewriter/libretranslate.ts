/**
 * Optional LibreTranslate-compatible HTTP API (POST /translate).
 * No default URL — set LIBRETRANSLATE_URL to enable (e.g. pip install libretranslate; libretranslate --port 5000).
 */

const LT_URL = (process.env.LIBRETRANSLATE_URL ?? '').trim();
const LT_KEY = (process.env.LIBRETRANSLATE_API_KEY ?? '').trim();

const LT_LANGS = new Set(
  (process.env.LIBRETRANSLATE_LANGS ?? 'zh,vi,ko')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/** AlertBridge lang code → LibreTranslate `target` code */
const TO_LT: Record<string, string> = {
  zh: 'zh',
  ko: 'ko',
  vi: 'vi',
  es: 'es',
  tl: 'tl',
};

export function libreTranslateConfigured(): boolean {
  return LT_URL.length > 0;
}

export function useLibreTranslateFor(lang: string): boolean {
  return libreTranslateConfigured() && LT_LANGS.has(lang);
}

/** True if any requested language should use LT (needs English baseline first). */
export function rewriteNeedsEnglishFirst(langs: string[]): boolean {
  if (!libreTranslateConfigured()) return false;
  return langs.some((l) => LT_LANGS.has(l));
}

/**
 * Translate plain English text to target language.
 * Returns null on failure, missing target, or empty response.
 */
export async function libreTranslateEnglishTo(
  englishText: string,
  alertBridgeLang: string,
): Promise<string | null> {
  const target = TO_LT[alertBridgeLang];
  if (!target || englishText.length === 0) return null;

  const base = LT_URL.replace(/\/$/, '');
  const url = `${base}/translate`;
  const body: Record<string, string> = {
    q: englishText,
    source: 'en',
    target,
    format: 'text',
  };
  if (LT_KEY) body.api_key = LT_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[libretranslate] HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as { translatedText?: string };
    const out = data.translatedText?.trim();
    return out && out.length > 0 ? out : null;
  } catch (e) {
    console.warn('[libretranslate] request failed:', e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
