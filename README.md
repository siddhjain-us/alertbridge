# AlertBridge

A multi-agent emergency alert distribution system that ingests real-time NWS feeds, geo-matches alerts to subscribers by county, rewrites them into plain-language messages using an LLM, and delivers them via Twilio WhatsApp across 6 languages.

**[Live Demo →](https://alertbridge-fzml.onrender.com)** &nbsp;|&nbsp; Deployed on Render &nbsp;|&nbsp; Built in 24 hours at a hackathon

---

## Highlights

| Category | What's here |
|---|---|
| **Version control** | GitHub — full commit history, feature branches |
| **Containerization** | Docker multi-stage build + Docker Compose for local dev |
| **CI/CD** | Render auto-deploys on every push to `main` — zero-downtime redeploys |
| **Cloud deployment** | Render (persistent Node.js server, live at the URL above) |
| **AI integration** | OpenRouter / Claude API — LLM rewrites raw NWS alert text into plain-language SMS per language |
| **Messaging API** | Twilio WhatsApp Sandbox — real message delivery, no carrier approval needed |
| **Multilingual** | 6 languages: English, Spanish, Chinese, Vietnamese, Tagalog, Korean |

---

## What It Does

1. **Polls the NWS GeoJSON API** every 60 seconds for live emergency alerts (floods, hurricanes, wildfires, tornadoes, etc.)
2. **Geo-matches by county** — extracts FIPS codes from NWS geocode fields, maps them to ZIP codes via a 3,142-county crosswalk
3. **Rewrites with an LLM** — sends raw NWS alert text to OpenRouter (or Claude) and gets back a plain-language message, per-language, per-alert
4. **Delivers via Twilio WhatsApp** — fans out to all registered subscribers in affected ZIPs; SQL-enforced deduplication prevents duplicates across restarts

---

## Architecture

<img width="1141" height="593" alt="image" src="https://github.com/user-attachments/assets/ae0e2554-f51c-4141-905c-6f62db1d2e8e" />


**6-agent pipeline (single Node.js process, phase-ordered):**

| Agent | Role |
|---|---|
| `alert-poller` | Fetches NWS GeoJSON; deduplicates by alert ID |
| `geo-matcher` | FIPS→ZIP crosswalk lookup; queries SQLite for subscribers |
| `ai-rewriter` | Calls LLM to produce plain-language alert text; caches per (alertId, language) |
| `sms-dispatcher` | Fans out to subscribers; dedupes via `sent_alerts` table |
| `registration-handler` | Twilio WhatsApp webhook — 3-step state machine (ZIP → language → confirm) |
| `dashboard` | Live observability UI with real-time SMS log, stats, simulation trigger |

---

## LLM Integration

The `ai-rewriter` agent translates raw NWS alert text into plain language for each subscriber's language. The LLM backends are priority-ordered with automatic fallback:

```
ANTHROPIC_API_KEY set?  →  Claude (claude-haiku-4-5-20251001)
OPENROUTER_API_KEY set? →  OpenRouter (configurable model, default: openrouter/owl-alpha)
OLLAMA_URL set?         →  Ollama (local dev, llama3.2)
None set?               →  Raw NWS text passthrough (truncated)
```

- Translations are **cached per (alertId, language)** — each alert is only translated once per language regardless of how many subscribers share that language
- For zh/vi/ko, a **retry chain with hardcoded fallbacks** ensures a valid message is always delivered even if the LLM returns English
- The OpenRouter integration uses the OpenAI-compatible REST API with plain `fetch` — no extra SDK dependency

---

## Twilio WhatsApp Sandbox

AlertBridge uses the **Twilio WhatsApp Sandbox** (+1 415 523 8886) rather than a verified toll-free number. This means:
- No carrier approval process required
- Works immediately for opted-in testers
- Real WhatsApp message delivery (not simulated)

**To test as a subscriber:**
1. Open WhatsApp → send `join <sandbox-keyword>` to **+1 415 523 8886** (keyword in [Twilio console](https://console.twilio.com) → Messaging → Try it out → Send a WhatsApp message)
2. Text any message to opt into registration
3. Bot replies asking for your 5-digit ZIP code
4. Reply with a number 1–6 to choose your language
5. You're registered — text `STOP` anytime to unsubscribe

The registration state machine is backed by SQLite so **registrations survive server restarts**.
<img width="576" height="900" alt="image" src="https://github.com/user-attachments/assets/9b8eb034-6bc0-45ab-bfa3-d6df74646d38" />


---

## Supported Languages

| Code | Language | Confirmation message |
|---|---|---|
| `1` | English | "You're registered! You'll get emergency alerts for ZIP…" |
| `2` | Spanish / Español | "¡Registrado! Recibirás alertas de emergencia para…" |
| `3` | Chinese / 中文 | "注册成功！您将收到…地区的中文紧急警报。" |
| `4` | Vietnamese / Tiếng Việt | "Đã đăng ký! Bạn sẽ nhận cảnh báo khẩn cấp cho…" |
| `5` | Tagalog / Filipino | "Nakarehistro na! Makakatanggap ka ng mga alerto para sa…" |
| `6` | Korean / 한국어 | "등록되었습니다! …지역의 한국어 긴급 경보를 받게 됩니다." |

---

## Dashboard Preview
<img width="571" height="661" alt="image" src="https://github.com/user-attachments/assets/68b9871e-fa6f-47f6-8d4c-fa49cb60f5ed" />


## Architectural Trade-offs

| Decision | Choice | Rejected alternative | Why |
|---|---|---|---|
| **Alert source** | NWS GeoJSON API (polled) | Webhooks / third-party alert services | Official real-time data; no auth; polling simpler than managing webhook infra |
| **Geo-routing** | FIPS→ZIP static crosswalk | Geocoding API per alert | NWS uses FIPS natively; ZIP is what users know; static crosswalk = zero latency, zero cost per lookup |
| **LLM backend** | OpenRouter free tier (cloud) + Ollama (local) | Fixed templates, rule-based translation | LLM handles nuanced emergency language and multi-language output better than any rules engine |
| **SMS transport** | Twilio WhatsApp Sandbox | Toll-free SMS, short code | Toll-free verification blocked for individuals; WhatsApp Sandbox delivers real messages to opted-in users with zero setup friction |
| **Storage** | SQLite (`better-sqlite3`) | PostgreSQL, Redis | ACID `INSERT OR IGNORE` enforces dedup at the DB layer; no infra overhead; survives restarts |
| **Dedup strategy** | `UNIQUE(phone, alert_id)` in `sent_alerts` | In-memory Set | DB-level constraint survives restarts and is immune to application-level bugs |
| **Concurrency** | 5-user batch limit | Unlimited `Promise.all` | Respects Twilio rate limits; `Promise.all` within each batch for parallelism |
| **Deployment** | Render (persistent server) | Vercel, AWS Lambda | Vercel is stateless/serverless — incompatible with a persistent cron loop and SQLite filesystem |
| **Containerization** | Docker multi-stage build | Direct `npm start` on bare metal | Reproducible builds; isolates Node version; enables local dev parity with production |

---

## CI/CD Pipeline

Every `git push` to `main` triggers an automatic Render redeploy:

```
git push origin main
       ↓
Render detects new commit
       ↓
npm install → npm start
       ↓
Zero-downtime swap (old instance kept alive until health check passes)
```

No manual deploy steps after initial setup.

---

## Docker

```bash
# Build and run locally
docker compose up --build

# Or build the image directly
docker build -t alertbridge .
docker run -p 3000:3000 --env-file .env alertbridge
```

The `db/` directory is mounted as a volume in Docker Compose so the SQLite database persists across container restarts.

---

## Local Setup

**Prerequisites:** Node.js 20+, a Twilio account, an OpenRouter or Anthropic API key

```bash
git clone https://github.com/siddhjain-us/alertbridge.git
cd alertbridge
npm install
cp .env.example .env   # fill in your keys
mkdir -p db
npm start
```

Open **http://localhost:3000** — use the Simulate panel to trigger a full alert pipeline without waiting for a real NWS event.

**Seed demo subscribers** (6 users in ZIP 94102, one per language):

```bash
npm run seed:demo
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | For real WhatsApp | From console.twilio.com |
| `TWILIO_AUTH_TOKEN` | For real WhatsApp | From console.twilio.com |
| `TWILIO_PHONE_NUMBER` | For real WhatsApp | WhatsApp Sandbox number: `+14155238886` |
| `ANTHROPIC_API_KEY` | LLM translation (option 1) | From console.anthropic.com |
| `OPENROUTER_API_KEY` | LLM translation (option 2) | From openrouter.ai — free tier available |
| `OPENROUTER_MODEL` | Optional | Default: `openrouter/owl-alpha` |
| `OLLAMA_URL` | Local dev fallback | Default: `http://localhost:11434` |

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Live dashboard (HTML) |
| `GET` | `/api/stats` | User counts + SMS sent |
| `GET` | `/api/sms-log` | JSON array of delivered messages |
| `GET` | `/api/subscribers` | Registered users (ZIP, language, masked phone) |
| `GET` | `/api/simulate-scenarios` | Available scenario IDs |
| `POST` | `/simulate` | Trigger full pipeline: `{ "zip": "94102", "scenario": "flash_flood" }` |
| `POST` | `/sms` | Twilio WhatsApp webhook for registration |
| `DELETE` | `/api/users/:phone` | Admin deregister a user by phone |
| `POST` | `/api/clear-data` | Reset all demo data |

Valid scenario IDs: `flash_flood`, `hurricane`, `earthquake`, `wildfire`, `tornado`, `drought`, `tsunami`, `landslide`, `volcanic`

---

## Scale

- FIPS crosswalk: **3,142 US counties**, **~40,000 ZIP codes**
- Languages: **6** (EN, ES, ZH, VI, TL, KO)
- Simulation scenarios: **9**
- Alert deduplication: SQL-enforced, persists across restarts

---

## License

ISC
