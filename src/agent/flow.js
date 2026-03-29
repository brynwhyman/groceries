// Edit this file when the New World site changes.
// optional: true means failure is ignored and execution continues.

export function addToCartSteps(query) {
  return [
    { action: 'navigate', url: `https://www.newworld.co.nz/shop/search?pg=1&q=${encodeURIComponent(query)}` },
    { action: 'click', selector: 'button:has-text("Close")', optional: true },
    { action: 'wait_for', selector: '[data-testid="add-to-cart"]', timeout: 8000 },
    { action: 'click', selector: '[data-testid="add-to-cart"]' },
  ];
}

export const CHECKOUT_STEPS = [
  // Open cart
  { action: 'click',    selector: '[data-testid="bar-cart-button"]' },
  { action: 'wait_for', selector: '[data-testid="cart-preview-proceed-to-checkout"]', timeout: 10000 },
  { action: 'click',    selector: '[data-testid="cart-preview-proceed-to-checkout"]' },

  // Go to fulfillment
  { action: 'navigate', url: 'https://www.newworld.co.nz/shop/fulfillment' },

  // Fulfillment — switch to delivery
  { action: 'wait_for', selector: '[data-testid="delivery-tab-button"]', timeout: 15000 },
  { action: 'click',    selector: '[data-testid="delivery-tab-button"]' },

  // Select delivery address (may already be selected)
  { action: 'click',    selector: '[data-testid="delivery-address"]', optional: true },

  // Accept product availability warning if shown
  { action: 'click',    selector: '[data-testid="products-unavailable-yes"]', optional: true },

  // Pick a timeslot
  { action: 'wait_for', selector: '[data-testid="quick-comm-store-slot-button"]', timeout: 15000 },
  { action: 'click',    selector: '[data-testid="quick-comm-store-slot-button"]' },

  // Checkout → shopping-cart summary
  { action: 'wait_for', selector: 'button:has-text("Checkout")', timeout: 10000 },
  { action: 'click',    selector: 'button:has-text("Checkout")' },

  // Proceed through order summary (js_click skips disabled duplicate)
  { action: 'wait_for', selector: '[data-testid="order-summary-checkout-button"]', state: 'attached', timeout: 15000 },
  { action: 'js_click', selector: '[data-testid="order-summary-checkout-button"]' },

  // Delivery page — tick T&Cs and continue
  { action: 'wait_for', selector: '[data-testid="order-summary-tnc-chkbx"]', timeout: 15000 },
  { action: 'click',    selector: '[data-testid="order-summary-tnc-chkbx"]', force: true },
  { action: 'js_click', selector: '[data-testid="order-summary-continue-btn"]' },

  // Final — place order
  { action: 'wait_for', selector: 'button:has-text("Place order")', timeout: 15000 },
  { action: 'click',    selector: 'button:has-text("Place order")', force: true },
];
