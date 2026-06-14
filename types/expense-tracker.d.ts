/**
 * Websocket payload types for the expense_tracker custom integration's
 * frontend.
 *
 * These are *our* API contract with the Python backend
 * (`custom_components/expense_tracker/websocket_api.py`). They live next to
 * the frontend code that consumes them, not in `hass.d.ts` — that file is
 * for Home Assistant's surface area, ours belongs here.
 *
 * If the backend's response shape changes, change it here and tsc will
 * surface every call-site that needs to be updated.
 *
 * This is a `.d.ts` because it contains only type declarations, so there's
 * no runtime emit and no stray `.js` artifact produced by `tsc`.
 */

/** A single expense record as returned by `expense_tracker/expenses/list` etc. */
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

/** Response shape for `expense_tracker/expenses/list`. */
export interface ExpenseListResponse {
  expenses: Expense[];
}

/** Response shape for `expense_tracker/categories/list`. */
export interface CategoryListResponse {
  categories: string[];
}

/** Per-category budget values as stored by the backend. */
export interface BudgetEntry {
  spent: number;
  budget: number;
  remaining: number;
  percentage: number;
}

/** Response shape for `expense_tracker/budgets/get`. */
export interface BudgetsResponse {
  budgets: Record<string, BudgetEntry>;
}

/** A "X owes Y" record returned as part of the summary. */
export interface Settlement {
  from_id: string;
  from_name: string;
  to_id: string;
  to_name: string;
  amount: number;
}

/** Per-user spending aggregate. */
export interface UserSpendings {
  name: string;
  total: number;
  count: number;
}

/** Response shape for `expense_tracker/summary`. */
export interface Summary {
  total: number;
  expense_count: number;
  top_category: string | null;
  by_category: Record<string, number>;
  by_user: Record<string, UserSpendings>;
  balances: Record<string, number>;
  settlements: Settlement[];
  budgets: Record<string, BudgetEntry>;
  currency?: string;
}

/** Response shape for `expense_tracker/config`. */
export interface ConfigResponse {
  user_id: string;
  user_name: string;
  currency: string;
  currency_symbol: string;
}

/** The keyed budgets map used by the budget-edit form (raw numbers, not BudgetEntry). */
export type Budgets = Record<string, number>;
