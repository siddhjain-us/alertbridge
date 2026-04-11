import path from 'path';
import fs from 'fs';

// Map of FIPS code → array of ZIP codes
let crosswalk: Record<string, string[]> = {};
let loaded = false;

export function loadCrosswalk(): void {
  if (loaded) return;
  const filePath = path.join(__dirname, '../../data/fips-to-zip.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    crosswalk = JSON.parse(raw);
    console.log(`[geo-matcher] Loaded FIPS crosswalk: ${Object.keys(crosswalk).length} counties`);
  } catch (err) {
    console.error('[geo-matcher] Failed to load FIPS crosswalk:', err);
    crosswalk = {};
  }
  loaded = true;
}

/**
 * Normalize a FIPS code to the 6-digit zero-padded format used in the crosswalk.
 * NWS FIPS6 values may be 5 or 6 chars; our JSON keys are 6-char.
 */
function normalizeFips(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.padStart(6, '0');
}

/**
 * Given an array of FIPS codes (from a CAP alert), return all matching ZIP codes.
 */
export function fipsToZips(fipsCodes: string[]): string[] {
  loadCrosswalk();
  const zips = new Set<string>();
  for (const raw of fipsCodes) {
    const key = normalizeFips(raw);
    const matches = crosswalk[key];
    if (matches) {
      for (const zip of matches) zips.add(zip);
    }
  }
  return Array.from(zips);
}
