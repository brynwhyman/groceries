# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js CLI tool that manages a local grocery list and uses an AI agent (Claude) to automatically order items from New World NZ (newworld.co.nz) by controlling the user's real Chrome browser via AppleScript.

## Running the CLI

```bash
node src/cli.js <command>     # Run directly
groceries <command>           # If installed globally via npm link
```

Commands: `add <item>`, `remove <item>`, `list`, `clear`, `login`, `config`, `order`

No build, compile, or lint step — plain ES modules run directly with Node.js.

## Environment Setup

Copy `.env.example` to `.env` and populate:
- `ANTHROPIC_API_KEY` — required for the ordering agent
- `NEWWORLD_EMAIL` / `NEWWORLD_PASSWORD` — New World account credentials
- `HEADLESS` — browser visibility flag

Config is also stored persistently at `~/.groceries/config.json`; env vars take priority.

## Architecture

### Data Flow

1. User builds list via `add`/`remove`/`clear` → persisted to `~/.groceries/list.json`
2. `order` command loads the list and invokes the agent loop
3. Agent sends messages to Claude (`claude-sonnet-4-6`, 4096 max tokens) with tool use
4. Claude calls browser tools → results returned to Claude → loop until `checkout_complete` or `end_turn`

### Key Modules

- **`src/cli.js`** — Entry point; defines all 7 commands using `commander`
- **`src/config.js`** — Loads/validates/saves config from env + `~/.groceries/config.json`
- **`src/list.js`** — JSON persistence for grocery items; handles quantity merging (e.g., "2x milk")
- **`src/agent/index.js`** — Multi-turn Claude conversation loop; tracks added/not-found items and order reference
- **`src/agent/tools.js`** — 11 tool definitions + execution logic; uses `osascript` to run JavaScript in the user's active Chrome tab
- **`src/utils/format.js`** — Terminal output formatting with `chalk`

### Browser Automation

Tools in `src/agent/tools.js` use **AppleScript via `osascript`** to inject JavaScript into the user's real Google Chrome browser — not a headless browser. This is macOS-only. Tools include navigation, DOM reading, click/fill interactions, screenshot, and flow-control signals (`item_added`, `item_not_found`, `checkout_complete`).

The agent system prompt (in `src/agent/index.js`) defines a 3-phase ordering flow: login → add items to cart → checkout.
