import chalk from 'chalk';

export function printItems(items) {
  if (items.length === 0) {
    console.log(chalk.dim('  (list is empty)'));
    return;
  }
  const nameWidth = Math.max(...items.map(i => i.name.length), 4);
  console.log(chalk.bold(`\n  ${'Item'.padEnd(nameWidth)}  Qty`));
  console.log(chalk.dim(`  ${'─'.repeat(nameWidth)}  ───`));
  for (const item of items) {
    console.log(`  ${item.name.padEnd(nameWidth)}  ${item.quantity}`);
  }
  console.log();
}

export function printOrderResult(result) {
  console.log();
  if (result.added.length > 0) {
    console.log(chalk.green.bold(`Added to cart (${result.added.length} item${result.added.length !== 1 ? 's' : ''}):`));
    for (const item of result.added) {
      console.log(`  ${chalk.green('✓')} ${item.item_name.padEnd(20)} → ${item.product_name} (x${item.quantity})`);
    }
  }
  if (result.notFound.length > 0) {
    console.log();
    console.log(chalk.yellow.bold(`Not found (${result.notFound.length} item${result.notFound.length !== 1 ? 's' : ''}):`));
    for (const item of result.notFound) {
      console.log(`  ${chalk.yellow('✗')} ${item.name.padEnd(20)} — ${item.reason}`);
    }
  }
  if (result.orderReference) {
    console.log();
    console.log(chalk.bold('Order reference: ') + result.orderReference);
  }
  console.log();
}

export function printError(msg) {
  console.error(chalk.red('Error: ') + msg);
}
