#!/usr/bin/env bash
# Smoke test: do the emitted frontend .js files load in Node?
# Uses `node --input-type=module` so the .js files are treated as ESM
# regardless of the parent package.json's "type" field.
set -euo pipefail
cd "$(dirname "$0")/.."

node --input-type=module -e "
// Stub customElements so the bootstrap in shared/lit.js picks the HA branch.
// In a real browser, customElements.get('ha-panel-lovelace') returns the
// constructor function. The bootstrap then does
//   rawLit = Object.getPrototypeOf(constructor)
// and checks rawLit.prototype.html/css.
class FakeHTMLElement {}
FakeHTMLElement.prototype.html = function () {};
FakeHTMLElement.prototype.css = function () {};
class FakeLovelacePanel extends FakeHTMLElement {}
globalThis.customElements = {
  get: (name) => (name === 'ha-panel-lovelace' ? FakeLovelacePanel : undefined),
  define: () => {},
  whenDefined: async () => undefined,
};
globalThis.HTMLElement = FakeHTMLElement;
globalThis.window = globalThis;
globalThis.customCards = [];

const panelUrl = new URL('./custom_components/expense_tracker/frontend/expense-tracker-panel.js', import.meta.url);
const cardUrl = new URL('./custom_components/expense_tracker/frontend/expense-tracker-card.js', import.meta.url);

try {
  const panel = await import(panelUrl.href);
  console.log('panel exports:', Object.keys(panel).join(', '));
  const card = await import(cardUrl.href);
  console.log('card exports:', Object.keys(card).join(', '));
  console.log('smoke OK');
} catch (e) {
  console.error('smoke FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
}
"
