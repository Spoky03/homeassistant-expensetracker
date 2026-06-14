/**
 * Expense Tracker Panel — Home Assistant Custom Panel
 * A premium multi-user expense tracker with dashboard, expense list,
 * budgets, and settings views.
 *
 * Built with LitElement, styled to match HA themes.
 */
const haLovelace = customElements.get("ha-panel-lovelace") ?? customElements.get("hui-view");
let LitElement, html, css;
const rawLit = haLovelace ? Object.getPrototypeOf(haLovelace) : null;

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
// ─── Utility helpers ─────────────────────────────────

function formatCurrency(amount, symbol = "€") {
  return `${symbol}${Number(amount).toFixed(2)}`;
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthName(monthStr) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m) - 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

function getPreviousMonth(monthStr) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m) - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getNextMonth(monthStr) {
  const [y, m] = monthStr.split("-");
  const d = new Date(Number(y), Number(m));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const CATEGORY_COLORS = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Utilities: "#eab308",
  Entertainment: "#a855f7",
  Health: "#ef4444",
  Shopping: "#ec4899",
  Housing: "#06b6d4",
  Other: "#6b7280",
};

const CATEGORY_ICONS = {
  Food: "mdi:food",
  Transport: "mdi:car",
  Utilities: "mdi:flash",
  Entertainment: "mdi:movie-open",
  Health: "mdi:heart-pulse",
  Shopping: "mdi:cart",
  Housing: "mdi:home",
  Other: "mdi:dots-horizontal-circle",
};

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || `hsl(${hashCode(cat) % 360}, 65%, 55%)`;
}

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || "mdi:tag";
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}


// ─── Main Panel Element ──────────────────────────────

class ExpenseTrackerPanel extends LitElement {
  static get properties() {
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

  constructor() {
    super();
    this._view = "dashboard";
    this._config = {};
    this._summary = null;
    this._expenses = [];
    this._categories = [];
    this._budgets = {};
    this._currentMonth = getCurrentMonth();
    this._loading = true;
    this._editingExpense = null;
    this._showAddForm = false;
    this._formData = this._defaultFormData();
    this._notification = null;
    this._initLoaded = false;
    this._unsubEvents = null;
  }

  _defaultFormData() {
    return {
      amount: "",
      category: "Food",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      is_shared: true,
    };
  }

  async connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("hass") && this.hass) {
      if (!this._initLoaded) {
        this._initLoaded = true;
        this._loadAll();
      } else {
        const oldHass = changedProperties.get("hass");
        const oldState = oldHass?.states?.["sensor.expense_tracker_monthly_total"]?.state;
        const newState = this.hass?.states?.["sensor.expense_tracker_monthly_total"]?.state;
        if (oldState !== newState && newState !== undefined) {
          this._loadAll();
        }
      }
    }
  }

  async _ws(type, params = {}) {
    try {
      return await this.hass.connection.sendMessagePromise({
        type,
        ...params,
      });
    } catch (e) {
      console.error(`WS call ${type} failed:`, e);
      this._showNotification("Error communicating with server", "error");
      return null;
    }
  }

  async _loadAll() {
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

  async _loadConfig() {
    const res = await this._ws("expense_tracker/config");
    if (res) this._config = res;
  }

  async _loadSummary() {
    const res = await this._ws("expense_tracker/summary", { month: this._currentMonth });
    if (res) this._summary = res;
  }

  async _loadExpenses() {
    const res = await this._ws("expense_tracker/expenses/list", { month: this._currentMonth });
    if (res) this._expenses = res.expenses || [];
  }

  async _loadCategories() {
    const res = await this._ws("expense_tracker/categories/list");
    if (res) this._categories = res.categories || [];
  }

  async _loadBudgets() {
    const res = await this._ws("expense_tracker/budgets/get");
    if (res) this._budgets = res.budgets || {};
  }

  async _addExpense() {
    const { amount, category, description, date, is_shared } = this._formData;
    if (!amount || Number(amount) <= 0) {
      this._showNotification("Please enter a valid amount", "error");
      return;
    }
    const res = await this._ws("expense_tracker/expenses/add", {
      amount: Number(amount),
      category,
      description,
      date,
      is_shared,
    });
    if (res) {
      this._showNotification("Expense added!", "success");
      this._formData = this._defaultFormData();
      this._showAddForm = false;
      await this._loadAll();
    }
  }

  async _updateExpense() {
    if (!this._editingExpense) return;
    const { amount, category, description, date, is_shared } = this._formData;
    const res = await this._ws("expense_tracker/expenses/update", {
      expense_id: this._editingExpense.id,
      amount: Number(amount),
      category,
      description,
      date,
      is_shared,
    });
    if (res) {
      this._showNotification("Expense updated!", "success");
      this._editingExpense = null;
      this._formData = this._defaultFormData();
      await this._loadAll();
    }
  }

  async _deleteExpense(id) {
    const res = await this._ws("expense_tracker/expenses/delete", { expense_id: id });
    if (res) {
      this._showNotification("Expense deleted", "success");
      await this._loadAll();
    }
  }

  async _saveBudget(category, amount) {
    await this._ws("expense_tracker/budgets/set", {
      category,
      amount: Number(amount),
    });
    this._showNotification("Budget saved!", "success");
    await Promise.all([this._loadBudgets(), this._loadSummary()]);
  }

  async _addCategory(name) {
    const res = await this._ws("expense_tracker/categories/add", { name });
    if (res) {
      this._showNotification("Category added!", "success");
      await this._loadCategories();
    }
  }

  async _removeCategory(name) {
    const res = await this._ws("expense_tracker/categories/remove", { name });
    if (res) {
      this._showNotification("Category removed", "success");
      await this._loadCategories();
    }
  }

  _showNotification(message, type = "info") {
    this._notification = { message, type };
    setTimeout(() => {
      this._notification = null;
    }, 3000);
  }

  _startEdit(expense) {
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

  _cancelEdit() {
    this._editingExpense = null;
    this._formData = this._defaultFormData();
  }

  async _changeMonth(direction) {
    this._currentMonth =
      direction === "prev"
        ? getPreviousMonth(this._currentMonth)
        : getNextMonth(this._currentMonth);
    await Promise.all([this._loadSummary(), this._loadExpenses()]);
  }

  // ─── Rendering ─────────────────────────────────

  render() {
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

  _renderNav() {
    const navItems = [
      { id: "dashboard", icon: "mdi:view-dashboard", label: "Dashboard" },
      { id: "expenses", icon: "mdi:format-list-bulleted", label: "Expenses" },
      { id: "budgets", icon: "mdi:target", label: "Budgets" },
      { id: "settings", icon: "mdi:cog", label: "Settings" },
    ];
    return html`
      <nav class="panel-nav">
        <div class="nav-header">
          <ha-icon icon="mdi:wallet"></ha-icon>
          <span class="nav-title">Expense Tracker</span>
        </div>
        <div class="nav-items">
          ${navItems.map(
            (item) => html`
              <button
                class="nav-btn ${this._view === item.id ? "active" : ""}"
                @click=${() => { this._view = item.id; }}
              >
                <ha-icon icon=${item.icon}></ha-icon>
                <span>${item.label}</span>
              </button>
            `
          )}
        </div>
        <button class="fab" @click=${() => { this._showAddForm = true; this._editingExpense = null; this._formData = this._defaultFormData(); }}>
          <ha-icon icon="mdi:plus"></ha-icon>
          <span>Add Expense</span>
        </button>
      </nav>
    `;
  }

  _renderLoader() {
    return html`
      <div class="loader">
        <div class="spinner"></div>
        <p>Loading expenses...</p>
      </div>
    `;
  }

  _renderNotification() {
    return html`
      <div class="notification ${this._notification.type}">
        <ha-icon icon=${this._notification.type === "error" ? "mdi:alert-circle" : "mdi:check-circle"}></ha-icon>
        <span>${this._notification.message}</span>
      </div>
    `;
  }

  _renderView() {
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

  // ─── Dashboard View ────────────────────────────

  _renderDashboard() {
    const s = this._summary || {};
    const sym = this._config.currency_symbol || "€";
    const byCategory = s.by_category || {};
    const total = s.total || 0;
    const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>Dashboard</h1>
          <div class="month-nav">
            <button class="icon-btn" @click=${() => this._changeMonth("prev")}>
              <ha-icon icon="mdi:chevron-left"></ha-icon>
            </button>
            <span class="month-label">${getMonthName(this._currentMonth)}</span>
            <button class="icon-btn" @click=${() => this._changeMonth("next")}>
              <ha-icon icon="mdi:chevron-right"></ha-icon>
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="summary-grid">
          <div class="summary-card total-card">
            <div class="card-icon-wrap gradient-1">
              <ha-icon icon="mdi:cash-multiple"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Total Spent</span>
              <span class="card-value">${formatCurrency(total, sym)}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-2">
              <ha-icon icon="mdi:receipt-text"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Transactions</span>
              <span class="card-value">${s.expense_count || 0}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-3">
              <ha-icon icon="mdi:trophy"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Top Category</span>
              <span class="card-value">${s.top_category || "—"}</span>
            </div>
          </div>
          <div class="summary-card">
            <div class="card-icon-wrap gradient-4">
              <ha-icon icon="mdi:calculator-variant"></ha-icon>
            </div>
            <div class="card-info">
              <span class="card-label">Daily Avg.</span>
              <span class="card-value">${formatCurrency(
                (s.expense_count || 0) > 0
                  ? total / new Date(this._currentMonth + "-15").getDate()
                  : 0,
                sym
              )}</span>
            </div>
          </div>
        </div>

        <!-- Two-column layout for chart + recent -->
        <div class="dashboard-grid">
          <!-- Category Donut Chart -->
          <div class="glass-card chart-card">
            <h2>Spending by Category</h2>
            ${categories.length > 0 ? this._renderDonutChart(categories, total, sym) : html`<p class="empty-state">No expenses this month</p>`}
          </div>

          <!-- Recent Expenses -->
          <div class="glass-card recent-card">
            <h2>Recent Expenses</h2>
            ${this._expenses.length > 0
              ? html`
                  <div class="recent-list">
                    ${this._expenses.slice(0, 8).map(
                      (e) => html`
                        <div class="recent-item" @click=${() => this._startEdit(e)}>
                          <div class="recent-icon" style="background: ${getCategoryColor(e.category)}20; color: ${getCategoryColor(e.category)}">
                            <ha-icon icon=${getCategoryIcon(e.category)}></ha-icon>
                          </div>
                          <div class="recent-info">
                            <span class="recent-desc">${e.description || e.category}</span>
                            <span class="recent-meta">${e.date}${e.is_shared ? " · Shared" : ""}</span>
                          </div>
                          <span class="recent-amount" style="color: ${getCategoryColor(e.category)}">
                            -${formatCurrency(e.amount, sym)}
                          </span>
                        </div>
                      `
                    )}
                  </div>
                `
              : html`<p class="empty-state">No expenses yet. Add your first one!</p>`}
          </div>
        </div>

        <!-- Budget Progress (if any) -->
        ${this._renderBudgetProgress(s, sym)}

        <!-- Per-User Breakdown -->
        ${this._renderUserBreakdown(s, sym)}

        <!-- Balances & Settlements -->
        ${this._renderBalancesAndSettlements(s, sym)}
      </div>
    `;
  }

  _renderDonutChart(categories, total, sym) {
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
                cx="${cx}" cy="${cy}" r="${r}"
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
          <text x="${cx}" y="${cy - 8}" text-anchor="middle" class="donut-total-label">Total</text>
          <text x="${cx}" y="${cy + 14}" text-anchor="middle" class="donut-total-value">${formatCurrency(total, sym)}</text>
        </svg>
        <div class="donut-legend">
          ${categories.map(
            ([cat, amount]) => html`
              <div class="legend-item">
                <span class="legend-dot" style="background: ${getCategoryColor(cat)}"></span>
                <span class="legend-label">${cat}</span>
                <span class="legend-value">${formatCurrency(amount, sym)}</span>
                <span class="legend-pct">${total > 0 ? Math.round((amount / total) * 100) : 0}%</span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  _renderBudgetProgress(summary, sym) {
    const budgets = summary?.budgets || {};
    const entries = Object.entries(budgets);
    if (entries.length === 0) return "";

    return html`
      <div class="glass-card">
        <h2>Budget Progress</h2>
        <div class="budget-bars">
          ${entries.map(
            ([cat, b]) => html`
              <div class="budget-bar-item">
                <div class="budget-bar-header">
                  <span class="budget-cat">
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    ${cat}
                  </span>
                  <span class="budget-amounts">
                    ${formatCurrency(b.spent, sym)} / ${formatCurrency(b.budget, sym)}
                  </span>
                </div>
                <div class="progress-track">
                  <div
                    class="progress-fill ${b.percentage > 90 ? "over-budget" : b.percentage > 70 ? "warning" : ""}"
                    style="width: ${Math.min(b.percentage, 100)}%; background: ${getCategoryColor(cat)}"
                  ></div>
                </div>
                <span class="budget-remaining ${b.remaining < 0 ? "negative" : ""}">
                  ${b.remaining >= 0 ? `${formatCurrency(b.remaining, sym)} left` : `${formatCurrency(Math.abs(b.remaining), sym)} over budget`}
                </span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  async _settleDebt(s) {
    const sym = this._config.currency_symbol || "€";
    const amount = s.amount;
    const fromId = s.from_id;
    const fromName = s.from_name;
    const toId = s.to_id;
    const toName = s.to_name;

    const confirmed = confirm(`Record settlement: ${fromName} paid ${toName} ${sym}${amount}?`);
    if (!confirmed) return;

    this._loading = true;
    const res = await this._ws("expense_tracker/expenses/add", {
      amount: Number(amount),
      category: "Settlement",
      description: `Debt settlement to ${toName}`,
      is_shared: false,
      user_id: fromId,
      tags: [`to:${toId}`]
    });

    if (res) {
      this._showNotification("Debt settlement recorded successfully", "success");
      await this._loadAll();
    } else {
      this._showNotification("Failed to record settlement", "error");
    }
    this._loading = false;
  }

  _renderBalancesAndSettlements(summary, sym) {
    const balances = summary?.balances || {};
    const settlements = summary?.settlements || [];
    const byUser = summary?.by_user || {};
    const entries = Object.entries(balances);
    if (entries.length <= 1) return "";

    return html`
      <div class="glass-card" style="margin-top: 24px;">
        <h2>Balances & Settlements</h2>
        
        <div class="balances-container">
          <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-secondary);">Current Balances</h3>
          <div class="user-breakdown-grid">
            ${entries.map(([uid, balance]) => {
              const userName = byUser[uid]?.name || this._config.user_name || "Unknown";
              const isOwed = balance > 0;
              const isOwer = balance < 0;
              return html`
                <div class="user-card balance-card ${isOwed ? 'owed' : isOwer ? 'ower' : 'settled'}">
                  <div class="user-avatar" style="background: ${isOwed ? 'linear-gradient(135deg, #10b981, #059669)' : isOwer ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6b7280, #4b5563)'}">
                    ${(userName || "?")[0].toUpperCase()}
                  </div>
                  <span class="user-name">${userName}</span>
                  <span class="user-balance-value" style="font-size: 18px; font-weight: 800; color: ${isOwed ? 'var(--success, #10b981)' : isOwer ? 'var(--danger, #ef4444)' : 'var(--text-secondary)'}">
                    ${isOwed ? "+" : ""}${formatCurrency(balance, sym)}
                  </span>
                  <span class="user-balance-status" style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${isOwed ? 'var(--success, #10b981)' : isOwer ? 'var(--danger, #ef4444)' : 'var(--text-secondary)'}">
                    ${isOwed ? 'Is Owed' : isOwer ? 'Owes' : 'Settled'}
                  </span>
                </div>
              `;
            })}
          </div>
        </div>

        <div class="settlements-container" style="margin-top: 24px;">
          <h3 style="font-size: 15px; margin-bottom: 12px; color: var(--text-secondary);">Suggested Settlements</h3>
          ${settlements.length > 0
            ? html`
                <div class="settlements-list" style="display: flex; flex-direction: column; gap: 12px;">
                  ${settlements.map(
                    (s) => html`
                      <div class="settlement-item" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--panel-bg, rgba(255,255,255,0.05)); border: 1px solid var(--border); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <span style="font-weight: 600; color: var(--danger, #ef4444);">${s.from_name}</span>
                          <ha-icon icon="mdi:arrow-right-thick" style="color: var(--text-secondary);"></ha-icon>
                          <span style="font-weight: 600; color: var(--success, #10b981);">${s.to_name}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                          <span style="font-size: 16px; font-weight: 800;">${formatCurrency(s.amount, sym)}</span>
                          <button class="primary-btn btn-sm" style="padding: 6px 12px; font-size: 12px; border-radius: 6px; cursor: pointer;" @click=${() => this._settleDebt(s)}>
                            Settle Debt
                          </button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : html`
                <div style="display: flex; align-items: center; gap: 8px; color: var(--success, #10b981); font-weight: 600;">
                  <ha-icon icon="mdi:check-circle-outline"></ha-icon>
                  <span>All settled up!</span>
                </div>
              `}
        </div>
      </div>
    `;
  }

  _renderUserBreakdown(summary, sym) {
    const byUser = summary?.by_user || {};
    const entries = Object.entries(byUser);
    if (entries.length <= 1) return "";

    return html`
      <div class="glass-card">
        <h2>Per-Person Breakdown</h2>
        <div class="user-breakdown-grid">
          ${entries.map(
            ([, userData]) => html`
              <div class="user-card">
                <div class="user-avatar">${(userData.name || "?")[0].toUpperCase()}</div>
                <span class="user-name">${userData.name}</span>
                <span class="user-total">${formatCurrency(userData.total, sym)}</span>
                <span class="user-count">${userData.count} expenses</span>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  // ─── Expense List View ─────────────────────────

  _renderExpenseList() {
    const sym = this._config.currency_symbol || "€";
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>Expenses</h1>
          <div class="month-nav">
            <button class="icon-btn" @click=${() => this._changeMonth("prev")}>
              <ha-icon icon="mdi:chevron-left"></ha-icon>
            </button>
            <span class="month-label">${getMonthName(this._currentMonth)}</span>
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
                      <div class="expense-cat-icon" style="background: ${getCategoryColor(e.category)}20; color: ${getCategoryColor(e.category)}">
                        <ha-icon icon=${getCategoryIcon(e.category)}></ha-icon>
                      </div>
                      <div class="expense-details">
                        <span class="expense-desc">${e.description || e.category}</span>
                        <span class="expense-meta">
                          ${e.category} · ${e.date} · ${e.user_name || "You"}
                          ${e.is_shared ? html`<span class="shared-badge">Shared</span>` : ""}
                        </span>
                      </div>
                      <span class="expense-amount">-${formatCurrency(e.amount, sym)}</span>
                      <div class="expense-actions">
                        <button class="action-btn edit" @click=${() => this._startEdit(e)} title="Edit">
                          <ha-icon icon="mdi:pencil"></ha-icon>
                        </button>
                        <button class="action-btn delete" @click=${() => this._deleteExpense(e.id)} title="Delete">
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
                <p>No expenses for ${getMonthName(this._currentMonth)}</p>
                <button class="primary-btn" @click=${() => { this._showAddForm = true; }}>
                  Add First Expense
                </button>
              </div>
            `}
      </div>
    `;
  }

  // ─── Expense Form (Add / Edit) ─────────────────

  _renderExpenseForm() {
    const isEditing = !!this._editingExpense;
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>${isEditing ? "Edit Expense" : "Add Expense"}</h1>
          <button class="icon-btn" @click=${() => { this._showAddForm = false; this._cancelEdit(); }}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>

        <div class="glass-card form-card">
          <div class="form-group">
            <label>Amount</label>
            <div class="amount-input-wrap">
              <span class="currency-prefix">${this._config.currency_symbol || "€"}</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                .value=${this._formData.amount}
                @input=${(e) => { this._formData = { ...this._formData, amount: e.target.value }; }}
                class="amount-input"
                autofocus
              />
            </div>
          </div>

          <div class="form-group">
            <label>Category</label>
            <div class="category-grid">
              ${this._categories.map(
                (cat) => html`
                  <button
                    class="cat-chip ${this._formData.category === cat ? "selected" : ""}"
                    style="--cat-color: ${getCategoryColor(cat)}"
                    @click=${() => { this._formData = { ...this._formData, category: cat }; }}
                  >
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    <span>${cat}</span>
                  </button>
                `
              )}
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <input
              type="text"
              placeholder="What was this expense for?"
              .value=${this._formData.description}
              @input=${(e) => { this._formData = { ...this._formData, description: e.target.value }; }}
              class="text-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>Date</label>
              <input
                type="date"
                .value=${this._formData.date}
                @input=${(e) => { this._formData = { ...this._formData, date: e.target.value }; }}
                class="text-input"
              />
            </div>
            <div class="form-group">
              <label>Shared</label>
              <label class="toggle-label">
                <input
                  type="checkbox"
                  .checked=${this._formData.is_shared}
                  @change=${(e) => { this._formData = { ...this._formData, is_shared: e.target.checked }; }}
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div class="form-actions">
            <button class="secondary-btn" @click=${() => { this._showAddForm = false; this._cancelEdit(); }}>
              Cancel
            </button>
            <button class="primary-btn" @click=${isEditing ? () => this._updateExpense() : () => this._addExpense()}>
              <ha-icon icon=${isEditing ? "mdi:content-save" : "mdi:plus"}></ha-icon>
              ${isEditing ? "Save Changes" : "Add Expense"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Budgets View ──────────────────────────────

  _renderBudgets() {
    const sym = this._config.currency_symbol || "€";
    const s = this._summary || {};

    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>Monthly Budgets</h1>
        </div>

        <div class="glass-card">
          <p class="budget-hint">Set monthly spending limits for each category. Set to 0 to remove a budget.</p>
          <div class="budget-list">
            ${this._categories.map((cat) => {
              const currentBudget = this._budgets[cat] || 0;
              const spent = (s.by_category || {})[cat] || 0;
              return html`
                <div class="budget-edit-row">
                  <div class="budget-edit-cat">
                    <div class="recent-icon" style="background: ${getCategoryColor(cat)}20; color: ${getCategoryColor(cat)}">
                      <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                    </div>
                    <span>${cat}</span>
                  </div>
                  <div class="budget-edit-input-wrap">
                    <span class="currency-prefix small">${sym}</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      .value=${String(currentBudget)}
                      @change=${(e) => this._saveBudget(cat, e.target.value)}
                      class="budget-input"
                      placeholder="0"
                    />
                  </div>
                  <span class="budget-edit-spent">
                    Spent: ${formatCurrency(spent, sym)}
                  </span>
                </div>
              `;
            })}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Settings View ─────────────────────────────

  _renderSettings() {
    return html`
      <div class="view-container">
        <div class="view-header">
          <h1>Settings</h1>
        </div>

        <div class="glass-card">
          <h2>Your Information</h2>
          <div class="settings-info">
            <div class="settings-row">
              <span class="settings-label">User</span>
              <span class="settings-value">${this._config.user_name || "Unknown"}</span>
            </div>
            <div class="settings-row">
              <span class="settings-label">Currency</span>
              <span class="settings-value">${this._config.currency} (${this._config.currency_symbol})</span>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h2>Custom Categories</h2>
          <p class="budget-hint">Add custom categories on top of the defaults. Default categories cannot be removed.</p>

          <div class="add-category-form">
            <input
              type="text"
              id="new-category-input"
              placeholder="New category name..."
              class="text-input"
              @keydown=${(e) => {
                if (e.key === "Enter") {
                  const input = this.shadowRoot.getElementById("new-category-input");
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
                const input = this.shadowRoot.getElementById("new-category-input");
                if (input.value.trim()) {
                  this._addCategory(input.value.trim());
                  input.value = "";
                }
              }}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
              Add
            </button>
          </div>

          <div class="category-list">
            ${this._categories.map(
              (cat) => html`
                <div class="category-item">
                  <div class="recent-icon" style="background: ${getCategoryColor(cat)}20; color: ${getCategoryColor(cat)}">
                    <ha-icon icon=${getCategoryIcon(cat)}></ha-icon>
                  </div>
                  <span>${cat}</span>
                  ${!["Food", "Transport", "Utilities", "Entertainment", "Health", "Shopping", "Housing", "Other"].includes(cat)
                    ? html`
                        <button class="action-btn delete" @click=${() => this._removeCategory(cat)}>
                          <ha-icon icon="mdi:close"></ha-icon>
                        </button>
                      `
                    : html`<span class="default-badge">Default</span>`}
                </div>
              `
            )}
          </div>
        </div>
      </div>
    `;
  }

  // ─── Styles ────────────────────────────────────

  static get styles() {
    return css`
      :host {
        display: block;
        height: 100%;
        --panel-bg: var(--primary-background-color, #0f0f23);
        --card-bg: var(--card-background-color, #1a1a2e);
        --text-primary: var(--primary-text-color, #e2e8f0);
        --text-secondary: var(--secondary-text-color, #94a3b8);
        --accent: var(--primary-color, #6366f1);
        --accent-hover: var(--light-primary-color, #818cf8);
        --border: var(--divider-color, rgba(255,255,255,0.08));
        --success: #22c55e;
        --danger: #ef4444;
        --warning: #f59e0b;
        --radius: 16px;
        --radius-sm: 10px;
        --shadow: 0 4px 24px rgba(0,0,0,0.25);
        font-family: var(--paper-font-body1_-_font-family, "Inter", "Segoe UI", sans-serif);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .panel-root {
        display: flex;
        height: 100%;
        background: var(--panel-bg);
        color: var(--text-primary);
      }

      /* ─── Navigation ─── */
      .panel-nav {
        width: 240px;
        min-height: 100%;
        background: var(--card-bg);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 20px 12px;
        gap: 8px;
      }

      .nav-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 20px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
      }

      .nav-header ha-icon {
        color: var(--accent);
        --mdc-icon-size: 28px;
      }

      .nav-title {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .nav-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .nav-btn:hover {
        background: var(--border);
        color: var(--text-primary);
      }

      .nav-btn.active {
        background: var(--accent);
        color: #fff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }

      .nav-btn ha-icon {
        --mdc-icon-size: 20px;
      }

      .fab {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--primary-color);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.25s ease;
        font-family: inherit;
        margin-top: 8px;
      }

      .fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      .fab ha-icon { --mdc-icon-size: 20px; }

      /* ─── Main Content ─── */
      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px 32px;
        max-height: 100vh;
      }

      .view-container {
        max-width: 960px;
        margin: 0 auto;
      }

      .view-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .view-header h1 {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .month-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--card-bg);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
      }

      .month-label {
        font-size: 14px;
        font-weight: 600;
        min-width: 140px;
        text-align: center;
      }

      .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .icon-btn:hover {
        background: var(--border);
        color: var(--text-primary);
      }

      .icon-btn ha-icon { --mdc-icon-size: 20px; }

      /* ─── Glass Cards ─── */
      .glass-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        margin-bottom: 20px;
        backdrop-filter: blur(12px);
        box-shadow: var(--shadow);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .glass-card:hover {
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }

      .glass-card h2 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 16px;
        color: var(--text-primary);
        letter-spacing: -0.2px;
      }

      /* ─── Summary Cards ─── */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        box-shadow: var(--shadow);
        transition: transform 0.2s ease;
      }

      .summary-card:hover {
        transform: translateY(-3px);
      }

      .card-icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-icon-wrap ha-icon {
        --mdc-icon-size: 24px;
        color: #fff;
      }

      .gradient-1 { background: var(--primary-color); }
      .gradient-2 { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
      .gradient-3 { background: linear-gradient(135deg, #f97316, #eab308); }
      .gradient-4 { background: linear-gradient(135deg, #22c55e, #06b6d4); }

      .card-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .card-label {
        font-size: 12px;
        color: var(--text-secondary);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-value {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .total-card {
        border-color: rgba(99, 102, 241, 0.3);
      }

      /* ─── Dashboard Grid ─── */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }

      /* ─── Donut Chart ─── */
      .donut-container {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .donut-svg {
        width: 200px;
        height: 200px;
        flex-shrink: 0;
      }

      .donut-segment {
        transition: stroke-dasharray 0.6s ease;
      }

      .donut-total-label {
        font-size: 11px;
        fill: var(--text-secondary);
        font-weight: 500;
      }

      .donut-total-value {
        font-size: 16px;
        fill: var(--text-primary);
        font-weight: 800;
      }

      .donut-legend {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-width: 150px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .legend-label {
        flex: 1;
        color: var(--text-secondary);
      }

      .legend-value {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .legend-pct {
        color: var(--text-secondary);
        font-size: 12px;
        min-width: 32px;
        text-align: right;
      }

      /* ─── Recent Expenses ─── */
      .recent-list {
        display: flex;
        flex-direction: column;
      }

      .recent-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 4px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.15s ease;
        border-radius: 8px;
      }

      .recent-item:hover {
        background: var(--border);
      }

      .recent-item:last-child {
        border-bottom: none;
      }

      .recent-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .recent-icon ha-icon { --mdc-icon-size: 18px; }

      .recent-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .recent-desc {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .recent-meta {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .recent-amount {
        font-size: 14px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }

      /* ─── Budget Progress ─── */
      .budget-bars { display: flex; flex-direction: column; gap: 16px; }

      .budget-bar-item { display: flex; flex-direction: column; gap: 6px; }

      .budget-bar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .budget-cat {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }

      .budget-cat ha-icon { --mdc-icon-size: 16px; }

      .budget-amounts {
        color: var(--text-secondary);
        font-variant-numeric: tabular-nums;
      }

      .progress-track {
        height: 8px;
        background: var(--border);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .progress-fill.over-budget { animation: pulse-danger 1.5s ease-in-out infinite; }

      @keyframes pulse-danger {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .budget-remaining {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .budget-remaining.negative { color: var(--danger); font-weight: 600; }

      /* ─── User Breakdown ─── */
      .user-breakdown-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
      }

      .user-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 20px;
        background: var(--panel-bg);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .balance-card.owed {
        border-color: rgba(34, 197, 94, 0.4);
        background: linear-gradient(to bottom, var(--panel-bg), rgba(34, 197, 94, 0.03));
      }

      .balance-card.ower {
        border-color: rgba(239, 68, 68, 0.4);
        background: linear-gradient(to bottom, var(--panel-bg), rgba(239, 68, 68, 0.03));
      }

      .balance-card.settled {
        border-color: var(--border);
        opacity: 0.8;
      }

      .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
      }

      .user-name { font-size: 14px; font-weight: 600; }
      .user-total { font-size: 18px; font-weight: 800; }
      .user-count { font-size: 12px; color: var(--text-secondary); }

      /* ─── Expense Table ─── */
      .expense-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 4px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s ease;
      }

      .expense-row:hover {
        background: var(--border);
        border-radius: 8px;
      }

      .expense-row:last-child { border-bottom: none; }

      .expense-cat-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .expense-cat-icon ha-icon { --mdc-icon-size: 20px; }

      .expense-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .expense-desc {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .expense-meta {
        font-size: 12px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }

      .shared-badge {
        background: var(--accent);
        color: #fff;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .expense-amount {
        font-size: 16px;
        font-weight: 700;
        color: var(--danger);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }

      .expense-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .expense-row:hover .expense-actions { opacity: 1; }

      .action-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }

      .action-btn:hover {
        background: var(--border);
      }

      .action-btn.edit:hover { color: var(--accent); }
      .action-btn.delete:hover { color: var(--danger); }
      .action-btn ha-icon { --mdc-icon-size: 16px; }

      /* ─── Form ─── */
      .form-card { max-width: 560px; }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .amount-input-wrap {
        display: flex;
        align-items: center;
        background: var(--panel-bg);
        border: 2px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0 16px;
        transition: border-color 0.2s ease;
      }

      .amount-input-wrap:focus-within {
        border-color: var(--accent);
      }

      .currency-prefix {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-secondary);
        margin-right: 8px;
      }

      .currency-prefix.small {
        font-size: 14px;
      }

      .amount-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 32px;
        font-weight: 800;
        color: var(--text-primary);
        padding: 12px 0;
        outline: none;
        font-family: inherit;
      }

      .amount-input::placeholder {
        color: var(--text-secondary);
        opacity: 0.4;
      }

      .text-input {
        width: 100%;
        border: 2px solid var(--border);
        background: var(--panel-bg);
        border-radius: var(--radius-sm);
        padding: 12px 16px;
        font-size: 14px;
        color: var(--text-primary);
        outline: none;
        transition: border-color 0.2s ease;
        font-family: inherit;
      }

      .text-input:focus {
        border-color: var(--accent);
      }

      .category-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .cat-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 2px solid var(--border);
        border-radius: 24px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .cat-chip:hover {
        border-color: var(--cat-color);
        color: var(--cat-color);
      }

      .cat-chip.selected {
        border-color: var(--cat-color);
        background: color-mix(in srgb, var(--cat-color) 15%, transparent);
        color: var(--cat-color);
        font-weight: 600;
      }

      .cat-chip ha-icon { --mdc-icon-size: 16px; }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-end;
      }

      .flex-1 { flex: 1; }

      /* Toggle */
      .toggle-label {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 28px;
        cursor: pointer;
      }

      .toggle-label input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        inset: 0;
        background: var(--border);
        border-radius: 14px;
        transition: background 0.3s ease;
      }

      .toggle-slider::before {
        content: "";
        position: absolute;
        width: 22px;
        height: 22px;
        left: 3px;
        bottom: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.3s ease;
      }

      .toggle-label input:checked + .toggle-slider {
        background: var(--accent);
      }

      .toggle-label input:checked + .toggle-slider::before {
        transform: translateX(20px);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .primary-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--primary-color);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .primary-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }

      .primary-btn ha-icon { --mdc-icon-size: 18px; }

      .secondary-btn {
        padding: 10px 20px;
        border: 2px solid var(--border);
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      }

      .secondary-btn:hover {
        border-color: var(--text-secondary);
        color: var(--text-primary);
      }

      /* ─── Budgets Edit ─── */
      .budget-hint {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 20px;
      }

      .budget-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .budget-edit-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 8px;
        border-radius: 8px;
        transition: background 0.15s ease;
      }

      .budget-edit-row:hover {
        background: var(--panel-bg);
      }

      .budget-edit-cat {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 160px;
        font-weight: 600;
        font-size: 14px;
      }

      .budget-edit-input-wrap {
        display: flex;
        align-items: center;
        background: var(--panel-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0 10px;
        width: 140px;
      }

      .budget-input {
        border: none;
        background: transparent;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        padding: 8px 4px;
        outline: none;
        width: 80px;
        font-family: inherit;
      }

      .budget-edit-spent {
        font-size: 13px;
        color: var(--text-secondary);
        min-width: 100px;
      }

      /* ─── Settings ─── */
      .settings-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .settings-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }

      .settings-row:last-child { border-bottom: none; }

      .settings-label {
        font-size: 14px;
        color: var(--text-secondary);
      }

      .settings-value {
        font-size: 14px;
        font-weight: 600;
      }

      .add-category-form {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .add-category-form .text-input {
        flex: 1;
      }

      .category-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .category-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 8px;
        transition: background 0.15s ease;
      }

      .category-item:hover {
        background: var(--panel-bg);
      }

      .category-item span {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }

      .default-badge {
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--border);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
        flex: 0 !important;
      }

      /* ─── Empty State ─── */
      .empty-state {
        text-align: center;
        color: var(--text-secondary);
        padding: 32px 16px;
        font-size: 14px;
      }

      .empty-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 48px;
      }

      .empty-card ha-icon {
        --mdc-icon-size: 48px;
        color: var(--text-secondary);
        opacity: 0.5;
      }

      .empty-card p {
        color: var(--text-secondary);
        font-size: 15px;
      }

      /* ─── Loader ─── */
      .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: 16px;
        color: var(--text-secondary);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* ─── Notification Toast ─── */
      .notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 20px;
        border-radius: var(--radius-sm);
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        z-index: 1000;
        animation: toast-in 0.3s ease;
      }

      .notification.success {
        background: var(--success);
        color: #fff;
      }

      .notification.error {
        background: var(--danger);
        color: #fff;
      }

      .notification.info {
        background: var(--accent);
        color: #fff;
      }

      .notification ha-icon { --mdc-icon-size: 20px; }

      @keyframes toast-in {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* ─── Responsive ─── */
      @media (max-width: 768px) {
        .panel-root {
          flex-direction: column;
        }

        .panel-nav {
          width: 100%;
          min-height: auto;
          flex-direction: row;
          padding: 8px 12px;
          overflow-x: auto;
          border-right: none;
          border-bottom: 1px solid var(--border);
          gap: 4px;
        }

        .nav-header {
          display: none;
        }

        .nav-items {
          flex-direction: row;
          gap: 4px;
        }

        .nav-btn span {
          display: none;
        }

        .nav-btn {
          padding: 10px;
        }

        .fab {
          margin-top: 0;
          padding: 10px;
        }

        .fab span { display: none; }

        .panel-content {
          padding: 16px;
          max-height: none;
        }

        .summary-grid {
          grid-template-columns: 1fr 1fr;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .donut-container {
          flex-direction: column;
          align-items: center;
        }

        .form-row {
          flex-direction: column;
        }

        .view-header {
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }

        .expense-actions {
          opacity: 1;
        }

        .budget-edit-row {
          flex-wrap: wrap;
        }

        .card-value {
          font-size: 18px;
        }
      }

      @media (max-width: 480px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }
}

if (!customElements.get("expense-tracker-panel")) {
  customElements.define("expense-tracker-panel", ExpenseTrackerPanel);
}
