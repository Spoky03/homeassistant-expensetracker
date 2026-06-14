// Smoke test for the emitted frontend .js files.
// Run with:  node tools/smoke.mjs
//
// We stub customElements.get() so the bootstrap in shared/lit.js picks the
// "HA-provided Lit" branch instead of trying to fetch from unpkg.

class FakeLitElement {}
FakeLitElement.prototype.html = function () {};
FakeLitElement.prototype.css = function () {};
// customElements.get returns the registered class; Object.getPrototypeOf
// of *an instance* gives the class's prototype.
const fakeInstance = Object.create(FakeLitElement.prototype);
globalThis.customElements = {
  get: (name) => (name === "ha-panel-lovelace" ? fakeInstance : undefined),
  define: () => {},
  whenDefined: async () => undefined,
};
// Make Object.getPrototypeOf of the registered class look like LitElement.
const OriginalGetProto = Object.getPrototypeOf;
Object.getPrototypeOf = function (obj) {
  const p = OriginalGetProto.call(this, obj);
  // If we hit the FakeLitElement class, return a class that has the methods.
  if (p === FakeLitElement.prototype) return FakeLitElement;
  return p;
};
// Restore real class prototype chain for normal objects.
class HTMLElementStub {}
globalThis.HTMLElement = HTMLElementStub;

const panelUrl = new URL(
  "../custom_components/expense_tracker/frontend/expense-tracker-panel.js",
  import.meta.url,
);
const cardUrl = new URL(
  "../custom_components/expense_tracker/frontend/expense-tracker-card.js",
  import.meta.url,
);

try {
  const panel = await import(panelUrl.href);
  console.log(
    "✓ panel module loaded; exports:",
    Object.keys(panel).join(", "),
  );
  const card = await import(cardUrl.href);
  console.log(
    "✓ card module loaded; exports:",
    Object.keys(card).join(", "),
  );
  console.log("smoke OK");
} catch (e) {
  console.error("✗ smoke FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
}
