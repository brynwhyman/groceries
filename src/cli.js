#!/usr/bin/env node
import { program } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { addItem, removeItem, getItems, clearList } from './list.js';
import { loadConfig, validateConfig, saveConfig } from './config.js';
import { printItems, printOrderResult, printError } from './utils/format.js';

program
  .name('groceries')
  .description('Manage your grocery list and order from New World NZ')
  .version('1.0.0');

program
  .command('add <item>')
  .description('Add an item to the list (e.g. "apples" or "2x milk")')
  .action(input => {
    const { name, quantity } = addItem(input);
    console.log(chalk.green('Added:'), `${quantity}x ${name}`);
  });

program
  .command('remove <item>')
  .description('Remove an item from the list')
  .action(name => {
    const removed = removeItem(name);
    if (removed) {
      console.log(chalk.yellow('Removed:'), name);
    } else {
      printError(`"${name}" not found in list`);
    }
  });

program
  .command('list')
  .description('Show the current grocery list')
  .action(() => {
    const items = getItems();
    console.log(chalk.bold('Grocery list:'));
    printItems(items);
  });

program
  .command('clear')
  .description('Clear the entire grocery list')
  .action(() => {
    clearList();
    console.log(chalk.yellow('List cleared.'));
  });

program
  .command('record')
  .description('Record a manual ordering session to capture stable selectors')
  .action(async () => {
    const { runRecorder } = await import('./record.js');
    const events = await runRecorder('https://www.newworld.co.nz');

    console.log('\n' + chalk.bold('Recorded interactions:') + '\n');
    for (const e of events) {
      const sel = e.testId ? `[data-testid="${e.testId}"]`
        : e.ariaLabel ? `[aria-label="${e.ariaLabel}"]`
        : e.id ? `#${e.id}`
        : e.text ? `${e.tag}:has-text("${e.text}")`
        : e.tag;
      const action = (e.action || e.event || e.type || '?');
      const url = new URL(e.url).pathname;
      console.log(chalk.cyan(action.padEnd(6)), chalk.dim(url.slice(0, 30).padEnd(32)), sel);
    }

    console.log('\n' + chalk.dim('Copy these selectors into the agent system prompt.'));
  });

program
  .command('login')
  .description('Open browser to log in to New World and save your session')
  .action(async () => {
    const { getPage, closeBrowser } = await import('./agent/browser.js');
    console.log(chalk.bold('\nOpening New World in browser...'));
    console.log(chalk.dim('Log in to your account, then come back here and press Enter.\n'));
    const page = await getPage(false);
    await page.goto('https://www.newworld.co.nz', { waitUntil: 'domcontentloaded' });
    const rl = createInterface({ input: process.stdin });
    await new Promise(resolve => rl.once('line', () => { rl.close(); resolve(); }));
    await closeBrowser();
    console.log(chalk.green('Session saved. Run: groceries order'));
  });

program
  .command('order')
  .description('Send the grocery list to the New World ordering agent')
  .option('--headless', 'Run browser in headless mode')
  .option('--dry-run', 'Show the list without ordering')
  .action(async opts => {
    const items = getItems();

    if (opts.dryRun) {
      console.log(chalk.bold('Dry run — would order:'));
      printItems(items);
      return;
    }

    if (items.length === 0) {
      printError('Your grocery list is empty. Add items with: groceries add <item>');
      process.exit(1);
    }

    let config;
    try {
      config = loadConfig();
      if (opts.headless) config.headless = true;
      validateConfig(config);
    } catch (err) {
      printError(err.message);
      process.exit(1);
    }

    console.log(chalk.bold(`\nOrdering ${items.length} item${items.length !== 1 ? 's' : ''} from New World...\n`));
    printItems(items);

    try {
      const { runOrderingAgent } = await import('./agent/index.js');
      const result = await runOrderingAgent(items, config);
      printOrderResult(result);
    } catch (err) {
      printError(err.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Set configuration values')
  .option('--email <email>', 'New World account email')
  .option('--password <password>', 'New World account password')
  .option('--api-key <key>', 'Anthropic API key')
  .option('--delivery-address <address>', 'Delivery address for orders')
  .action(opts => {
    const updates = {};
    if (opts.email) updates.newworld = { ...updates.newworld, email: opts.email };
    if (opts.password) updates.newworld = { ...updates.newworld, password: opts.password };
    if (opts.apiKey) updates.claude = { apiKey: opts.apiKey };
    if (opts.deliveryAddress) updates.deliveryAddress = opts.deliveryAddress;

    if (Object.keys(updates).length === 0) {
      const config = loadConfig();
      console.log(chalk.bold('Current config:'));
      console.log(`  New World email: ${config.newworld.email || chalk.dim('(not set)')}`);
      console.log(`  New World password: ${config.newworld.password ? '••••••••' : chalk.dim('(not set)')}`);
      console.log(`  Anthropic API key: ${config.claude.apiKey ? '••••••••' : chalk.dim('(not set)')}`);
      return;
    }

    saveConfig(updates);
    console.log(chalk.green('Config saved.'));
  });

program.parse();
