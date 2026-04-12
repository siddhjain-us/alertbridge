import Database from 'better-sqlite3';
import path from 'path';
import type { DispatchList } from '../matcher/types';
import {
  type MockSmsEntry,
  type MockSmsMemoryPayload,
  keyDispatch,
  keyTranslated,
  keyMockSms,
  serializeDispatch,
} from './types';

export type { MockSmsEntry } from './types';

const DB_PATH = path.join(__dirname, '../../db/alertbridge.db');

/** In-process agent memory simulation (same process as poller/dashboard) */
const agentMemory = new Map<string, string>();

const store: MockSmsEntry[] = [];

function getDb(): Database.Database {
  return new Database(DB_PATH);
}

/** Returns true if this row was newly inserted (not a duplicate). */
function tryClaimSent(db: Database.Database, phone: string, alertId: string): boolean {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO sent_alerts (phone, alert_id, status) VALUES (?, ?, 'sent')`
    )
    .run(phone, alertId);
  return r.changes > 0;
}

/**
 * Populate memory keys from pipeline args, then downstream logic reads the same keys.
 */
function writeMemoryFromDispatch(
  dispatch: DispatchList,
  translations: Record<string, string>,
): void {
  agentMemory.set(keyDispatch(dispatch.alertId), serializeDispatch(dispatch));
  for (const [lang, text] of Object.entries(translations)) {
    agentMemory.set(keyTranslated(dispatch.alertId, lang), text);
  }
}

function readTranslated(alertId: string, language: string): string | undefined {
  return agentMemory.get(keyTranslated(alertId, language));
}

function appendMockSmsMemory(payload: MockSmsMemoryPayload): void {
  const ts = payload.sentAt;
  agentMemory.set(keyMockSms(ts), JSON.stringify(payload));
}

export function getMockSmsLog(): MockSmsEntry[] {
  return [...store].reverse();
}

export function getMockSmsCount(): number {
  return store.length;
}

/** Clear mock SMS log and agent memory (call when resetting demo DB). */
export function clearMockSmsState(): void {
  store.length = 0;
  agentMemory.clear();
}

function sendMockSms(
  to: string,
  lang: string,
  message: string,
  alertType: string,
  alertId: string,
  zip: string,
): void {
  const last4 = to.replace(/\D/g, '').slice(-4);
  const sentAt = new Date().toISOString();
  const entry: MockSmsEntry = {
    phone: last4,
    language: lang,
    message,
    alertType,
    sentAt,
    alertId,
    zip,
  };
  store.push(entry);

  appendMockSmsMemory({
    phoneLast4: last4,
    language: lang,
    message,
    alertId,
    alertType,
    sentAt,
    zip,
  });

  console.log(`[MOCK SMS] To: +1***${last4} | Lang: ${lang} | Message: ${message}`);
}

/**
 * Fan-out mock SMS delivery. Reads translations from memory keys after they are set from args.
 * Concurrency-limited to 5; dedupes via sent_alerts.
 */
export async function dispatchAlert(
  dispatch: DispatchList,
  translations: Record<string, string>,
): Promise<void> {
  writeMemoryFromDispatch(dispatch, translations);

  const { users, event, alertId } = dispatch;
  console.log(`[dispatcher] Sending ${users.length} mock SMS(es) for "${event}"...`);

  const CONCURRENCY = 5;
  const db = getDb();
  try {
    for (let i = 0; i < users.length; i += CONCURRENCY) {
      const batch = users.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async ({ phone, language, zip }) => {
          if (!tryClaimSent(db, phone, alertId)) {
            console.log(
              `[dispatcher] Skip duplicate sent_alerts: …${phone.replace(/\D/g, '').slice(-4)} alert=${alertId}`
            );
            return;
          }

          const fromMemory =
            readTranslated(alertId, language) ??
            translations[language] ??
            translations['en'];
          const message =
            fromMemory ?? `Emergency: ${event}. Check local authorities for details.`;

          sendMockSms(phone, language, message, event, alertId, zip);
        }),
      );
    }
  } finally {
    db.close();
  }

  console.log(`[dispatcher] Done — processed ${users.length} recipient(s) for alert ${alertId}.`);
}

export function startDispatcher() {
  const demo = process.env.DEMO_MODE === 'true';
  console.log(
    `[dispatcher] Mock SMS dispatcher ready${demo ? ' (DEMO_MODE)' : ''}`
  );
}
