# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Node.js CLI tool that manages a local grocery list and automates ordering from New World NZ (newworld.co.nz) using Playwright to drive a real Chrome browser through deterministic step sequences.

## Running the CLI

```bash
node src/cli.js <command>     # Run directly
groceries <command>           # If installed globally via npm link
```

Commands: `add <item>`, `remove <item>`, `list`, `clear`, `record`, `login`, `config`, `order`

No build, compile, or lint step — plain ES modules run directly with Node.js.

## Environment Setup

Copy `.env.example` to `.env` and populate:
- `NEWWORLD_EMAIL` / `NEWWORLD_PASSWORD` — New World account credentials
- `ANTHROPIC_API_KEY` — loaded and validated but not currently used by the ordering flow
- `HEADLESS` — set to `1` to run Chrome headless
- `DELIVERY_ADDRESS` — delivery address (also configurable via `~/.groceries/config.json`)

Config is also stored persistently at `~/.groceries/config.json`; env vars take priority.

## Architecture

### Data Flow

1. User builds list via `add`/`remove`/`clear` → persisted to `~/.groceries/list.json`
2. `order` command loads the list and invokes the ordering agent
3. Agent logs into New World, searches for each item, clicks "add to cart" via hardcoded step sequences
4. Agent runs checkout steps (delivery selection, timeslot, place order) and captures the order reference

### Key Modules

- **`src/cli.js`** — Entry point; defines 8 commands using `commander`
- **`src/config.js`** — Loads/validates/saves config from env + `~/.groceries/config.json`
- **`src/list.js`** — JSON persistence for grocery items; handles quantity merging (e.g., "2x milk")
- **`src/agent/index.js`** — Deterministic ordering agent; runs step sequences via Playwright, handles login, add-to-cart, and checkout
- **`src/agent/flow.js`** — Defines the step sequences: `addToCartSteps()` (search + add) and `CHECKOUT_STEPS` (cart → delivery → place order). Edit this file when the New World site changes.
- **`src/agent/browser.js`** — Manages Playwright chromium context with stealth plugin; uses a persistent profile at `~/.groceries/browser-profile`
- **`src/agent/tools.js`** — 13 tool definitions + execution logic (legacy; not currently imported by the agent)
- **`src/record.js`** — Interactive recorder that injects a DOM tracker script to capture clicks/inputs and generate stable CSS selectors for updating flow steps
- **`src/utils/format.js`** — Terminal output formatting with `chalk`

### Browser Automation

The agent uses **Playwright** with `playwright-extra` and the stealth plugin to drive a real Chrome browser (`channel: 'chrome'`). It launches a persistent browser context at `~/.groceries/browser-profile` (wiped each run for a clean session).

The ordering flow in `src/agent/index.js` has 3 phases: login → add items to cart → checkout. Each phase runs hardcoded step sequences defined in `src/agent/flow.js`. Steps support actions like `navigate`, `click`, `fill`, `wait_for`, `press`, `js_click`, and `click_first`, with an `optional` flag for steps that may not apply.
