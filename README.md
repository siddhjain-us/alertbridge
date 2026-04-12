# AlertBridge

Emergency alerts from public feeds (NWS CAP), matched to subscribers by location, rewritten into plain language, and “delivered” as **mock SMS** for demos—each user gets the message in **their registered language**.

## What it does

1. **Poller** — Fetches the NWS CAP feed, parses new alerts.
2. **Geo-matcher** — Maps alert FIPS areas to ZIPs, loads users in those ZIPs from SQLite.
3. **AI rewriter** — Calls **Ollama** once per language to produce short SMS-sized text (≤160 chars). If **`LIBRETRANSLATE_URL`** is set, listed languages (default **zh, vi, ko**) translate from a cached **English** SMS via a LibreTranslate-compatible **`POST /translate`** API, then fall back to Ollama and **hardcoded** SMS for zh/vi/ko if needed.
4. **Dispatcher** — Mock delivery: logs to console, records `sent_alerts` for deduplication, keeps an in-memory SMS log for the dashboard. Simulates agent memory keys (`dispatch:*`, `translated:*:*`, `mock_sms:*`).
5. **Registration** — Express webhook for SMS-style registration (ZIP + language).
6. **Dashboard** — Live stats, language breakdown, hazard reference link, subscriber ZIPs, and SMS log at `http://localhost:3000`.

## Requirements

- **Node.js** 18+
- **Ollama** running locally (default `http://localhost:11434`, model `llama3.2` or set `OLLAMA_MODEL`)
- **LibreTranslate** (optional, Python): the npm package named `libretranslate` is only a **client library** (no CLI — `npx libretranslate` will error). Install the [official server](https://docs.libretranslate.com/guides/installation/) with **`pip install libretranslate`**, then in another terminal run **`libretranslate --port 5000`** (first run may download language models). Set `LIBRETRANSLATE_URL` in `.env` as below.

## Setup

```bash
npm install
```

Create `.env` (optional overrides):

```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
DEMO_MODE=true
# Optional: pip install libretranslate && libretranslate --port 5000 (see Requirements), then:
LIBRETRANSLATE_URL=http://localhost:5000
LIBRETRANSLATE_LANGS=zh,vi,ko
# LIBRETRANSLATE_API_KEY=
```

Ensure `db/` exists; SQLite will create `db/alertbridge.db` on first run.

### Data persistence and reset

- **SQLite** (`db/alertbridge.db`, typically gitignored) **persists across app restarts**. Startup only runs `CREATE TABLE IF NOT EXISTS`; it does not delete existing users or `sent_alerts` rows.
- **In-memory state** (mock SMS log shown on the dashboard, rewriter translation cache) is **per process** and clears when you stop and start the app.
- To wipe subscribers, delivery history, and in-process demo state without deleting the file manually, use the dashboard **Clear demo data** button (confirms first) or call **`POST /api/clear-data`** (no body).

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

- Enter ZIP **94102**, choose a **scenario** (flood, hurricane, earthquake, wildfire, tornado, drought, tsunami, landslide, volcanic), then **Send test alert** to run match → translate → mock dispatch for all seeded users.
- The **SMS delivery log** and **subscriber list** refresh every few seconds via `/api/sms-log` and `/api/subscribers`; counters from `/api/stats`.
- **Clear demo data** (header): removes all SQLite users and `sent_alerts`, clears the mock SMS log and translation cache. Use when you want a fresh demo; normal restarts do **not** do this.

## API (local)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Dashboard (HTML) |
| `GET` | `/docs/disasters` | Hazard types reference (`docs/disasters.md` as markdown) |
| `GET` | `/api/sms-log` | JSON array of mock SMS rows (includes `zip` per row) |
| `GET` | `/api/subscribers` | `{ subscribers: [{ zip, language, phoneLast4 }] }` for live table |
| `GET` | `/api/simulate-scenarios` | `{ scenarios: [{ id, label }] }` — ids for `POST /simulate` |
| `GET` | `/api/stats` | User counts + SMS sent count |
| `POST` | `/api/clear-data` | Wipes SQLite `users` and `sent_alerts`, clears mock SMS log + translation cache; returns `{ ok: true, message }` |
| `POST` | `/simulate` | JSON `{ "zip": "94102", "scenario": "flash_flood" }` — full pipeline; `scenario` optional (default `flash_flood`). Valid ids: `flash_flood`, `hurricane`, `earthquake`, `wildfire`, `tornado`, `drought`, `tsunami`, `landslide`, `volcanic` (see [`src/dashboard/simulateScenarios.ts`](src/dashboard/simulateScenarios.ts)) |
| `POST` | `/sms` | Twilio-style registration webhook (body `From`, `Body`) |

## Project layout

```
src/
  poller/       # NWS feed + cron
  matcher/      # FIPS → ZIP, user lookup
  rewriter/     # Ollama + optional LibreTranslate (libretranslate.ts)
  dispatcher/   # Mock SMS + SQLite dedup + memory key simulation
  registration/ # SMS registration FSM
  dashboard/    # Express UI + APIs + simulateScenarios.ts
db/             # SQLite (gitignored)
docs/           # e.g. disasters.md (hazard reference)
index.ts        # Starts all services
```

## Limits & honesty

- **SMS** — Not sent over the carrier; output is logged and shown on the dashboard.
- **Translations** — Ollama quality varies; optional **LibreTranslate** (self-hosted or public, rate limits may apply) improves zh/ko when `LIBRETRANSLATE_URL` is set.
- **Feeds** — Real NWS alerts only when the poller sees *new* IDs; use **Simulate** for predictable demos.

## License

ISC
