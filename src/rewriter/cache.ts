// In-memory translation cache: key = `${alertId}:${lang}`
const cache = new Map<string, string>();

export function cacheKey(alertId: string, lang: string): string {
  return `${alertId}:${lang}`;
}

export function getCached(alertId: string, lang: string): string | undefined {
  return cache.get(cacheKey(alertId, lang));
}

export function setCached(alertId: string, lang: string, text: string): void {
  cache.set(cacheKey(alertId, lang), text);
}

export function isReady(alertId: string, langs: string[]): boolean {
  return langs.every((l) => cache.has(cacheKey(alertId, l)));
}

export function clearTranslationCache(): void {
  cache.clear();
}
