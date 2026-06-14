/**
 * LitElement bootstrap shared by the panel and card.
 *
 * Reuses the LitElement that Home Assistant's frontend already exports (so we
 * don't double-load it). Falls back to a CDN import if the running HA build
 * doesn't expose it (e.g. when loaded outside the HA iframe).
 *
 * The runtime types of `html` and `css` are intentionally narrow; we just
 * need them to round-trip through `LitElement`'s render pipeline.
 */
// ─── Bootstrap ────────────────────────────────────────────────────────
const customEls = globalThis.customElements ??
    {
        get: () => undefined,
        define: () => undefined,
    };
const haLovelace = customEls.get("ha-panel-lovelace") ?? customEls.get("hui-view");
const rawLit = haLovelace ? Object.getPrototypeOf(haLovelace) : null;
let LitElement;
let html;
let css;
if (rawLit &&
    rawLit.prototype?.html &&
    rawLit.prototype?.css) {
    // HA's own LitElement: html/css live on the class's prototype as
    // static-style methods.
    const lit = rawLit;
    LitElement = lit;
    html = lit.prototype.html;
    css = lit.prototype.css;
}
else {
    // Fallback for non-HA contexts (unit tests, dev outside the iframe).
    // The dynamic specifier is intentional.
    const spec = "https://unpkg.com/lit@3/index.js?module";
    const lit = (await import(/* @vite-ignore */ spec));
    LitElement = lit.LitElement;
    html = lit.html;
    css = lit.css;
}
export { LitElement, html, css };
