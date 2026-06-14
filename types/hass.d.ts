/**
 * Home Assistant type re-exports.
 *
 * We don't redefine HA's `HomeAssistant`, `HassEntity`, etc. here — we re-export
 * the canonical versions from the community-maintained `custom-card-helpers`
 * package (which in turn pulls from `home-assistant-js-websocket`, the same
 * source the official HA frontend uses).
 *
 * Why:
 *   - Single source of truth: when HA's frontend renames or restructures a
 *     field, our types follow automatically on the next `npm install`.
 *   - No drift between this integration and HA's actual runtime shape.
 *   - Types are erased at compile time, so adding this devDep adds zero
 *     runtime cost to the panel/card shipped to users.
 *
 * This is a `.d.ts` (not `.ts`) on purpose: it contains only `export type`
 * declarations, so there's no runtime emit, and import resolution stays
 * clean (consumers `import type { HomeAssistant } from ".../types/hass.js"`
 * and tsc finds this file without producing a stray `hass.js` artifact).
 *
 * For our own websocket payload shapes (Expense, Summary, ConfigResponse,
 * Settlement, BudgetProgress, etc.) see `./expense-tracker.ts`.
 */

export type {
  HomeAssistant,
  // Card-specific: HA's custom-card convention, useful if we ever subclass.
  LovelaceCard,
  LovelaceCardConfig,
  // Useful to reach for when typing fixtures/tests.
  FrontendLocaleData,
  Theme,
  Themes,
  Panel,
  Panels,
  CurrentUser,
  Resources,
  LocalizeFunc,
} from "custom-card-helpers";

// `Hass*` types come from the websocket package, which is what the official
// HA frontend itself imports them from. We re-export them here so consumers
// only need to import from this one file.
export type {
  HassEntity,
  HassConfig,
  HassServiceTarget,
  HassServices,
  Connection,
  MessageBase,
  HassEvent,
  Context,
} from "home-assistant-js-websocket";

// Panel-specific types (from the official HA frontend repo, not packaged in
// any npm module). Copied verbatim from
// https://github.com/home-assistant/frontend/blob/dev/src/types.ts
// Re-sync by hand when bumping the integration against a new HA version.
export interface PanelInfo<T = Record<string, unknown> | null> {
  component_name: string;
  config: T;
  icon: string | null;
  title: string | null;
  url_path: string;
  config_panel_domain?: string;
  default_visible?: boolean;
  require_admin?: boolean;
  show_in_sidebar?: boolean;
}

export interface Route {
  prefix: string;
  path: string;
}

// Custom-element declarations used in the panel/card templates.
declare global {
  interface HTMLElementTagNameMap {
    "ha-card": HTMLElement & { header?: string };
    "ha-icon": HTMLElement & { icon?: string };
    "ha-panel-lovelace": HTMLElement;
    "hui-view": HTMLElement;
  }
}
