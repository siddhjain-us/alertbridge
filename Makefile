.PHONY: help install setup run start seed

.DEFAULT_GOAL := help

help:
	@echo "AlertBridge — common commands"
	@echo ""
	@echo "  make setup   npm install + ensure db/ exists"
	@echo "  make install npm install only"
	@echo "  make run     start the app (npx tsx index.ts)"
	@echo "  make start   same as make run"
	@echo "  make seed    seed demo users (ZIP 94102)"
	@echo ""
	@echo "Requires: Node 18+, Ollama (see README). On Windows use Git Bash or WSL if make is unavailable."

install:
	npm install

setup: install
	mkdir -p db

run:
	npx tsx index.ts

start: run

seed:
	npm run seed:demo
