import Database from 'better-sqlite3';
import path from 'path';
import { Alert } from '../poller/types';
import { fipsToZips, loadCrosswalk } from './fips';
import { DispatchList, DispatchUser } from './types';

const DB_PATH = path.join(__dirname, '../../db/alertbridge.db');

function getDb(): Database.Database {
  return new Database(DB_PATH);
}

/**
 * Given an Alert, resolve affected ZIP codes and look up all registered users
 * in those ZIPs. Returns a DispatchList ready for the ai-rewriter.
 */
export function matchAlert(alert: Alert): DispatchList {
  loadCrosswalk();

  const affectedZips = fipsToZips(alert.fipsCodes);
  console.log(
    `[geo-matcher] Alert ${alert.id}: ${alert.fipsCodes.length} FIPS → ${affectedZips.length} ZIPs`
  );

  let users: DispatchUser[] = [];

  if (affectedZips.length > 0) {
    const db = getDb();
    try {
      const placeholders = affectedZips.map(() => '?').join(',');
      users = db
        .prepare(
          `SELECT phone, language, zip FROM users WHERE zip IN (${placeholders})`
        )
        .all(...affectedZips) as DispatchUser[];
    } finally {
      db.close();
    }
  }

  console.log(`[geo-matcher] Matched ${users.length} user(s) for alert ${alert.id}`);

  const dispatch: DispatchList = {
    alertId: alert.id,
    alertText: alert.description || `${alert.event} — ${alert.areaDesc}`,
    event: alert.event,
    severity: alert.severity,
    affectedZips,
    users,
    createdAt: new Date().toISOString(),
  };

  return dispatch;
}

/**
 * Simulate a match for a given ZIP code — used by the dashboard /simulate endpoint.
 */
export function matchByZip(alert: Alert, zip: string): DispatchList {
  console.log(`[geo-matcher] Simulated match for ZIP ${zip}`);

  const db = getDb();
  let users: DispatchUser[] = [];
  try {
    users = db
      .prepare('SELECT phone, language, zip FROM users WHERE zip = ?')
      .all(zip) as DispatchUser[];
  } finally {
    db.close();
  }

  console.log(`[geo-matcher] Simulation matched ${users.length} user(s) in ZIP ${zip}`);

  return {
    alertId: alert.id,
    alertText: alert.description || `${alert.event} — ${alert.areaDesc}`,
    event: alert.event,
    severity: alert.severity,
    affectedZips: [zip],
    users,
    createdAt: new Date().toISOString(),
  };
}

// Export start function for the orchestrator
export function startMatcher() {
  console.log('[geo-matcher] Loaded FIPS crosswalk: ${Object.keys(fipsToZips({})).length} counties');
  loadCrosswalk();
}