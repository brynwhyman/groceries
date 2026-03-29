import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.groceries');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfigDir() {
  return CONFIG_DIR;
}

export function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig() {
  ensureConfigDir();

  let fileConfig = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      // ignore malformed config file
    }
  }

  const config = {
    newworld: {
      email: process.env.NEWWORLD_EMAIL || fileConfig.newworld?.email,
      password: process.env.NEWWORLD_PASSWORD || fileConfig.newworld?.password,
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY || fileConfig.claude?.apiKey,
    },
    headless: process.env.HEADLESS === '1',
    deliveryAddress: process.env.DELIVERY_ADDRESS || fileConfig.deliveryAddress,
  };

  return config;
}

export function validateConfig(config) {
  const missing = [];
  if (!config.newworld.email) missing.push('NEWWORLD_EMAIL');
  if (!config.newworld.password) missing.push('NEWWORLD_PASSWORD');
  if (!config.claude.apiKey) missing.push('ANTHROPIC_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required config: ${missing.join(', ')}\n` +
      `Set these as environment variables or in ${CONFIG_FILE}`
    );
  }
}

export function saveConfig(updates) {
  ensureConfigDir();
  let existing = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      existing = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
    } catch {
      // ignore
    }
  }
  const merged = deepMerge(existing, updates);
  writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
