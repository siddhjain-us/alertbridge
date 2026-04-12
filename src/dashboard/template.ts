export interface DashboardData {
  totalUsers: number;
  languageBreakdown: { language: string; count: number }[];
  totalSmsSent: number;
}

/** Display names — text-only labels (readable without flag emoji reliance) */
const LANG_LABELS: Record<string, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  vi: 'Tiếng Việt',
  tl: 'Tagalog',
  ko: '한국어',
};

function langBar(breakdown: { language: string; count: number }[], total: number): string {
  if (!breakdown.length) {
    return '<p class="lang-empty">No users registered yet. Run <code>npm run seed:demo</code> or register via <code>POST /sms</code>.</p>';
  }
  return breakdown
    .map(({ language, count }) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const label = LANG_LABELS[language] ?? language;
      return `
      <div class="lang-row">
        <span class="lang-name">${label}</span>
        <div class="lang-track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${label} ${pct} percent">
          <div class="lang-fill" style="width:${pct}%"></div>
        </div>
        <span class="lang-pct">${count} <span class="lang-pct-sub">(${pct}%)</span></span>
      </div>`;
    })
    .join('');
}

export function renderDashboard(data: DashboardData): string {
  const { totalUsers, languageBreakdown, totalSmsSent } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="AlertBridge live dashboard — emergency alerts translated per user language.">
  <title>AlertBridge — Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07080a;
      --surface: #0f1114;
      --surface-elevated: #14181c;
      --border: rgba(255,255,255,.08);
      --border-strong: rgba(0,255,136,.22);
      --text: #e8eaed;
      --text-muted: #8b929a;
      --text-dim: #5c656f;
      --accent: #00e689;
      --accent-dim: rgba(0,230,137,.12);
      --accent-glow: rgba(0,230,137,.35);
      --danger: #ff6b6b;
      --radius: 12px;
      --radius-sm: 8px;
      --font: 'DM Sans', system-ui, sans-serif;
      --mono: 'JetBrains Mono', ui-monospace, monospace;
      --z-base: 1;
      --z-sticky: 10;
      --line: 1.55;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    body {
      background: var(--bg);
      background-image:
        radial-gradient(ellipse 120% 80% at 50% -20%, rgba(0,230,137,.08), transparent 50%),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(30,80,120,.12), transparent 45%);
      color: var(--text);
      font-family: var(--font);
      font-size: 16px;
      line-height: var(--line);
      padding: clamp(20px, 4vw, 40px);
      min-height: 100vh;
    }

    a:focus-visible, button:focus-visible, input:focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }

    .shell {
      max-width: 1120px;
      margin: 0 auto;
    }

    .hero {
      margin-bottom: clamp(24px, 4vw, 40px);
    }
    .hero-top {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 12px 20px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fff 0%, var(--accent) 160%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--surface);
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 14px;
      max-width: 42rem;
    }

    /* Bento stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px 24px;
      overflow: hidden;
      z-index: var(--z-base);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(145deg, rgba(255,255,255,.04), transparent 40%);
      pointer-events: none;
    }
    .stat-card.accent-edge {
      border-color: var(--border-strong);
      box-shadow: 0 0 0 1px rgba(0,230,137,.06), 0 24px 48px -24px var(--accent-glow);
    }
    .stat-label {
      color: var(--text-dim);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .14em;
      margin-bottom: 12px;
    }
    .stat-num {
      font-size: clamp(2rem, 5vw, 2.75rem);
      font-weight: 700;
      color: #fff;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .stat-num.accent { color: var(--accent); }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
      margin-bottom: 20px;
    }
    .card-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .card-title {
      color: var(--accent);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .2em;
    }
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent-dim);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 600;
      color: var(--accent);
      letter-spacing: .14em;
      text-transform: uppercase;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0,230,137,.4); }
      50% { opacity: .75; box-shadow: 0 0 0 6px rgba(0,230,137,0); }
    }
    .sms-badge {
      margin-left: auto;
      background: var(--accent-dim);
      color: var(--accent);
      border: 1px solid var(--border-strong);
      border-radius: 999px;
      padding: 4px 14px;
      font-size: 12px;
      font-weight: 600;
    }
    .refresh-ticker {
      font-size: 11px;
      color: var(--text-dim);
      font-family: var(--mono);
    }

    .lang-empty {
      color: var(--text-dim);
      font-size: 14px;
      margin-top: 4px;
    }
    .lang-empty code {
      font-family: var(--mono);
      font-size: 12px;
      background: var(--surface-elevated);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-muted);
    }
    .lang-row {
      display: grid;
      grid-template-columns: minmax(100px, 140px) 1fr minmax(72px, auto);
      align-items: center;
      gap: 12px;
      margin: 12px 0;
    }
    @media (max-width: 520px) {
      .lang-row {
        grid-template-columns: 1fr;
        gap: 6px;
      }
      .lang-pct { text-align: left; }
    }
    .lang-name { font-size: 14px; color: var(--text-muted); }
    .lang-track {
      height: 10px;
      background: var(--surface-elevated);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .lang-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #00c46f);
      border-radius: 6px;
      transition: width 0.35s ease;
    }
    .lang-pct {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .lang-pct-sub { color: var(--text-dim); font-weight: 500; }

    /* Table */
    .sms-log-wrap {
      overflow-x: auto;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    caption {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0,0,0,0);
      white-space: nowrap;
      border: 0;
    }
    th {
      color: var(--text-dim);
      text-align: left;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      background: var(--surface-elevated);
    }
    td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,.04);
      vertical-align: top;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover td { background: rgba(255,255,255,.02); }
    tbody tr.is-new td { background: rgba(0,230,137,.06); }
    tbody tr.is-new:hover td { background: rgba(0,230,137,.09); }

    .entry-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      margin-right: 8px;
      vertical-align: middle;
      animation: pulse 2s ease-in-out infinite;
    }
    .phone-cell { font-family: var(--mono); font-size: 13px; color: var(--text-muted); white-space: nowrap; }
    .lang-cell { color: var(--text); }
    .msg-cell {
      color: var(--text);
      max-width: min(380px, 40vw);
      word-break: break-word;
      line-height: 1.55;
    }
    .type-cell { color: var(--text-dim); font-size: 12px; white-space: nowrap; }
    .time-cell {
      color: var(--text-dim);
      font-size: 12px;
      white-space: nowrap;
      font-family: var(--mono);
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: var(--text-dim);
    }
    .empty-state p { font-size: 15px; margin-bottom: 8px; color: var(--text-muted); }
    .empty-state small { font-size: 13px; }

    /* Simulate */
    .simulate-card {
      border-color: rgba(0,230,137,.15);
      background: linear-gradient(180deg, rgba(0,230,137,.04), var(--surface));
    }
    .simulate-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-width: 200px;
      max-width: 280px;
    }
    .field label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: .02em;
    }
    .sim-input {
      background: var(--bg);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      font-size: 16px;
      font-family: var(--mono);
      width: 100%;
      min-height: 48px;
      transition: border-color .2s, box-shadow .2s;
    }
    .sim-input:hover { border-color: rgba(255,255,255,.15); }
    .sim-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-dim);
      outline: none;
    }
    .sim-input::placeholder { color: var(--text-dim); }
    .sim-btn {
      background: var(--accent);
      color: #041208;
      border: none;
      padding: 0 28px;
      min-height: 48px;
      min-width: 160px;
      border-radius: var(--radius-sm);
      font-size: 15px;
      font-weight: 700;
      font-family: var(--font);
      cursor: pointer;
      letter-spacing: .02em;
      transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
      box-shadow: 0 4px 20px -4px var(--accent-glow);
    }
    .sim-btn:hover { filter: brightness(1.05); }
    .sim-btn:active { transform: translateY(1px); }
    .sim-btn:disabled {
      background: #1e2a22;
      color: var(--text-dim);
      cursor: not-allowed;
      box-shadow: none;
      filter: none;
    }
    #sim-status {
      font-size: 14px;
      margin-top: 16px;
      min-height: 22px;
      color: var(--accent);
    }
    #sim-status.error { color: var(--danger); }
    #sim-status.info { color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="shell">
    <header class="hero">
      <div class="hero-top">
        <h1>AlertBridge</h1>
        <span class="badge-pill" aria-label="Build mode">Mock delivery · v1</span>
      </div>
      <p class="subtitle" id="ts">Emergency alerts translated into each subscriber&apos;s language — live ops view.</p>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Registered users</div>
        <div class="stat-num" id="stat-users">${totalUsers}</div>
      </div>
      <div class="stat-card" role="listitem">
        <div class="stat-label">Languages in use</div>
        <div class="stat-num">${languageBreakdown.length || '—'}</div>
      </div>
      <div class="stat-card accent-edge">
        <div class="stat-label">Mock SMS sent</div>
        <div class="stat-num accent" id="stat-sms">${totalSmsSent}</div>
      </div>
    </div>

    <section class="card" aria-labelledby="lang-heading">
      <div class="card-header">
        <h2 class="card-title" id="lang-heading">Audience by language</h2>
      </div>
      <div id="lang-bars">${langBar(languageBreakdown, totalUsers)}</div>
    </section>

    <section class="card simulate-card" aria-labelledby="sim-heading">
      <div class="card-header">
        <h2 class="card-title" id="sim-heading">Demo: simulate alert</h2>
      </div>
      <div class="simulate-row">
        <div class="field">
          <label for="sim-zip">ZIP code</label>
          <input class="sim-input" id="sim-zip" name="zip" type="text" inputmode="numeric" placeholder="e.g. 94102" maxlength="5" pattern="\\d{5}" autocomplete="postal-code" aria-describedby="sim-status">
        </div>
        <button type="button" class="sim-btn" id="sim-btn" aria-busy="false">Send test alert</button>
      </div>
      <div id="sim-status" role="status" aria-live="polite"></div>
    </section>

    <section class="card" aria-labelledby="log-heading">
      <div class="card-header">
        <h2 class="card-title" id="log-heading">SMS delivery log</h2>
        <span class="live-badge"><span class="pulse-dot" aria-hidden="true"></span>Live</span>
        <span class="sms-badge" id="log-count">0 delivered</span>
        <span class="refresh-ticker" id="ticker" aria-live="off">—</span>
      </div>
      <div class="sms-log-wrap">
        <table>
          <caption>SMS messages sent to subscribers</caption>
          <thead>
            <tr>
              <th scope="col">Phone</th>
              <th scope="col">Language</th>
              <th scope="col">Message</th>
              <th scope="col">Alert type</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody id="sms-tbody">
            <tr><td colspan="5"><div class="empty-state"><p>No messages yet</p><small>Use &quot;Send test alert&quot; after seeding users for that ZIP.</small></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

<script>
  const LANG_LABELS = ${JSON.stringify(LANG_LABELS)};

  document.getElementById('ts').textContent =
    'Emergency alerts translated per language · Updated ' + new Date().toLocaleString();

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

      countEl.textContent = entries.length + ' delivered';
      statSms.textContent = entries.length;

      if (!entries.length) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>No messages yet</p><small>Use &quot;Send test alert&quot; after seeding users for that ZIP.</small></div></td></tr>';
        lastCount = 0;
        return;
      }

      const isNew = entries.length > lastCount;
      lastCount = entries.length;

      tbody.innerHTML = entries.map((e) => {
        const ageMs = now - new Date(e.sentAt).getTime();
        const fresh = ageMs < 8000;
        const timeStr = new Date(e.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const langLabel = LANG_LABELS[e.language] || e.language;
        return \`<tr class="\${fresh ? 'is-new' : ''}">
          <td class="phone-cell">\${fresh ? '<span class="entry-dot" aria-hidden="true"></span>' : ''}<span class="phone-mask" aria-hidden="true">+1···</span>\${e.phone}</td>
          <td class="lang-cell">\${escHtml(langLabel)}</td>
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

  let nextRefresh = 3;
  function tick() {
    document.getElementById('ticker').textContent = 'Next refresh in ' + nextRefresh + 's';
    if (--nextRefresh < 0) {
      nextRefresh = 3;
      refreshSmsLog();
    }
  }
  refreshSmsLog();
  setInterval(tick, 1000);

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
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Dispatching…';
    status.className = 'info';
    status.textContent = 'Translating and dispatching mock SMS…';

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
        nextRefresh = 0;
      }
    } catch (err) {
      status.className = 'error';
      status.textContent = 'Request failed: ' + err;
    } finally {
      btn.disabled = false;
      btn.setAttribute('aria-busy', 'false');
      btn.textContent = 'Send test alert';
    }
  }

  document.getElementById('sim-btn').addEventListener('click', simulate);
  document.getElementById('sim-zip').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') simulate();
  });
</script>
</body>
</html>`;
}
