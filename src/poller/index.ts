import cron from 'node-cron';
import { parseFeed } from './parser';
import { Alert } from './types';

const NWS_URL = 'https://alerts.weather.gov/cap/us.php?x=1';
const seenIds = new Set<string>();

async function pollAlerts(): Promise<void> {
  try {
    const res = await fetch(NWS_URL);
    if (!res.ok) {
      console.error(`[alert-poller] HTTP ${res.status} from NWS feed`);
      return;
    }
    const xml = await res.text();
    const alerts = parseFeed(xml);

    let newCount = 0;
    for (const alert of alerts) {
      if (!alert.id || seenIds.has(alert.id)) continue;
      seenIds.add(alert.id);
      newCount++;
      console.log(`[alert-poller] NEW ALERT: ${alert.event} | ${alert.severity} | ${alert.areaDesc}`);
      console.log(`[alert-poller] ID: ${alert.id}`);
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

console.log('[alert-poller] Starting cron loop (every 60s)...');
pollAlerts(); // Run immediately on startup

cron.schedule('* * * * *', () => {
  console.log('[alert-poller] Cron tick — polling NWS...');
  pollAlerts();
});
