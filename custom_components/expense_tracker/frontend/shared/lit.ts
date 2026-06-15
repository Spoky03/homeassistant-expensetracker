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

// ─── CSS ──────────────────────────────────────────────────────────────
export interface CSSResult {
  readonly cssText: string;
  readonly styleSheet: CSSStyleSheet | null;
  toString(): string;
}

// ─── HTML template results ────────────────────────────────────────────
export interface HTMLTemplateResult {
  _$litType$: unknown;
  values: unknown[];
  strings: TemplateStringsArray;
}

export type TemplateResult = HTMLTemplateResult | unknown;

export type TemplateTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => HTMLTemplateResult;

export type CSSTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => CSSResult;

// ─── LitElement base class ────────────────────────────────────────────
/**
 * The minimal surface that the panel and card actually use.
 * Mirrors the standard Custom Element + LitElement reactive lifecycle.
 */
export interface LitElementInstance extends HTMLElement {
  /** Schedule a re-render. */
  requestUpdate(): Promise<void>;
  /** Resolves when the element has finished its next update. */
  readonly updateComplete: Promise<void>;
  /** Returns the next template to render. */
  render(): unknown;
  /** LitElement reactive lifecycle; called after `render()`. */
  updated(_changedProperties: Map<string, unknown>): void;
  /** Custom Element lifecycle: connected to the DOM. */
  connectedCallback(): void;
  /** Custom Element lifecycle: removed from the DOM. */
  disconnectedCallback(): void;
}

export interface LitElementClass {
  new (...args: any[]): LitElementInstance;
  /** Reactive-property descriptor. Subclass-supplied. */
  readonly properties?: Record<string, unknown>;
  /** Static stylesheet. Subclass-supplied. */
  readonly styles?: CSSResult | CSSResult[] | CSSStyleSheet;
}

// ─── Bootstrap ────────────────────────────────────────────────────────
const customEls: CustomElementRegistry =
  globalThis.customElements ??
  ({
    get: () => undefined,
    define: () => undefined,
  } as unknown as CustomElementRegistry);

const haLovelace =
  customEls.get("ha-panel-lovelace") ?? customEls.get("hui-view");
const rawLit: unknown = haLovelace ? Object.getPrototypeOf(haLovelace) : null;

interface RawLitBase {
  prototype?: { html?: TemplateTag; css?: CSSTag };
}

let LitElement: LitElementClass;
let html: TemplateTag;
let css: CSSTag;

if (
  rawLit &&
  (rawLit as RawLitBase).prototype?.html &&
  (rawLit as RawLitBase).prototype?.css
) {
  // HA's own LitElement: html/css live on the class's prototype as
  // static-style methods.
  const lit = rawLit as unknown as LitElementClass & {
    prototype: { html: TemplateTag; css: CSSTag };
  };
  LitElement = lit;
  html = lit.prototype.html;
  css = lit.prototype.css;
} else {
  // Fallback for non-HA contexts (unit tests, dev outside the iframe).
  // The dynamic specifier is intentional.
  const spec = "https://unpkg.com/lit@3/index.js?module";
  const lit = (await import(/* @vite-ignore */ spec)) as {
    LitElement: LitElementClass;
    html: TemplateTag;
    css: CSSTag;
  };
  LitElement = lit.LitElement;
  html = lit.html;
  css = lit.css;
}

export { LitElement, html, css };
