/**
 * LitElement bootstrap shared by the panel and card.
 *
 * Reuses the LitElement that Home Assistant's frontend already exports (so we
 * don't double-load it). Falls back to a CDN import if the running HA build
 * doesn't expose it (e.g. when loaded outside the HA iframe).
 */

const haLovelace =
  customElements.get("ha-panel-lovelace") ?? customElements.get("hui-view");
const rawLit = haLovelace ? Object.getPrototypeOf(haLovelace) : null;

let LitElement, html, css;

if (rawLit && rawLit.prototype?.html && rawLit.prototype?.css) {
  LitElement = rawLit;
  html = rawLit.prototype.html;
  css = rawLit.prototype.css;
} else {
  const lit = await import("https://unpkg.com/lit@3/index.js?module");
  LitElement = lit.LitElement;
  html = lit.html;
  css = lit.css;
}

export { LitElement, html, css };
