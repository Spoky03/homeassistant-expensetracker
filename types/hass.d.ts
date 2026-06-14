/**
 * Ambient type declarations for the Home Assistant APIs the expense tracker
 * frontend uses. This is intentionally minimal — we only describe what the
 * panel and card actually call, so we don't drift from HA's real surface
 * and pull in a heavyweight type package.
 */

export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
  context?: { id: string; user_id?: string; parent_id?: string };
}

export interface HassUser {
  id: string;
  name: string;
  is_admin?: boolean;
  is_owner?: boolean;
}

export interface HassLocale {
  language: string;
  // Many more fields exist; we only need language.
  [key: string]: unknown;
}

/**
 * Subset of the `hass` global that the panel and card touch.
 * The full HA type is much larger; extending it is fine when the real one
 * becomes importable.
 */
export interface Hass {
  connection: {
    sendMessagePromise<T = unknown>(message: object): Promise<T>;
  };
  callWS<T = unknown>(message: object): Promise<T>;
  callService(
    domain: string,
    service: string,
    data?: Record<string, unknown>
  ): Promise<void>;
  states: Record<string, HassEntity | undefined>;
  locale?: HassLocale;
  language?: string;
  user?: HassUser;
  config?: {
    currency?: string;
  };
  panels?: Record<string, unknown>;
}

// ─── Websocket payloads (frontend view) ───────────────────────────────

export interface Expense {
  id: string;
  user_id?: string;
  user_name?: string;
  amount: number;
  currency?: string;
  category: string;
  description?: string;
  date: string;
  created_at?: string;
  is_shared: boolean;
  tags?: string[];
}

export interface ExpenseListResponse {
  expenses: Expense[];
}

export interface CategoryListResponse {
  categories: string[];
}

export interface BudgetsResponse {
  budgets: Record<string, number>;
}

export interface BudgetProgress {
  spent: number;
  budget: number;
  remaining: number;
  percentage: number;
}

export interface Settlement {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

export interface Summary {
  total: number;
  expense_count: number;
  top_category: string | null;
  by_category: Record<string, number>;
  by_user: Record<string, { name: string; total: number; count: number }>;
  balances: Record<string, number>;
  settlements: Settlement[];
  budgets: Record<string, BudgetProgress>;
  currency?: string;
}

export interface ConfigResponse {
  user_id: string;
  user_name: string;
  currency: string;
  currency_symbol: string;
}

// ─── Custom element declarations ──────────────────────────────────────
//
// These tell TypeScript that <ha-card>, <ha-icon>, etc. exist as DOM
// elements with the given attribute/property API.

declare global {
  interface HTMLElementTagNameMap {
    "ha-card": HTMLElement & { header?: string };
    "ha-icon": HTMLElement & { icon?: string };
  }
}

// Minimal LitElement surface used by shared/lit.ts when HA doesn't expose
// one. The full type is in `lit`; we declare it locally so we don't add a
// runtime dependency on @lit/reactive-element.
export interface LitLikeElement {
  new (...args: any[]): HTMLElement;
  // Static side
  readonly properties?: Record<string, unknown>;
  readonly styles?: unknown;
}

export {};
