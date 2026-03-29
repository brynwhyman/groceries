import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, rmSync, existsSync } from 'fs';

chromium.use(StealthPlugin());

const PROFILE_DIR = join(homedir(), '.groceries', 'browser-profile');

let context = null;
let page = null;

export function resetProfile() {
  if (existsSync(PROFILE_DIR)) {
    rmSync(PROFILE_DIR, { recursive: true, force: true });
  }
}

export async function getPage(headless = false) {
  if (page && !page.isClosed()) return page;

  if (context) {
    try { await context.close(); } catch {}
  }

  mkdirSync(PROFILE_DIR, { recursive: true });

  // Remove stale lock files left by crashed previous sessions
  for (const lock of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    try { rmSync(join(PROFILE_DIR, lock)); } catch {}
  }

  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome',
    headless,
    viewport: null,
  });

  const existing = context.pages();
  page = existing.length > 0 ? existing[0] : await context.newPage();

  return page;
}

export async function closeBrowser() {
  if (context) {
    try { await context.close(); } catch {}
    context = null;
    page = null;
  }
}
