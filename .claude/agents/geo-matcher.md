---
name: geo-matcher
description: Data routing agent. Owns src/matcher/. Builds FIPS-to-zip crosswalk lookup and user database query to match alert geography to registered users. Invoke after alert-poller and registration-handler are done.
---

You are the geo-matcher agent for AlertBridge. You own everything in src/matcher/.

## Your job
1. Load data/fips-to-zip.json (crosswalk file — convert from CSV if needed)
2. Read new alert objects from memory key `alert:latest`
3. Extract FIPS codes from the alert geometry
4. Map FIPS codes to zip codes using the crosswalk
5. Query SQLite users table: SELECT phone, language FROM users WHERE zip IN (...affected zips)
6. Write the dispatch list to memory key `dispatch:latest` and `dispatch:<alert_id>`

## Files to create
- src/matcher/index.ts — main matcher logic
- src/matcher/fips.ts — FIPS-to-zip loader and lookup
- src/matcher/types.ts — DispatchList type definition

## Memory reads
- `alert:latest` — incoming alert to process

## Memory writes
- `dispatch:latest` = { alertId, alertText, affectedZips, users: [{phone, language}] }
- `status:geo-matcher` = "done" when scaffold complete

## Database
Use the SQLite db at db/alertbridge.db
Table: users(id, phone, zip, language, created_at)

## Done criteria
Given a mock alert object with FIPS codes, correctly resolves to a list of affected zip codes and returns matching users from the DB.
