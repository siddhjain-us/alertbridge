# AlertBridge implementation tracker

**Agent instructions:** Work one phase at a time; after each phase, update the change log.

## Phase D — LibreTranslate + live subscribers API

1. [x] [`src/rewriter/libretranslate.ts`](../src/rewriter/libretranslate.ts) — `LIBRETRANSLATE_URL`, optional `API_KEY`, `LIBRETRANSLATE_LANGS` (default `zh,vi,ko`); local server: **`pip install libretranslate`** then **`libretranslate --port 5000`** (not `npx` — npm package has no CLI).
2. [x] [`src/rewriter/index.ts`](../src/rewriter/index.ts) — `rewriteNeedsEnglishFirst` → `translateOne` en once; `useLibreTranslateFor` → `en`→target via API; else Ollama + fallbacks.
3. [x] [`src/dashboard/routes.ts`](../src/dashboard/routes.ts) — `GET /api/subscribers`.
4. [x] [`src/dashboard/template.ts`](../src/dashboard/template.ts) — `tbody#subs-tbody`, `refreshSubscribers()` on load + poll.
5. [x] [`README.md`](../README.md) — document env + `/api/subscribers`.

---

## Prior phases (done)

- A–C: fallbacks, disasters doc, ZIP in dispatch + SMS + SSR subscribers.

## Change log

| Date | Change |
|------|--------|
| (prior) | Phases A–C |
| (this run) | Phase D: LibreTranslate module + rewriter wiring; `/api/subscribers` + client refresh; tracker updated |
