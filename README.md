# groceries

A CLI tool that manages a local grocery list and automates ordering from [New World NZ](https://www.newworld.co.nz). It uses Playwright to drive a real Chrome browser through the full ordering flow — search, add to cart, and checkout.

## Requirements

- Node.js 18+
- Google Chrome installed
- macOS (uses Chrome via Playwright's `channel: 'chrome'`)

## Setup

```bash
git clone https://github.com/brynwhyman/groceries.git
cd groceries
npm install
npx playwright install chromium
```

Copy `.env.example` to `.env` and fill in your New World credentials:

```bash
cp .env.example .env
```

```
NEWWORLD_EMAIL=your@email.com
NEWWORLD_PASSWORD=yourpassword
HEADLESS=0
```

Set `HEADLESS=1` to run Chrome without a visible window.

You can also store config persistently (env vars take priority):

```bash
groceries config --email your@email.com --password yourpassword
```

## Usage

```bash
# Manage your list
groceries add "2x milk"
groceries add bananas
groceries add sourdough
groceries list
groceries remove bananas
groceries clear

# Place the order
groceries order
groceries order --dry-run    # preview without ordering
groceries order --headless   # run browser in background

# Other
groceries login              # open browser to log in manually
groceries record             # record a manual session to capture CSS selectors
groceries config             # view current config
```

### Commands

| Command | Description |
|---------|-------------|
| `add <item>` | Add an item to the list. Supports quantities like `"2x milk"` — duplicates merge. |
| `remove <item>` | Remove an item from the list. |
| `list` | Show the current grocery list. |
| `clear` | Clear the entire list. |
| `order` | Run the ordering agent against New World. |
| `login` | Open a browser to log in to New World manually. |
| `record` | Record a manual ordering session to capture stable CSS selectors for updating the automation. |
| `config` | View or set config values (`--email`, `--password`, `--api-key`, `--delivery-address`). |

## How it works

1. You build a grocery list locally (`add`/`remove`/`clear`) — stored at `~/.groceries/list.json`
2. `order` launches Chrome via Playwright with a stealth plugin to avoid bot detection
3. The agent logs into your New World account, searches for each item, and clicks "add to cart"
4. It then walks through checkout: cart review, delivery selection, timeslot, and places the order
5. The order reference is captured and printed when complete

The ordering flow is defined as deterministic step sequences in `src/agent/flow.js`. If New World changes their site, use `groceries record` to capture updated selectors and edit `flow.js` accordingly.

## Project structure

```
src/
  cli.js              # Entry point — all CLI commands
  config.js           # Config from env vars + ~/.groceries/config.json
  list.js             # Grocery list persistence + quantity merging
  record.js           # Interactive DOM recorder for capturing selectors
  agent/
    index.js          # Ordering agent — login, add-to-cart, checkout
    flow.js           # Step sequences (edit when the site changes)
    browser.js        # Playwright browser context management
    tools.js          # Tool definitions (legacy, not currently used)
  utils/
    format.js         # Terminal output formatting
```

## License

ISC
