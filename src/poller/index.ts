import cron from 'node-cron';
import { parseFeed } from './parser';
import { Alert } from './types';
import { matchAlert } from '../matcher/index';
import { rewriteDispatch } from '../rewriter/index';
import { dispatchAlert } from '../dispatcher/index';

const NWS_URL = 'https://api.weather.gov/alerts/active?status=actual';
const seenIds = new Set<string>();

async function pollAlerts(): Promise<void> {
  try {
    const res = await fetch(NWS_URL, {
      headers: { 'User-Agent': 'AlertBridge/1.0 (github.com/siddhjain-us/alertbridge)' },
    });
    if (!res.ok) {
      console.error(`[alert-poller] HTTP ${res.status} from NWS feed`);
      return;
    }
    const json = await res.json();
    const alerts = parseFeed(json);

    let newCount = 0;
    for (const alert of alerts) {
      if (!alert.id || seenIds.has(alert.id)) continue;
      seenIds.add(alert.id);
      newCount++;

      console.log(`[alert-poller] NEW ALERT: ${alert.event} | ${alert.severity} | ${alert.areaDesc}`);
      console.log(`[alert-poller] ID: ${alert.id}`);

      // Process the alert through the pipeline
      try {
        // 1. Match alert to affected users
        const dispatch = matchAlert(alert);

        // 2. Translate alert to user languages
        const translations = await rewriteDispatch(dispatch);

        // 3. Send SMS alerts to users
        await dispatchAlert(dispatch, translations);

      } catch (error) {
        console.error(`[alert-poller] Error processing alert ${alert.id}:`, error);
      }
    }

    if (newCount === 0) {
      console.log(`[alert-poller] Poll complete — no new alerts (${alerts.length} seen)`);
    } else {
      console.log(`[alert-poller] Poll complete — ${newCount} new alert(s)`);
    }
  } catch (err) {
    console.error('[alert-poller] Error polling NWS feed:', err);
  }
}

// Export start function for the orchestrator
export function startPoller() {
  console.log('[alert-poller] Starting cron loop (every 60s)...');
  pollAlerts(); // Run immediately on startup

  cron.schedule('* * * * *', () => {
    console.log('[alert-poller] Cron tick — polling NWS...');
    pollAlerts();
  });
}

// Export functions for testing/importing
export { pollAlerts };