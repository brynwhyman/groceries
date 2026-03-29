import { getPage, closeBrowser } from './agent/browser.js';
import { createInterface } from 'readline';
import chalk from 'chalk';

const TRACKER_SCRIPT = `
  window.__recorded = [];

  function bestSelector(el) {
    const tag = el.tagName.toLowerCase();
    const testId = el.getAttribute('data-testid');
    const ariaLabel = el.getAttribute('aria-label');
    const id = el.id;
    const name = el.getAttribute('name');
    const type = el.getAttribute('type');
    const href = el.getAttribute('href');
    const role = el.getAttribute('role');
    const text = el.innerText?.trim().slice(0, 60);

    return { tag, testId, ariaLabel, id, name, type, href, role, text };
  }

  document.addEventListener('click', e => {
    let el = e.target;
    // Walk up to find a meaningful element (button, a, input, etc.)
    for (let i = 0; i < 5; i++) {
      if (!el || el === document.body) break;
      const tag = el.tagName?.toLowerCase();
      if (['button','a','input','select','label'].includes(tag)) break;
      el = el.parentElement;
    }
    if (!el) return;

    const info = bestSelector(el);
    const entry = { url: window.location.href, ...info };
    window.__recorded.push(entry);
    console.log('[CLICK]', JSON.stringify(entry));
  }, true);

  document.addEventListener('input', e => {
    const el = e.target;
    if (!el || !['input','textarea','select'].includes(el.tagName?.toLowerCase())) return;
    const info = bestSelector(el);
    const entry = { url: window.location.href, event: 'input', value: el.value?.slice(0, 80), ...info };
    window.__recorded.push(entry);
    console.log('[INPUT]', JSON.stringify(entry));
  }, true);
`;

export async function runRecorder(startUrl) {
  const page = await getPage(false);

  await page.goto(startUrl, { waitUntil: 'domcontentloaded' });

  // Inject tracker on every navigation
  await page.addInitScript(TRACKER_SCRIPT);
  // Also inject into current page
  await page.evaluate(TRACKER_SCRIPT);

  const events = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.startsWith('[CLICK]') || text.startsWith('[INPUT]')) {
      try {
        const prefix = text.startsWith('[CLICK]') ? 'click' : 'input';
        const data = JSON.parse(text.slice(8));
        events.push({ action: prefix, ...data });
      } catch {}
    }
  });

  console.log(chalk.bold('\nRecording your clicks. Do the full flow:'));
  console.log(chalk.dim('  1. Search for an item'));
  console.log(chalk.dim('  2. Add it to cart'));
  console.log(chalk.dim('  3. Go through checkout'));
  console.log(chalk.dim('\nPress Enter here when done.\n'));

  const rl = createInterface({ input: process.stdin });
  await new Promise(resolve => rl.once('line', () => { rl.close(); resolve(); }));

  // Also pull from page directly in case console events were missed
  try {
    const pageEvents = await page.evaluate(() => window.__recorded || []);
    for (const e of pageEvents) {
      if (!events.find(x => x.url === e.url && x.text === e.text && x.testId === e.testId)) {
        events.push(e);
      }
    }
  } catch {}

  await closeBrowser();

  return events;
}
