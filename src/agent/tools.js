export const TOOL_DEFINITIONS = [
  {
    name: 'navigate',
    description: 'Navigate the browser to a URL and wait for the page to load.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
  {
    name: 'get_html',
    description: 'Get the HTML of the current page or a specific element. Use this to understand page structure and find CSS selectors.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for a specific element. Omit for full page.' },
      },
    },
  },
  {
    name: 'get_text',
    description: 'Get the visible text of the current page or a specific element.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector. Omit for full page text.' },
      },
    },
  },
  {
    name: 'get_url',
    description: 'Return the current page URL.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'click',
    description: 'Click an element on the page using a CSS selector.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the element to click' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'fill',
    description: 'Clear and fill an input field.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'wait_for',
    description: 'Wait up to 10 seconds for an element to appear on the page.',
    input_schema: {
      type: 'object',
      properties: { selector: { type: 'string' } },
      required: ['selector'],
    },
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot of the current browser window.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'scroll',
    description: 'Scroll the page to the top or bottom.',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['top', 'bottom'], description: 'Scroll to top or bottom of page' },
      },
      required: ['direction'],
    },
  },
  {
    name: 'wait_for_human',
    description: 'Pause and ask the human to complete an action in the browser (e.g. solve a CAPTCHA or log in). The agent will wait 3 minutes.',
    input_schema: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
    },
  },
  {
    name: 'item_added',
    description: 'Signal that the current grocery item was successfully added to the cart.',
    input_schema: {
      type: 'object',
      properties: {
        item_name: { type: 'string' },
        product_name: { type: 'string' },
        quantity: { type: 'number' },
      },
      required: ['item_name', 'product_name', 'quantity'],
    },
  },
  {
    name: 'item_not_found',
    description: 'Signal that a grocery item could not be found after searching.',
    input_schema: {
      type: 'object',
      properties: {
        item_name: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['item_name', 'reason'],
    },
  },
  {
    name: 'checkout_complete',
    description: 'Signal that checkout was completed successfully.',
    input_schema: {
      type: 'object',
      properties: { order_reference: { type: 'string' } },
    },
  },
];

export async function executeTool(name, input, page, results) {
  try {
    switch (name) {
      case 'navigate': {
        await page.goto(input.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        return { success: true };
      }

      case 'get_html': {
        if (input.selector) {
          const html = await page.locator(input.selector).first().innerHTML({ timeout: 5000 });
          return { html: html.slice(0, 6000) };
        }
        const html = await page.content();
        return { html: html.slice(0, 6000) };
      }

      case 'get_text': {
        if (input.selector) {
          const text = await page.locator(input.selector).first().innerText({ timeout: 5000 });
          return { text: text.slice(0, 4000) };
        }
        const text = await page.evaluate(() => document.body.innerText);
        return { text: text.slice(0, 4000) };
      }

      case 'get_url': {
        return { url: page.url() };
      }

      case 'click': {
        await page.locator(input.selector).first().click({ timeout: 10000 });
        return { success: true };
      }

      case 'fill': {
        await page.locator(input.selector).first().fill(input.text, { timeout: 10000 });
        return { success: true };
      }

      case 'wait_for': {
        await page.waitForSelector(input.selector, { timeout: 10000 });
        return { success: true };
      }

      case 'screenshot': {
        const buf = await page.screenshot({ fullPage: false });
        return { _isImage: true, data: buf.toString('base64'), media_type: 'image/png' };
      }

      case 'scroll': {
        await page.evaluate((dir) => {
          window.scrollTo(0, dir === 'bottom' ? document.body.scrollHeight : 0);
        }, input.direction);
        await new Promise(r => setTimeout(r, 500));
        return { success: true };
      }

      case 'wait_for_human': {
        process.stderr.write(`\n  [human needed] ${input.reason}\n  Waiting 3 minutes...\n`);
        await new Promise(resolve => setTimeout(resolve, 180000));
        return { success: true };
      }

      case 'item_added': {
        results.added.push(input);
        return { acknowledged: true };
      }

      case 'item_not_found': {
        results.notFound.push({ name: input.item_name, reason: input.reason });
        return { acknowledged: true };
      }

      case 'checkout_complete': {
        results.orderReference = input.order_reference;
        return { acknowledged: true };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message };
  }
}
