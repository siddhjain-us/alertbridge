import { XMLParser } from 'fast-xml-parser';
import { Alert } from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'entry',
});

export function parseFeed(xml: string): Alert[] {
  const result = parser.parse(xml);
  const feed = result?.feed;
  if (!feed || !feed.entry) return [];

  const entries: any[] = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
  const now = new Date().toISOString();

  return entries.map((entry: any): Alert => {
    // Extract FIPS codes from cap:geocode
    const geocode = entry['cap:geocode'];
    let fipsCodes: string[] = [];
    if (geocode) {
      const names: string[] = Array.isArray(geocode.valueName)
        ? geocode.valueName
        : [geocode.valueName];
      const values: string[] = Array.isArray(geocode.value)
        ? geocode.value
        : [geocode.value];
      const fipsIdx = names.findIndex((n: string) => n === 'FIPS6' || n === 'UGC');
      if (fipsIdx !== -1 && values[fipsIdx]) {
        fipsCodes = String(values[fipsIdx]).split(' ').filter(Boolean);
      }
    }

    return {
      id: String(entry.id || ''),
      event: String(entry['cap:event'] || ''),
      severity: String(entry['cap:severity'] || ''),
      onset: String(entry['cap:onset'] || ''),
      expires: String(entry['cap:expires'] || ''),
      areaDesc: String(entry['cap:areaDesc'] || ''),
      description: String(entry.summary || entry['cap:description'] || ''),
      fipsCodes,
      fetchedAt: now,
    };
  });
}
