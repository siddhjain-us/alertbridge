import { DispatchList } from '../matcher/types';

export interface MockSmsEntry {
  phone: string;       // last 4 digits only
  language: string;
  message: string;
  alertType: string;
  sentAt: string;
}

// In-process store — shared via Node module cache with dashboard routes
const store: MockSmsEntry[] = [];

export function getMockSmsLog(): MockSmsEntry[] {
  return [...store].reverse(); // newest first
}

export function getMockSmsCount(): number {
  return store.length;
}

function sendMockSms(
  to: string,
  lang: string,
  message: string,
  alertType: string,
): void {
  const last4 = to.replace(/\D/g, '').slice(-4);
  const entry: MockSmsEntry = {
    phone: last4,
    language: lang,
    message,
    alertType,
    sentAt: new Date().toISOString(),
  };
  store.push(entry);
  console.log(`[MOCK SMS] To: +1***${last4} | Lang: ${lang} | Message: ${message}`);
}

/**
 * Fan-out mock SMS delivery to all users in the dispatch list.
 * Concurrency-limited to 5 (mirrors the real Twilio dispatcher spec).
 */
export async function dispatchAlert(
  dispatch: DispatchList,
  translations: Record<string, string>,
): Promise<void> {
  const { users, event } = dispatch;
  console.log(`[dispatcher] Sending ${users.length} mock SMS(es) for "${event}"...`);

  const CONCURRENCY = 5;
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const batch = users.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ phone, language }) => {
        const message =
          translations[language] ??
          translations['en'] ??
          `Emergency: ${event}. Check local authorities for details.`;
        sendMockSms(phone, language, message, event);
      }),
    );
  }

  console.log(`[dispatcher] Done — ${users.length} mock SMS(es) delivered.`);
}
