import { Alert } from './types';

export function parseFeed(json: unknown): Alert[] {
  const data = json as { features?: unknown[] };
  if (!Array.isArray(data?.features)) return [];

  const now = new Date().toISOString();

  return data.features
    .filter((f: unknown) => (f as { properties?: unknown }).properties)
    .map((f: unknown): Alert => {
      const feature = f as { id?: string; properties: Record<string, unknown> };
      const p = feature.properties;

      const sameCodes: string[] = Array.isArray(
        (p.geocode as { SAME?: string[] } | undefined)?.SAME
      )
        ? ((p.geocode as { SAME: string[] }).SAME)
        : [];

      return {
        id: String(p.id ?? feature.id ?? ''),
        event: String(p.event ?? ''),
        severity: String(p.severity ?? ''),
        onset: String(p.onset ?? ''),
        expires: String(p.expires ?? ''),
        areaDesc: String(p.areaDesc ?? ''),
        description: String(p.description ?? p.headline ?? ''),
        fipsCodes: sameCodes,
        fetchedAt: now,
      };
    });
}
