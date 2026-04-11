export interface DashboardData {
  totalUsers: number;
  languageBreakdown: { language: string; count: number }[];
  totalSmsSent: number;
}

const LANG_LABELS: Record<string, string> = {
  en: '🇺🇸 English',
  es: '🇪🇸 Español',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
  tl: '🇵🇭 Tagalog',
  ko: '🇰🇷 한국어',
};

function langBar(breakdown: { language: string; count: number }[], total: number): string {
  if (!breakdown.length) return '<p style="color:#444;font-size:13px;margin-top:8px">No users registered yet.</p>';
  return breakdown.map(({ language, count }) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const label = LANG_LABELS[language] ?? language;
    return `
      <div style="margin:8px 0;display:flex;align-items:center;gap:10px">
        <span style="width:110px;font-size:13px;color:#ccc;flex-shrink:0">${label}</span>
        <div style="flex:1;background:#1e1e1e;border-radius:3px;height:10px;overflow:hidden">
          <div style="background:#00ff88;height:100%;width:${pct}%;border-radius:3px;transition:width .4s"></div>
        </div>
        <span style="color:#00ff88;font-size:12px;width:52px;text-align:right;flex-shrink:0">${count} (${pct}%)</span>
      </div>`;
  }).join('');
}

export function renderDashboard(data: DashboardData): string {
  const { totalUsers, languageBreakdown, totalSmsSent } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AlertBridge — Live Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0a0a0a;
      color: #e8e8e8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      padding: 28px 32px;
      min-height: 100vh;
    }

    /* ── Header ── */
    .header { display: flex; align-items: baseline; gap: 16px; margin-bottom: 6px; }
    h1 { color: #00ff88; font-size: 2rem; letter-spacing: 3px; font-weight: 700; }
    .version { color: #333; font-size: 12px; letter-spacing: 1px; }
    .subtitle { color: #3a3a3a; font-size: 12px; margin-bottom: 32px; letter-spacing: .5px; }

    /* ── Stats grid ── */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 10px;
      padding: 20px 24px;
    }
    .stat-label { color: #444; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px; }
    .stat-num { font-size: 2.8rem; font-weight: 700; color: #fff; line-height: 1; }
    .stat-num.green { color: #00ff88; }

    /* ── Cards ── */
    .card {
      background: #111;
      border: 1px solid #1e1e1e;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 18px;
    }
    .card-title {
      color: #00ff88;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 600;
    }

    /* ── Live badge ── */
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #0a1f12;
      border: 1px solid #00ff8844;
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 10px;
      color: #00ff88;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      background: #00ff88;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 #00ff8866; }
      50%       { opacity: .7; box-shadow: 0 0 0 5px #00ff8800; }
    }

    /* ── SMS log table ── */
    .sms-log-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th {
      color: #333;
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid #1a1a1a;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .8px;
      white-space: nowrap;
    }
    td { padding: 11px 12px; border-bottom: 1px solid #161616; vertical-align: top; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: #141414; }

    /* new entry highlight */
    tbody tr.is-new td { background: #001a0d; }
    tbody tr.is-new:hover td { background: #012010; }

    .entry-dot {
      display: inline-block;
      width: 7px; height: 7px;
      background: #00ff88;
      border-radius: 50%;
      margin-right: 7px;
      vertical-align: middle;
      animation: pulse 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }

    .phone-cell { font-family: 'SF Mono', 'Fira Code', monospace; color: #aaa; white-space: nowrap; }
    .lang-cell { white-space: nowrap; }
    .msg-cell { color: #ddd; max-width: 380px; word-break: break-word; line-height: 1.4; }
    .type-cell { color: #555; font-size: 11px; white-space: nowrap; }
    .time-cell { color: #444; font-size: 11px; white-space: nowrap; font-family: monospace; }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #2a2a2a;
    }
    .empty-state p { font-size: 14px; margin-bottom: 6px; }
    .empty-state small { font-size: 12px; color: #222; }

    /* ── Simulate form ── */
    .simulate-card { border-color: #00ff8822; }
    .simulate-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .sim-input {
      background: #0d0d0d;
      border: 1px solid #2a2a2a;
      color: #fff;
      padding: 11px 16px;
      border-radius: 8px;
      font-size: 14px;
      width: 200px;
      outline: none;
      transition: border-color .2s;
    }
    .sim-input:focus { border-color: #00ff88; }
    .sim-input::placeholder { color: #333; }
    .sim-btn {
      background: #00ff88;
      color: #000;
      border: none;
      padding: 11px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      letter-spacing: .5px;
      transition: background .15s, transform .1s;
    }
    .sim-btn:hover { background: #00e67a; }
    .sim-btn:active { transform: scale(.97); }
    .sim-btn:disabled { background: #1a3d2a; color: #3a3a3a; cursor: not-allowed; }
    #sim-status { font-size: 13px; margin-top: 12px; min-height: 18px; color: #00ff88; }
    #sim-status.error { color: #ff4d4d; }
    #sim-status.info  { color: #888; }

    /* ── refresh ticker ── */
    .refresh-ticker { font-size: 11px; color: #2a2a2a; margin-left: auto; font-family: monospace; }

    /* ── SMS counter badge ── */
    .sms-badge {
      margin-left: auto;
      background: #00ff8815;
      color: #00ff88;
      border: 1px solid #00ff8830;
      border-radius: 20px;
      padding: 2px 12px;
      font-size: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>AlertBridge</h1>
    <span class="version">v1.0 · MOCK MODE</span>
  </div>
  <div class="subtitle" id="ts">Emergency Alert Translation System</div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat-card">
      <div class="stat-label">Registered Users</div>
      <div class="stat-num" id="stat-users">${totalUsers}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Languages Active</div>
      <div class="stat-num">${languageBreakdown.length || '—'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Mock SMS Sent</div>
      <div class="stat-num green" id="stat-sms">${totalSmsSent}</div>
    </div>
  </div>

  <!-- Language breakdown -->
  <div class="card" style="margin-bottom:20px">
    <div class="card-header">
      <span class="card-title">User Breakdown by Language</span>
    </div>
    <div id="lang-bars">${langBar(languageBreakdown, totalUsers)}</div>
  </div>

  <!-- Simulate -->
  <div class="card simulate-card" style="margin-bottom:20px">
    <div class="card-header">
      <span class="card-title">Simulate Alert</span>
    </div>
    <div class="simulate-row">
      <input class="sim-input" id="sim-zip" type="text" placeholder="ZIP code (e.g. 90210)" maxlength="5" pattern="\\d{5}" autocomplete="off">
      <button class="sim-btn" id="sim-btn" onclick="simulate()">⚡ Send Test Alert</button>
    </div>
    <div id="sim-status"></div>
  </div>

  <!-- SMS Delivery Log — hero section -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">SMS Delivery Log</span>
      <span class="live-badge"><span class="pulse-dot"></span>LIVE</span>
      <span class="sms-badge" id="log-count">0 delivered</span>
      <span class="refresh-ticker" id="ticker">—</span>
    </div>
    <div class="sms-log-wrap">
      <table>
        <thead>
          <tr>
            <th>Phone</th>
            <th>Language</th>
            <th>Message</th>
            <th>Alert Type</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody id="sms-tbody">
          <tr><td colspan="5"><div class="empty-state"><p>Awaiting first alert…</p><small>Use the Simulate button above to trigger a test.</small></div></td></tr>
        </tbody>
      </table>
    </div>
  </div>

<script>
  const LANG_LABELS = ${JSON.stringify(Object.fromEntries(Object.entries(LANG_LABELS).map(([k, v]) => [k, v])))};

  // Update timestamp
  document.getElementById('ts').textContent =
    'Emergency Alert Translation System · ' + new Date().toLocaleString();

  // ── SMS log live refresh ──
  let lastCount = 0;

  async function refreshSmsLog() {
    try {
      const res = await fetch('/api/sms-log');
      if (!res.ok) return;
      const entries = await res.json();
      const now = Date.now();
      const tbody = document.getElementById('sms-tbody');
      const countEl = document.getElementById('log-count');
      const statSms = document.getElementById('stat-sms');

      // update counters
      countEl.textContent = entries.length + ' delivered';
      statSms.textContent = entries.length;

      if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Awaiting first alert…</p><small>Use the Simulate button above to trigger a test.</small></div></td></tr>';
        lastCount = 0;
        return;
      }

      // flash new rows briefly if count grew
      const isNew = entries.length > lastCount;
      lastCount = entries.length;

      tbody.innerHTML = entries.map((e, i) => {
        const ageMs = now - new Date(e.sentAt).getTime();
        const fresh = ageMs < 8000;
        const timeStr = new Date(e.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const langLabel = LANG_LABELS[e.language] || e.language;
        return \`<tr class="\${fresh ? 'is-new' : ''}">
          <td class="phone-cell">\${fresh ? '<span class="entry-dot"></span>' : ''}<span style="opacity:.4">+1***</span>\${e.phone}</td>
          <td class="lang-cell">\${langLabel}</td>
          <td class="msg-cell">\${escHtml(e.message)}</td>
          <td class="type-cell">\${escHtml(e.alertType)}</td>
          <td class="time-cell">\${timeStr}</td>
        </tr>\`;
      }).join('');
    } catch (err) {
      console.warn('SMS log refresh error:', err);
    }
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Countdown ticker ──
  let nextRefresh = 3;
  function tick() {
    document.getElementById('ticker').textContent = 'refresh in ' + nextRefresh + 's';
    if (--nextRefresh < 0) {
      nextRefresh = 3;
      refreshSmsLog();
    }
  }
  refreshSmsLog();
  setInterval(tick, 1000);

  // ── Simulate ──
  async function simulate() {
    const zip = document.getElementById('sim-zip').value.trim();
    const btn = document.getElementById('sim-btn');
    const status = document.getElementById('sim-status');

    if (!/^\\d{5}$/.test(zip)) {
      status.className = 'error';
      status.textContent = 'Enter a valid 5-digit ZIP code.';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Dispatching…';
    status.className = 'info';
    status.textContent = 'Translating alert via Ollama and dispatching…';

    try {
      const res = await fetch('/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip }),
      });
      const data = await res.json();
      status.className = data.ok ? '' : 'error';
      status.textContent = data.message;
      if (data.ok) {
        nextRefresh = 0; // trigger immediate refresh
      }
    } catch (err) {
      status.className = 'error';
      status.textContent = 'Request failed: ' + err;
    } finally {
      btn.disabled = false;
      btn.textContent = '⚡ Send Test Alert';
    }
  }

  // submit on Enter in ZIP field
  document.getElementById('sim-zip').addEventListener('keydown', e => {
    if (e.key === 'Enter') simulate();
  });
</script>
</body>
</html>`;
}
