/**
 * Expense Tracker Panel — Home Assistant Custom Panel
 * A premium multi-user expense tracker with dashboard, expense list,
 * budgets, and settings views.
 *
 * Built with LitElement, styled to match HA themes.
 */

import { LitElement, html } from "./shared/lit.js";
import { panelStyles } from "./shared/styles.js";
import {
  getCategoryColor,
  getCategoryIcon,
  isDefaultCategory,
} from "./shared/categories.js";
import {
  formatCurrency,
  getCurrentMonth,
  getMonthName,
  getPreviousMonth,
  getNextMonth,
} from "./shared/format.js";
import { makeT, categoryKey, type TranslationFn, type TranslationKey } from "./shared/i18n.js";
import {
  createNotifier,
  type Notifier,
  type NotificationState,
  type NotificationType,
} from "./shared/notifications.js";
import type { HomeAssistant, PanelInfo } from "../../../types/hass";
import type {
  Expense,
  Summary,
  ConfigResponse,
  Settlement,
  Budgets,
} from "../../../types/expense-tracker";

interface FormData {
  amount: string;
  category: string;
  description: string;
  date: string;
  is_shared: boolean;
}

type ViewName = "dashboard" | "expenses" | "budgets" | "settings";

class ExpenseTrackerPanel extends LitElement {
  static override get properties() {
    return {
      hass: { type: Object },
      narrow: { type: Boolean },
      panel: { type: Object },
      _view: { type: String },
      _config: { type: Object },
      _summary: { type: Object },
      _expenses: { type: Array },
      _categories: { type: Array },
      _budgets: { type: Object },
      _currentMonth: { type: String },
      _loading: { type: Boolean },
      _editingExpense: { type: Object },
      _showAddForm: { type: Boolean },
      _formData: { type: Object },
      _notification: { type: Object },
    };
  }

  hass: HomeAssistant | null = null;
  narrow: boolean = false;
  panel: PanelInfo | null = null;
  private _view: ViewName = "dashboard";
  private _config: Partial<ConfigResponse> = {};
  private _summary: Summary | null = null;
  private _expenses: Expense[] = [];
  private _categories: string[] = [];
  private _budgets: Budgets = {};
  private _currentMonth: string = getCurrentMonth();
  private _loading = true;
  private _editingExpense: Expense | null = null;
  private _showAddForm = false;
  private _formData: FormData = this._defaultFormData();
  private _notification: NotificationState | null = null;
  private _initLoaded = false;
  private _t: TranslationFn = makeT(null);
  private _notifier: Notifier = createNotifier();

  static override get styles() {
    return panelStyles;
  }

  constructor() {
    super();
  }

  private _defaultFormData(): FormData {
    return {
      amount: "",
      category: "Food",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      is_shared: true,
    };
  }

  // Keep the translation function and any hass-bound helpers in sync with
  // the current `hass` object. Called by LitElement on every reactive update.
  override updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    if (changedProperties.has("hass") && this.hass) {
      this._t = makeT(this.hass);
      if (!this._initLoaded) {
        this._initLoaded = true;
        this._loadAll();
      } else {
        const oldHass = changedProperties.get("hass") as
          | HomeAssistant
          | undefined;
        const oldState =
          oldHass?.states?.["sensor.expense_tracker_monthly_total"]?.state;
        const newState =
          this.hass.states?.["sensor.expense_tracker_monthly_total"]?.state;
        if (oldState !== newState && newState !== undefined) {
          this._loadAll();
        }
      }
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._notifier.dispose();
  }

  // ─── Data loading ─────────────────────────────────

  private async _ws<T = unknown>(
    type: string,
    params: Record<string, unknown> = {}
  ): Promise<T | null> {
    if (!this.hass) return null;
    try {
      return (await this.hass.connection.sendMessagePromise({
        type,
        ...params,
      })) as T;
    } catch (e) {
      console.error(`WS call ${type} failed:`, e);
      this._notify("notify_error_server", "error");
      return null;
    }
  }

  private async _loadAll(): Promise<void> {
    this._loading = true;
    await Promise.all([
      this._loadConfig(),
      this._loadSummary(),
      this._loadExpenses(),
      this._loadCategories(),
      this._loadBudgets(),
    ]);
    this._loading = false;
  }

  private async _loadConfig(): Promise<void> {
    const res = await this._ws<ConfigResponse>("expense_tracker/config");
    if (res) this._config = res;
  }

  private async _loadSummary(): Promise<void> {
    const res = await this._ws<Summary>("expense_tracker/summary", {
      month: this._currentMonth,
    });
    if (res) this._summary = res;
  }

  private async _loadExpenses(): Promise<void> {
    const res = await this._ws<{ expenses: Expense[] }>(
      "expense_tracker/expenses/list",
      { month: this._currentMonth }
    );
    if (res) this._expenses = res.expenses || [];
  }

  private async _loadCategories(): Promise<void> {
    const res = await this._ws<{ categories: string[] }>(
      "expense_tracker/categories/list"
    );
    if (res) this._categories = res.categories || [];
  }

  private async _loadBudgets(): Promise<void> {
    const res = await this._ws<{ budgets: Record<string, number> }>(
      "expense_tracker/budgets/get"
    );
    if (res) this._budgets = res.budgets || {};
  }

  // ─── Action handlers ─────────────────────────────

  private async _addExpense(): Promise<void> {
    const { amount, category, description, date, is_shared } = this._formData;
    if (!amount || Number(amount) <= 0) {
      this._notify("notify_invalid_amount", "error");
      return;
    }
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/expenses/add",
      {
        amount: Number(amount),
        category,
        description,
        date,
        is_shared,
      }
    );
    if (res) {
      this._notify("notify_expense_added", "success");
      this._formData = this._defaultFormData();
      this._showAddForm = false;
      await this._loadAll();
    }
  }

  private async _updateExpense(): Promise<void> {
    if (!this._editingExpense) return;
    const { amount, category, description, date, is_shared } = this._formData;
    if (!amount || Number(amount) <= 0) {
      this._notify("notify_invalid_amount", "error");
      return;
    }
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/expenses/update",
      {
        expense_id: this._editingExpense.id,
        amount: Number(amount),
        category,
        description,
        date,
        is_shared,
      }
    );
    if (res) {
      this._notify("notify_expense_updated", "success");
      this._editingExpense = null;
      this._formData = this._defaultFormData();
      await this._loadAll();
    }
  }

  private async _deleteExpense(id: string): Promise<void> {
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/expenses/delete",
      { expense_id: id }
    );
    if (res) {
      this._notify("notify_expense_deleted", "success");
      await this._loadAll();
    }
  }

  private async _saveBudget(category: string, amount: string): Promise<void> {
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/budgets/set",
      { category, amount: Number(amount) }
    );
    if (res) {
      this._notify("notify_budget_saved", "success");
      await Promise.all([this._loadBudgets(), this._loadSummary()]);
    }
  }

  private async _addCategory(name: string): Promise<void> {
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/categories/add",
      { name }
    );
    if (res) {
      this._notify("notify_category_added", "success");
      await this._loadCategories();
    }
  }

  private async _removeCategory(name: string): Promise<void> {
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/categories/remove",
      { name }
    );
    if (res) {
      this._notify("notify_category_removed", "success");
      await this._loadCategories();
    }
  }

  private async _settleDebt(settlement: Settlement): Promise<void> {
    const sym = this._config.currency_symbol ?? "€";
    const confirmed = confirm(
      `${this._t("set_record_prompt")} ${settlement.from_name} ${this._t(
        "set_paid"
      )} ${settlement.to_name} ${sym}${settlement.amount}?`
    );
    if (!confirmed) return;

    this._loading = true;
    const res = await this._ws<{ success?: boolean }>(
      "expense_tracker/expenses/add",
      {
        amount: Number(settlement.amount),
        category: "Settlement",
        description: `Debt settlement to ${settlement.to_name}`,
        is_shared: false,
        user_id: settlement.from_id,
        tags: [`to:${settlement.to_id}`],
      }
    );

    if (res) {
      this._notify("notify_settlement_ok", "success");
      await this._loadAll();
    } else {
      this._notify("notify_settlement_failed", "error");
    }
    this._loading = false;
  }

  // ─── UI helpers ──────────────────────────────────

  private _notify(key: string, type: NotificationType = "info"): void {
    this._notifier.show(
      (v) => {
        this._notification = v;
      },
      key,
      type,
      this._t
    );
  }

  private _startEdit(expense: Expense): void {
    this._editingExpense = expense;
    this._formData = {
      amount: String(expense.amount),
      category: expense.category,
      description: expense.description || "",
      date: expense.date,
      is_shared: expense.is_shared || false,
    };
    this._view = "expenses";
  }

  private _cancelEdit(): void {
    this._editingExpense = null;
    this._formData = this._defaultFormData();
  }

  private async _changeMonth(direction: "prev" | "next"): Promise<void> {
    this._currentMonth =
      direction === "prev"
        ? getPreviousMonth(this._currentMonth)
        : getNextMonth(this._currentMonth);
    await Promise.all([this._loadSummary(), this._loadExpenses()]);
  }

  // Translate a category display name to its localised form.
  private _cat(name: string): string {
    return this._t(categoryKey(name));
  }

  // ─── Rendering ───────────────────────────────────

  override render(): unknown {
    return html`
      <div class="panel-root">
        ${this._renderNav()}
        <main class="panel-content">
          ${this._loading ? this._renderLoader() : this._renderView()}
        </main>
        ${this._notification ? this._renderNotification() : ""}
      </div>
    `;
  }

  private _renderNav(): unknown {
    const navItems: Array<{ id: ViewName; icon: string; key: TranslationKey }> = [
      { id: "dashboard", icon: "mdi:view-dashboard", key: "nav_dashboard" },
      { id: "expenses", icon: "mdi:format-list-bulleted", key: "nav_expenses" },
      { id: "budgets", icon: "mdi:target", key: "nav_budgets" },
      { id: "settings", icon: "mdi:cog", key: "nav_settings" },
    ];
    return html`
      <nav class="panel-nav">
        <div class="nav-header">
          <ha-icon icon="mdi:wallet"></ha-icon>
          <span class="nav-title">${this._t("app_title")}</span>
        </div>
        <div class="nav-items">
          ${navItems.map(
            (item) => html`
              <button
                class="nav-btn ${this._view === item.id ? "active" : ""}"
                @click=${() => {
                  this._view = item.id;
                }}
              >
                <ha-icon icon=${item.icon}></ha-icon>
                <span>${this._t(item.key)}</span>
              </button>
            `
          )}
        </div>
        <button
          class="fab"
          @click=${() => {
            this._showAddForm = true;
            this._editingExpense = null;
            this._formData = this._defaultFormData();
          }}
        >
          <ha-icon icon="mdi:plus"></ha-icon>
          <span>${this._t("action_add_expense")}</span>
        </button>
      </nav>
    `;
  }

  private _renderLoader(): unknown {
    return html`
      <div class="loader">
        <div class="spinner"></div>
        <p>${this._t("loading_expenses")}</p>
      </div>
    `;
  }

  private _renderNotification(): unknown {
    const n = this._notification!;
    return html`
      <div class="notification ${n.type}">
        <ha-icon
          icon=${n.type === "error" ? "mdi:alert-circle" : "mdi:check-circle"}
        ></ha-icon>
        <span>${n.message}</span>
      </div>
    `;
  }

  private _renderView(): unknown {
    if (this._showAddForm || this._editingExpense) {
      return this._renderExpenseForm();
    }
    switch (this._view) {
      case "dashboard":
        return this._renderDashboard();
      case "expenses":
        return this._renderExpenseList();
      case "budgets":
        return this._renderBudgets();
      case "settings":
        return this._renderSettings();
      default:
        return this._renderDashboard();
    }
  }

  // ─── Dashboard View ──────────────────────────────

  private _renderDashboard(): unknown {
    const s = this._summary ?? ({} as Partial<Summary>);
    const sym = this._config.currency_symbol ?? "€";
    const byCategory = s.by_category ?? {};
    const total = s.total ?? 0;
    const categories = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    ) as Array<[string, number]>;

    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>${this._t("nav_dashboard")}</h1>
          <div class="month-nav">
            <button class="icon-btn" @click=${() => this._changeMonth("prev")}>
              <ha-icon icon="mdi:chevron-left"></ha-icon>
            </button>
            <span class="month-label"
              >${getMonthName(
                this._currentMonth,
                this.hass?.locale?.language || this.hass?.language
              )}</span
            >
            <button class="icon-btn" @click=${() => this._changeMonth("next")}>
              <ha-icon icon="mdi:chevron-right"></ha-icon>
            </button>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card total-card">
            <div class="card-icon-wrap gradient-1">
              <ha-icon icon="mdi:cash-multiple"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">${this._t("dash_total_spent")}</span>
              <span class="card-value">${formatCurrency(total, sym)}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-2">
              <ha-icon icon="mdi:receipt-text"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">${this._t("dash_transactions")}</span>
              <span class="card-value">${s.expense_count ?? 0}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-3">
              <ha-icon icon="mdi:trophy"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">${this._t("dash_top_category")}</span>
              <span class="card-value"
                >${s.top_category ? this._cat(s.top_category) : "—"}</span
              >
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-4">
              <ha-icon icon="mdi:calculator-variant"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">${this._t("dash_daily_avg")}</span>
              <span class="card-value"
                >${formatCurrency(
                  (s.expense_count ?? 0) > 0
                    ? total / new Date(Number(this._currentMonth.slice(0, 4)), Number(this._currentMonth.slice(5, 7)), 0).getDate()
                    : 0,
                  sym
                )}</span
              >
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="glass-card chart-card">
            <h2>${this._t("dash_category_breakdown")}</h2>
            ${categories.length > 0
              ? this._renderDonutChart(categories, total, sym)
              : html`<p class="empty-state">
                  ${this._t("dash_no_expenses_month")}
                </p>`}
          </div>

          <div class="glass-card recent-card">
            <h2>${this._t("dash_recent_expenses")}</h2>
            ${this._expenses.length > 0
              ? html`
                  <div class="recent-list">
                    ${this._expenses.slice(0, 8).map(
                      (e) => html`
                        <div class="recent-item" @click=${() => this._startEdit(e)}>
                          <div
                            class="recent-icon"
                            style="background: ${getCategoryColor(e.category)}20; color: ${getCategoryColor(e.category)}"
                          >
                            <ha-icon icon=${getCategoryIcon(e.category)}></ha-icon>
                          </div>
                          <div class="recent-info">
                            <span class="recent-desc"
                              >${e.description || this._cat(e.category)}</span
                            >
                            <span class="recent-meta"
                              >${e.date}${e.is_shared
                                ? ` · ${this._t("form_shared")}`
                                : ""}</span
                            >
                          </div>
                          <span
                            class="recent-amount"
                            style="color: ${getCategoryColor(e.category)}"
                          >
                            -${formatCurrency(e.amount, sym)}
                          </span>
                        </div>
                      `
                    )}
                  </div>
                `
              : html`<p class="empty-state">
                  ${this._t("dash_no_expenses_yet")}
                </p>`}
          </div>
        </div>

        ${this._summary ? this._renderBudgetProgress(sym) : ""}
        ${this._summary ? this._renderUserBreakdown(sym) : ""}
        ${this._summary ? this._renderBalancesAndSettlements(sym) : ""}
      </div>
    `;
  }

  private _renderDonutChart(
    categories: Array<[string, number]>,
    total: number,
    sym: string
  ): unknown {
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const r = 70;
    const strokeWidth = 28;
    const circumference = 2 * Math.PI * r;

    let accumulated = 0;
    const arcs = categories.map(([cat, amount]) => {
      const pct = total > 0 ? amount / total : 0;
      const offset = accumulated;
      accumulated += pct;
      return { cat, amount, pct, offset };
    });

    return html`
      <div class="donut-container">
        <svg viewBox="0 0 ${size} ${size}" class="donut-svg">
          ${arcs.map(
            (arc) => html`
              <circle
                cx="${cx}"
                cy="${cy}"
                r="${r}"
                fill="none"
                stroke="${getCategoryColor(arc.cat)}"
                stroke-width="${strokeWidth}"
                stroke-dasharray="${arc.pct * circumference} ${circumference}"
                stroke-dashoffset="${-arc.offset * circumference}"
                stroke-linecap="round"
                class="donut-segment"
                transform="rotate(-90 ${cx} ${cy})"
              />
            `
          )}
          <text
            x="${cx}"
            y="${cy - 8}"
            text-anchor="middle"
            class="donut-total-label"
          >
            ${this._t("dash_total")}
          </text>
          <text
            x="${cx}"
            y="${cy + 14}"
            text-anchor="middle"
            class="donut-total-value"
          >
            ${formatCurrency(total, sym)}
          </text>
        </svg>
        <div class="donut-legend">
          ${categories.map(
            ([cat, amount]) => html`
              <div class="legend-item">
                <span
                  class="legend-dot"
                  style="background: ${getCategoryColor(cat)}"
                ></span>
                <span class="legend-label">${this._cat(cat)}</span>
                <span class="legend-value">${formatCurrency(amount, sym)}</span>
                <span class="legend-pct"
                  >${total > 0 ? Math.round((amount / total) * 100) : 0}%</span
                >
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderBudgetProgress(sym: string): unknown {
    if (!this._summary) return "";
    const budgets = this._summary.budgets ?? {};
    const entries = Object.entries(budgets);
    if (entries.length === 0) return "";

    return html`
      <div class="glass-card">
        <h2>${this._t("bdg_progress")}</h2>
        <div class="budget-bars">
          ${entries.map(
            ([cat, b]) => html`
              <div class="budget-bar-item">
                <div class="budget-bar-header">
                  <span class="budget-cat">
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    ${this._cat(cat)}
                  </span>
                  <span class="budget-amounts">
                    ${formatCurrency(b.spent, sym)} /
                    ${formatCurrency(b.budget, sym)}
                  </span>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill ${b.percentage > 90
                      ? "over-budget"
                      : b.percentage > 70
                        ? "warning"
                        : ""}"
                    style="width: ${Math.min(b.percentage, 100)}%; background: ${getCategoryColor(cat)}"
                  ></div>
                </div>
                <span class="budget-remaining ${b.remaining < 0 ? "negative" : ""}">
                  ${b.remaining >= 0
                    ? html`${formatCurrency(b.remaining, sym)}
                        ${this._t("bdg_left")}`
                    : html`${formatCurrency(Math.abs(b.remaining), sym)}
                        ${this._t("bdg_over")}`}
                </span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderBalancesAndSettlements(sym: string): unknown {
    if (!this._summary) return "";
    const balances = this._summary.balances ?? {};
    const settlements = this._summary.settlements ?? [];
    const byUser = this._summary.by_user ?? {};
    const entries = Object.entries(balances);
    if (entries.length <= 1) return "";

    return html`
      <div class="glass-card" style="margin-top: 24px;">
        <h2>${this._t("set_owes_title")}</h2>

        <div class="balances-container">
          <h3
            style="font-size: 15px; margin-bottom: 12px; color: var(--text-secondary);"
          >
            ${this._t("set_current_balances")}
          </h3>
          <div class="user-breakdown-grid">
            ${entries.map(([uid, balance]) => {
              const userName =
                byUser[uid]?.name || this._config.user_name || "Unknown";
              const isOwed = balance > 0;
              const isOwer = balance < 0;
              return html`
                <div
                  class="user-card balance-card ${isOwed
                    ? "owed"
                    : isOwer
                      ? "ower"
                      : "settled"}"
                >
                  <div
                    class="user-avatar"
                    style="background: ${isOwed
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : isOwer
                        ? "linear-gradient(135deg, #ef4444, #dc2626)"
                        : "linear-gradient(135deg, #6b7280, #4b5563)"}"
                  >
                    ${((userName || "?")[0] || "?").toUpperCase()}
                  </div>
                  <span class="user-name">${userName}</span>
                  <span
                    class="user-balance-value"
                    style="font-size: 18px; font-weight: 800; color: ${isOwed
                      ? "var(--success, #10b981)"
                      : isOwer
                        ? "var(--danger, #ef4444)"
                        : "var(--text-secondary)"}"
                  >
                    ${isOwed ? "+" : ""}${formatCurrency(balance, sym)}
                  </span>
                  <span
                    class="user-balance-status"
                    style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${isOwed
                      ? "var(--success, #10b981)"
                      : isOwer
                        ? "var(--danger, #ef4444)"
                        : "var(--text-secondary)"}"
                  >
                    ${isOwed
                      ? this._t("set_is_owed")
                      : isOwer
                        ? this._t("set_owes")
                        : this._t("set_settled")}
                  </span>
                </div>
              `;
            })}
          </div>
        </div>

        <div class="settlements-container" style="margin-top: 24px;">
          <h3
            style="font-size: 15px; margin-bottom: 12px; color: var(--text-secondary);"
          >
            ${this._t("set_suggested")}
          </h3>
          ${settlements.length > 0
            ? html`
                <div
                  class="settlements-list"
                  style="display: flex; flex-direction: column; gap: 12px;"
                >
                  ${settlements.map(
                    (s) => html`
                      <div
                        class="settlement-item"
                        style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--panel-bg, rgba(255,255,255,0.05)); border: 1px solid var(--border); border-radius: 8px;"
                      >
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <span style="font-weight: 600; color: var(--danger, #ef4444);"
                            >${s.from_name}</span
                          >
                          <ha-icon
                            icon="mdi:arrow-right-thick"
                            style="color: var(--text-secondary);"
                          ></ha-icon>
                          <span style="font-weight: 600; color: var(--success, #10b981);"
                            >${s.to_name}</span
                          >
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                          <span style="font-size: 16px; font-weight: 800;"
                            >${formatCurrency(s.amount, sym)}</span
                          >
                          <button
                            class="primary-btn btn-sm"
                            style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;"
                            @click=${() => this._settleDebt(s)}
                          >
                            ${this._t("set_settle")}
                          </button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <div
                  style="display: flex; align-items: center; gap: 8px; color: var(--success, #10b981); font-weight: 600;"
                >
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>${this._t("set_no_settlements")}</span>
                </div>
              `}
        </div>
      </div>
    `;
  }

  private _renderUserBreakdown(sym: string): unknown {
    if (!this._summary) return "";
    const byUser = this._summary.by_user ?? {};
    const entries = Object.entries(byUser);
    if (entries.length <= 1) return "";

    return html`
      <div class="glass-card">
        <h2>${this._t("set_user_spendings")}</h2>
        <div class="user-breakdown-grid">
          ${entries.map(
            ([, userData]) => html`
              <div class="user-card">
                <div class="user-avatar">
                  ${((userData.name || "?")[0] || "?").toUpperCase()}
                </div>
                <span class="user-name">${userData.name}</span>
                <span class="user-total">${formatCurrency(userData.total, sym)}</span>
                <span class="user-count"
                  >${userData.count}
                  ${this._t(userData.count === 1 ? "noun_expense_sg" : "noun_expense_pl")}</span
                >
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  // ─── Expense List View ───────────────────────────

  private _renderExpenseList(): unknown {
    const sym = this._config.currency_symbol ?? "€";
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>${this._t("nav_expenses")}</h1>
          <div class="month-nav">
            <button class="icon-btn" @click=${() => this._changeMonth("prev")}>
              <ha-icon icon="mdi:chevron-left"></ha-icon>
            </button>
            <span class="month-label"
              >${getMonthName(
                this._currentMonth,
                this.hass?.locale?.language || this.hass?.language
              )}</span
            >
            <button class="icon-btn" @click=${() => this._changeMonth("next")}>
              <ha-icon icon="mdi:chevron-right"></ha-icon>
            </button>
          </div>
        </div>

        ${this._expenses.length > 0
          ? html`
              <div class="expense-table glass-card">
                ${this._expenses.map(
                  (e) => html`
                    <div class="expense-row">
                      <div
                        class="expense-cat-icon"
                        style="background: ${getCategoryColor(e.category)}20; color: ${getCategoryColor(e.category)}"
                      >
                        <ha-icon icon=${getCategoryIcon(e.category)}></ha-icon>
                      </div>
                      <div class="expense-details">
                        <span class="expense-desc"
                          >${e.description || this._cat(e.category)}</span
                        >
                        <span class="expense-meta">
                          ${this._cat(e.category)} · ${e.date} ·
                          ${e.user_name || "You"}
                          ${e.is_shared
                            ? html`<span class="shared-badge"
                                >${this._t("form_shared")}</span
                              >`
                            : ""}
                        </span>
                      </div>
                      <span class="expense-amount"
                        >-${formatCurrency(e.amount, sym)}</span
                      >
                      <div class="expense-actions">
                        <button
                          class="action-btn edit"
                          @click=${() => this._startEdit(e)}
                          title="${this._t("action_edit")}"
                        >
                          <ha-icon icon="mdi:pencil"></ha-icon>
                        </button>
                        <button
                          class="action-btn delete"
                          @click=${() => this._deleteExpense(e.id)}
                          title="${this._t("action_delete")}"
                        >
                          <ha-icon icon="mdi:delete"></ha-icon>
                        </button>
                      </div>
                    </div>
                  `
                )}
              </div>
            `
          : html`
              <div class="glass-card empty-card">
                <ha-icon icon="mdi:receipt-text-remove"></ha-icon>
                <p>
                  ${this._t("dash_no_expenses_for")}
                  ${getMonthName(
                    this._currentMonth,
                    this.hass?.locale?.language || this.hass?.language
                  )}
                </p>
                <button
                  class="primary-btn"
                  @click=${() => {
                    this._showAddForm = true;
                  }}
                >
                  ${this._t("action_add_first_expense")}
                </button>
              </div>
            `}
      </div>
    `;
  }

  // ─── Expense Form (Add / Edit) ───────────────────

  private _renderExpenseForm(): unknown {
    const isEditing = !!this._editingExpense;
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>
            ${isEditing
              ? this._t("form_edit_expense")
              : this._t("action_add_expense")}
          </h1>
          <button
            class="icon-btn"
            @click=${() => {
              this._showAddForm = false;
              this._cancelEdit();
            }}
          >
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="glass-card form-card">
          <div class="form-group">
            <label>${this._t("form_amount")}</label>
            <div class="amount-input-wrap">
              <span class="currency-prefix">${this._config.currency_symbol ?? "€"}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                .value=${this._formData.amount}
                @input=${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  this._formData = { ...this._formData, amount: target.value };
                }}
                class="amount-input"
                autofocus
              />
            </div>
          </div>

          <div class="form-group">
            <label>${this._t("form_category")}</label>
            <div class="category-grid">
              ${this._categories.map(
                (cat) => html`
                  <button
                    class="cat-chip ${this._formData.category === cat ? "selected" : ""}"
                    style="--cat-color: ${getCategoryColor(cat)}"
                    @click=${() => {
                      this._formData = { ...this._formData, category: cat };
                    }}
                  >
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    <span>${this._cat(cat)}</span>
                  </button>
                `
              )}
            </div>
          </div>

          <div class="form-group">
            <label>${this._t("form_description")}</label>
            <input
              type="text"
              placeholder="${this._t("form_description_placeholder")}"
              .value=${this._formData.description}
              @input=${(e: Event) => {
                const target = e.target as HTMLInputElement;
                this._formData = { ...this._formData, description: target.value };
              }}
              class="text-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>${this._t("form_date")}</label>
              <input
                type="date"
                .value=${this._formData.date}
                @input=${(e: Event) => {
                  const target = e.target as HTMLInputElement;
                  this._formData = { ...this._formData, date: target.value };
                }}
                class="text-input"
              />
            </div>
            <div class="form-group">
              <label>${this._t("form_shared")}</label>
              <label class="toggle-label">
                <input
                  type="checkbox"
                  .checked=${this._formData.is_shared}
                  @change=${(e: Event) => {
                    const target = e.target as HTMLInputElement;
                    this._formData = { ...this._formData, is_shared: target.checked };
                  }}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button
              class="secondary-btn"
              @click=${() => {
                this._showAddForm = false;
                this._cancelEdit();
              }}
            >
              ${this._t("action_cancel")}
            </button>
            <button
              class="primary-btn"
              @click=${isEditing ? () => this._updateExpense() : () => this._addExpense()}
            >
              <ha-icon
                icon=${isEditing ? "mdi:content-save" : "mdi:plus"}
              ></ha-icon>
              ${isEditing
                ? this._t("action_save_changes")
                : this._t("action_add_expense")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Budgets View ────────────────────────────────

  private _renderBudgets(): unknown {
    const sym = this._config.currency_symbol ?? "€";
    const s = this._summary ?? ({} as Partial<Summary>);

    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>${this._t("bdg_manage")}</h1>
        </div>

        <div class="glass-card">
          <p class="budget-hint">${this._t("bdg_hint")}</p>
          <div class="budget-list">
            ${this._categories.map((cat) => {
              const currentBudget = this._budgets[cat] || 0;
              const spent = (s.by_category ?? {})[cat] ?? 0;
              return html`
                <div class="budget-edit-row">
                  <div class="budget-edit-cat">
                    <div
                      class="recent-icon"
                      style="background: ${getCategoryColor(cat)}20; color: ${getCategoryColor(cat)}"
                    >
                      <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    </div>
                    <span>${this._cat(cat)}</span>
                  </div>
                  <div class="budget-edit-input-wrap">
                    <span class="currency-prefix small">${sym}</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      .value=${String(currentBudget)}
                      @change=${(e: Event) => {
                        const target = e.target as HTMLInputElement;
                        this._saveBudget(cat, target.value);
                      }}
                      class="budget-input"
                      placeholder="0"
                    />
                  </div>
                  <span class="budget-edit-spent">
                    ${this._t("bdg_spent")}: ${formatCurrency(spent, sym)}
                  </span>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Settings View ───────────────────────────────

  private _renderSettings(): unknown {
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>${this._t("nav_settings")}</h1>
        </div>

        <div class="glass-card">
          <h2>${this._t("set_integration_details")}</h2>
          <div class="settings-info">
            <div class="settings-row">
              <span class="settings-label">${this._t("set_user")}</span>
              <span class="settings-value"
                >${this._config.user_name || "Unknown"}</span
              >
            </div>
            <div class="settings-row">
              <span class="settings-label">${this._t("set_default_currency")}</span>
              <span class="settings-value"
                >${this._config.currency} (${this._config.currency_symbol})</span
              >
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h2>${this._t("set_custom_categories")}</h2>
          <p class="budget-hint">${this._t("set_categories_hint")}</p>

          <div class="add-category-form">
            <input
              type="text"
              id="new-category-input"
              placeholder="${this._t("set_new_category_placeholder")}"
              class="text-input"
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  const input = this.shadowRoot!.getElementById("new-category-input") as HTMLInputElement;
                  if (input.value.trim()) {
                    this._addCategory(input.value.trim());
                    input.value = "";
                  }
                }
              }}
            />
            <button
              class="primary-btn"
              @click=${() => {
                const input = this.shadowRoot!.getElementById("new-category-input") as HTMLInputElement;
                if (input.value.trim()) {
                  this._addCategory(input.value.trim());
                  input.value = "";
                }
              }}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              ${this._t("action_add")}
            </button>
          </div>

          <div class="category-list">
            ${this._categories.map(
              (cat) => html`
                <div class="category-item">
                  <div
                    class="recent-icon"
                    style="background: ${getCategoryColor(cat)}20; color: ${getCategoryColor(cat)}"
                  >
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                  </div>
                  <span>${this._cat(cat)}</span>
                  ${!isDefaultCategory(cat)
                    ? html`
                        <button
                          class="action-btn delete"
                          @click=${() => this._removeCategory(cat)}
                        >
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>
                      `
                    : html`<span class="default-badge"
                        >${this._t("set_default_badge")}</span
                      >`}
                </div>
              `
            )}
          </div>
        </div>
      </div>
    `;
  }
}

if (!customElements.get("expense-tracker-panel")) {
  customElements.define("expense-tracker-panel", ExpenseTrackerPanel);
}
