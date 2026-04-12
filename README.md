# AlertBridge

Emergency alerts from public feeds (NWS CAP), matched to subscribers by location, rewritten into plain language, and “delivered” as **mock SMS** for demos—each user gets the message in **their registered language**.

## What it does

1. **Poller** — Fetches the NWS CAP feed, parses new alerts.
2. **Geo-matcher** — Maps alert FIPS areas to ZIPs, loads users in those ZIPs from SQLite.
3. **AI rewriter** — Calls **Ollama** once per language to produce short SMS-sized text (≤160 chars).
4. **Dispatcher** — Mock delivery: logs to console, records `sent_alerts` for deduplication, keeps an in-memory SMS log for the dashboard. Simulates agent memory keys (`dispatch:*`, `translated:*:*`, `mock_sms:*`).
5. **Registration** — Express webhook for SMS-style registration (ZIP + language).
6. **Dashboard** — Live stats, language breakdown, and SMS log at `http://localhost:3000`.

## Requirements

- **Node.js** 18+
- **Ollama** running locally (default `http://localhost:11434`, model `llama3.2` or set `OLLAMA_MODEL`)

## Setup

```bash
npm install
```

Create `.env` (optional overrides):

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DEMO_MODE=true
```

Ensure `db/` exists; SQLite will create `db/alertbridge.db` on first run.

## Demo users (multi-language)

Seed six users in ZIP **94102** (one per language: en, es, zh, vi, ko, tl):

```bash
npm run seed:demo
```

## Run

```bash
npx tsx index.ts
```

Open the dashboard: **http://localhost:3000**

- Enter ZIP **94102** and use **Send test alert** to run match → translate → mock dispatch for all seeded users.
- The **SMS delivery log** updates every few seconds; counters refresh from `/api/stats` and `/api/sms-log`.

## API (local)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Dashboard (HTML) |
| `GET` | `/api/sms-log` | JSON array of mock SMS rows |
| `GET` | `/api/stats` | User counts + SMS sent count |
| `POST` | `/simulate` | JSON `{ "zip": "94102" }` — full pipeline for that ZIP |
| `POST` | `/sms` | Twilio-style registration webhook (body `From`, `Body`) |

## Project layout

```
src/
  poller/       # NWS feed + cron
  matcher/      # FIPS → ZIP, user lookup
  rewriter/     # Ollama translation
  dispatcher/   # Mock SMS + SQLite dedup + memory key simulation
  registration/ # SMS registration FSM
  dashboard/    # Express UI + APIs
db/             # SQLite (gitignored)
index.ts        # Starts all services
```

## Limits & honesty

- **SMS** — Not sent over the carrier; output is logged and shown on the dashboard.
- **Translations** — Quality depends on your Ollama model and prompt; some languages may need tuning.
- **Feeds** — Real NWS alerts only when the poller sees *new* IDs; use **Simulate** for predictable demos.

## License

ISC
