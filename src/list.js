import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir, ensureConfigDir } from './config.js';

const LIST_FILE = () => join(getConfigDir(), 'list.json');

function readList() {
  ensureConfigDir();
  const file = LIST_FILE();
  if (!existsSync(file)) return { items: [] };
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { items: [] };
  }
}

function writeList(data) {
  writeFileSync(LIST_FILE(), JSON.stringify(data, null, 2));
}

// Parse "2 x apples" or "2x apples" or just "apples"
function parseItem(input) {
  const match = input.trim().match(/^(\d+)\s*x\s+(.+)$/i);
  if (match) {
    return { name: match[2].trim().toLowerCase(), quantity: parseInt(match[1], 10) };
  }
  return { name: input.trim().toLowerCase(), quantity: 1 };
}

export function addItem(input) {
  const { name, quantity } = parseItem(input);
  const data = readList();
  const existing = data.items.find(i => i.name === name);
  if (existing) {
    existing.quantity += quantity;
  } else {
    data.items.push({ name, quantity, addedAt: new Date().toISOString() });
  }
  writeList(data);
  return { name, quantity };
}

export function removeItem(name) {
  const normalised = name.trim().toLowerCase();
  const data = readList();
  const before = data.items.length;
  data.items = data.items.filter(i => i.name !== normalised);
  writeList(data);
  return data.items.length < before;
}

export function getItems() {
  return readList().items;
}

export function clearList() {
  writeList({ items: [] });
}
