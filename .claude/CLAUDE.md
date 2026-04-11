# AlertBridge

Emergency alert translation system. Monitors NWS/IPAWS feeds and delivers plain-language SMS alerts in the user's native language.

## Stack
- Node.js + Express + TypeScript (tsx for dev)
- SQLite (better-sqlite3)
- Twilio (SMS)
- Anthropic API (claude-sonnet-4-6)
- mcp-memory-keeper (shared agent memory)

## Rules for all agents
- Never modify files owned by another agent without checking memory first
- Write progress updates to memory after completing each major step
- Key naming: use prefixes — `alert:`, `user:`, `task:`, `status:`
- All source files go in src/ under your agent's subfolder
- Never hardcode API keys — use process.env

## Memory conventions
- `status:<agent-name>` — current status of that agent
- `task:<agent-name>:current` — what the agent is working on now
- `alert:latest` — most recent alert object from poller
- `dispatch:latest` — most recent dispatch list from geo-matcher
- `translated:<alert_id>:<lang>` — translated message cache
