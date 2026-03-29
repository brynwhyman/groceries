import { createInterface } from 'readline';
import { getPage, closeBrowser, resetProfile } from './browser.js';
import { addToCartSteps, CHECKOUT_STEPS } from './flow.js';

async function runStep(page, step, config) {
  switch (step.action) {
    case 'navigate':
      await page.goto(step.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    case 'click': {
      const el = page.locator(step.selector).first();
      if (step.force) {
        await el.click({ force: true, timeout: step.timeout || 10000 });
      } else {
        await el.scrollIntoViewIfNeeded({ timeout: step.timeout || 10000 });
        await el.click({ timeout: step.timeout || 10000 });
      }
      break;
    }
    case 'fill': {
      const value = step.valueKey ? config[step.valueKey] : step.value;
      if (!value) throw new Error(`No value for fill step (valueKey: ${step.valueKey})`);
      await page.locator(step.selector).first().fill(value, { timeout: 10000 });
      break;
    }
    case 'click_first': {
      let clicked = false;
      for (const selector of step.selectors) {
        try {
          const el = page.locator(selector).first();
          await el.waitFor({ state: 'visible', timeout: 5000 });
          await el.click({ timeout: 5000 });
          clicked = true;
          break;
        } catch {}
      }
      if (!clicked) throw new Error(`click_first: none of [${step.selectors.join(', ')}] were clickable`);
      break;
    }
    case 'press':
      await page.locator(step.selector).first().press(step.key, { timeout: step.timeout || 10000 });
      break;
    case 'wait_for':
      await page.waitForSelector(step.selector, { timeout: step.timeout || 10000, state: step.state || 'visible' });
      break;
    case 'querySelector':
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`querySelector found nothing: ${sel}`);
        el.click();
      }, step.selector);
      break;
    case 'js_click': {
      const rect = await page.evaluate((sel) => {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0 && !el.disabled) {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            const r2 = el.getBoundingClientRect();
            return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
          }
        }
        throw new Error(`js_click: no visible element for "${sel}"`);
      }, step.selector);
      await page.mouse.click(rect.x, rect.y);
      break;
    }
  }
}

async function runSteps(page, steps, config) {
  for (const step of steps) {
    const label = step.selector || step.url || step.valueKey || '';
    console.error(`  [step] ${step.action} ${label.slice(0, 60)}`);
    try {
      await runStep(page, step, config);
      await handleLoginIfNeeded(page, config);
    } catch (err) {
      if (step.optional) {
        console.error(`  [skip] optional step failed: ${err.message.split('\n')[0]}`);
        continue;
      }
      throw err;
    }
  }
}

async function handleLoginIfNeeded(page, config) {
  const url = page.url();
  if (!url.includes('newworld.co.nz')) return;
  if (!url.includes('/my-account') && !url.includes('/login')) return;

  console.error('  [login] session expired, logging in...');
  try {
    await page.locator('[type="email"]').first().fill(config.newworld.email, { timeout: 5000 });
    await page.locator('[type="password"]').first().fill(config.newworld.password, { timeout: 5000 });
    await page.locator('button:has-text("Log in")').first().click({ timeout: 5000 });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (err) {
    console.error('  [login] auto-login failed:', err.message);
    process.stderr.write('  [login needed] Please log in manually, then press Enter...\n');
    const rl = createInterface({ input: process.stdin });
    await new Promise(resolve => rl.once('line', () => { rl.close(); resolve(); }));
  }
}


async function isLoggedIn(page) {
  try {
    return await page.locator('[data-testid="account-dropdown-name"]').isVisible({ timeout: 3000 });
  } catch {
    return false;
  }
}

export async function runOrderingAgent(items, config) {
  if (items.length === 0) {
    throw new Error('Grocery list is empty. Add some items first.');
  }

  resetProfile();
  console.error('  [browser] fresh session');
  const page = await getPage(config.headless ?? false);
  const results = { added: [], notFound: [], orderReference: null };

  try {
    // Step 1: Login
    await page.goto('https://www.newworld.co.nz', { waitUntil: 'domcontentloaded', timeout: 30000 });
    try { await page.locator('button:has-text("Close")').first().click({ timeout: 2000 }); } catch {}

    console.error('  [login] signing in...');
    await page.goto('https://www.newworld.co.nz/shop/my-account', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Dismiss any promotional modal that may block the login form
    try {
      await page.locator('.dy-modal-container').waitFor({ state: 'visible', timeout: 3000 });
      await page.evaluate(() => {
        document.querySelectorAll('.dy-modal-container, .dy-act-overlay, [role="dialog"]').forEach(el => el.remove());
      });
    } catch {}
    await page.locator('[type="email"]').first().fill(config.newworld.email, { timeout: 10000 });
    await page.locator('[type="password"]').first().fill(config.newworld.password, { timeout: 5000 });
    await page.locator('button:has-text("Log in")').first().click({ timeout: 5000 });
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });

    // Clear any leftover cart items from previous runs
    // Step 2: Add items to cart
    for (const item of items) {
      console.error(`  [searching] ${item.name}`);
      try {
        await runSteps(page, addToCartSteps(item.name), config);
        results.added.push({ item_name: item.name, product_name: item.name, quantity: item.quantity });
        console.error(`  [added] ${item.name}`);
      } catch {
        results.notFound.push({ name: item.name, reason: 'Add to cart button not found' });
        console.error(`  [not found] ${item.name}`);
      }
    }

    if (results.added.length === 0) {
      throw new Error('No items were added to cart.');
    }

    // Step 3: Checkout
    console.error('  [checkout] starting...');
    await runSteps(page, CHECKOUT_STEPS, config);

    // Capture order reference from confirmation page
    await page.waitForTimeout(2000);
    const pageText = await page.evaluate(() => document.body.innerText);
    const match = pageText.match(/(?:order\s*(?:reference|number|#)[:\s]*|#)([A-Z0-9-]{4,})/i);
    results.orderReference = match ? match[1] : 'placed (reference not captured)';

  } finally {
    await closeBrowser();
  }

  return results;
}
