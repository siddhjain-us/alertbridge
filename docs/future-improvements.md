# Future improvements

Backlog-style ideas for AlertBridge, grouped by area. Prioritize based on whether the next goal is a real pilot (e.g. Twilio), demo stability, or scale.

## Product and delivery

- **Real SMS (Twilio / MessageBird)** behind the same dispatcher interface, with env to choose mock vs live and per-environment safeguards.
- **Inbound registration hardening**: signature validation (Twilio), rate limits, abuse protection, clearer FSM edge cases.
- **Outbound dedup and idempotency**: persist poller “seen” IDs (or use DB) so restarts don’t change behavior; optional replay tooling.

## Data and matching

- **FIPS ↔ ZIP crosswalk**: versioned artifact, refresh script, and tests so matcher stays accurate as boundaries change.
- **Multi-ZIP / polygon awareness** if you outgrow “ZIP centroid” matching.

## AI / rewriting

- **Structured fallbacks**: timeouts, retries, max tokens, and deterministic short templates when Ollama / LibreTranslate is down.
- **Evaluation harness**: golden inputs for a few languages and max length checks for SMS.

## Ops and safety

- **Auth for dashboard and destructive actions** (`/api/clear-data`, `/simulate` in prod): API key, basic auth, or SSO; separate “admin” from public demo.
- **Structured logging** (JSON), **request IDs**, and optional **OpenTelemetry** for traces.
- **Health endpoints** (`/health`, `/ready`) for each long-running concern if you split processes.

## Engineering quality

- **Automated tests**: unit tests for matcher, rewriter prompts, registration FSM; integration test for simulate pipeline with SQLite in temp dir.
- **CI** (GitHub Actions): `npm ci`, typecheck/lint, tests on PR.
- **Containerization**: `Dockerfile` + compose for app + Ollama (or doc-only if Ollama stays host-native).

## UX (dashboard)

- **Severity / type color semantics** (optional) for scan-ability; keyboard shortcuts; **a11y** pass (contrast, table captions, live regions).
- **Pagination or cap** on SMS log for long demos.

## Docs and DX

- **`.env.example`** checked in; **architecture diagram** in README; **runbook** for demo vs production.

## How to use this doc

Pick one primary goal (e.g. “ship a Twilio pilot” vs “demo-proof for judges”) and order items under that goal; ignore or defer the rest until needed.
