/**
 * Expense Tracker Card — Home Assistant Lovelace Custom Card
 * Displays outstanding balances, settlements, and a quick-add form on the dashboard.
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

const TRANSLATIONS = {
  pl: {
    "Loading...": "Ładowanie...",
    "Expenses Balance": "Saldo Wydatków",
    "No balances to display.": "Brak sald do wyświetlenia.",
    "Suggested Settlements": "Sugerowane Rozliczenia",
    "owes": "wisi",
    "Settle": "Rozlicz",
    "Quick Add Expense": "Szybkie Dodawanie Wydatku",
    "Amount": "Kwota",
    "Category": "Kategoria",
    "Description": "Opis",
    "Shared with Household": "Wspólny wydatek",
    "Save": "Zapisz",
    "Failed to add expense": "Nie udało się dodać wydatku",
    "Please enter a valid amount": "Wpisz poprawną kwotę",
    "Food": "Żywność",
    "Transport": "Transport",
    "Utilities": "Opłaty",
    "Entertainment": "Rozrywka",
    "Health": "Zdrowie",
    "Shopping": "Zakupy",
    "Housing": "Mieszkanie",
    "Other": "Inne"
  }
};

function formatCurrency(amount, symbol = "€") {
  return `${symbol}${Number(amount).toFixed(2)}`;
}

class ExpenseTrackerCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _summary: { type: Object },
      _loading: { type: Boolean },
      _showAddForm: { type: Boolean },
      _formData: { type: Object },
      _categories: { type: Array },
    };
  }

  constructor() {
    super();
    this._summary = null;
    this._loading = true;
    this._showAddForm = false;
    this._formData = this._defaultFormData();
    this._categories = [];
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

  setConfig(config) {
    this._config = config;
  }

  _localize(key) {
    const lang = (this.hass?.locale?.language || this.hass?.language || "en").split("-")[0];
    return TRANSLATIONS[lang]?.[key] || key;
  }

  getCardSize() {
    return 3;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadAll();
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (changedProperties.has("hass") && this.hass) {
      const oldHass = changedProperties.get("hass");
      const oldState = oldHass?.states?.["sensor.expense_tracker_monthly_total"]?.state;
      const newState = this.hass?.states?.["sensor.expense_tracker_monthly_total"]?.state;
      if (oldState !== newState && newState !== undefined) {
        this._loadAll();
      }
    }
  }

  async _loadAll() {
    this._loading = true;
    const store = this.hass?.states?.["sensor.expense_tracker_monthly_total"];
    if (store) {
      await Promise.all([
        this._loadSummary(),
        this._loadCategories(),
      ]);
    }
    this._loading = false;
  }

  async _loadSummary() {
    const res = await this.hass.callWS({
      type: "expense_tracker/summary",
    });
    if (res) this._summary = res;
  }

  async _loadCategories() {
    const res = await this.hass.callWS({
      type: "expense_tracker/categories/list",
    });
    if (res) this._categories = res.categories || [];
  }

  async _settleDebt(item) {
    this._loading = true;
    try {
      await this.hass.callService("expense_tracker", "settle_debt", {
        from_user_id: item.from_id,
        to_user_id: item.to_id,
        amount: item.amount,
      });
      await this._loadAll();
    } catch (e) {
      console.error(e);
      alert(this._localize("Failed to add expense"));
    }
    this._loading = false;
  }

  async _submitExpense() {
    const { amount, category, description, is_shared } = this._formData;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert(this._localize("Please enter a valid amount"));
      return;
    }

    this._loading = true;
    const res = await this.hass.callWS({
      type: "expense_tracker/expenses/add",
      amount: Number(amount),
      category,
      description,
      is_shared: !!is_shared,
    });

    if (res) {
      this._formData = this._defaultFormData();
      this._showAddForm = false;
      await this._loadAll();
    } else {
      alert(this._localize("Failed to add expense"));
    }
    this._loading = false;
  }

  render() {
    if (this._loading && !this._summary) {
      return html`
        <ha-card class="loading-card">
          <div style="display: flex; justify-content: center; align-items: center; min-height: 100px;">
            ${this._localize("Loading...")}
          </div>
        </ha-card>
      `;
    }

    const s = this._summary || {};
    const sym = s.currency || "€";
    const balances = s.balances || {};
    const settlements = s.settlements || [];
    const byUser = s.by_user || {};
    const entries = Object.entries(balances);

    if (this._showAddForm) {
      return this._renderAddForm(sym);
    }

    return html`
      <ha-card>
        <div class="card-header-container">
          <div class="card-header-title">
            <ha-icon icon="mdi:scale-balance"></ha-icon>
            <span>${this._localize("Expenses Balance")}</span>
          </div>
          <button class="add-btn-icon" @click=${() => this._showAddForm = true}>
            <ha-icon icon="mdi:plus"></ha-icon>
          </button>
        </div>
        <div class="card-content">
          <!-- Balances List -->
          ${entries.length > 0
            ? html`
                <div class="balances-list">
                  ${entries.map(([uid, balance]) => {
                    const userName = byUser[uid]?.name || "Unknown";
                    const isOwed = balance > 0;
                    const isOwer = balance < 0;
                    return html`
                      <div class="balance-item">
                        <div class="user-info">
                          <div class="avatar" style="background: ${isOwed ? 'linear-gradient(135deg, #10b981, #059669)' : isOwer ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6b7280, #4b5563)'}">
                            ${userName[0].toUpperCase()}
                          </div>
                          <span class="name">${userName}</span>
                        </div>
                        <span class="value ${isOwed ? 'owed' : isOwer ? 'ower' : 'settled'}">
                          ${isOwed ? "+" : ""}${formatCurrency(balance, sym)}
                        </span>
                      </div>
                    `;
                  })}
                </div>
              `
            : html`<p class="empty-state">${this._localize("No balances to display.")}</p>`}

          <!-- Suggested Settlements -->
          ${settlements.length > 0
            ? html`
                <div class="settlements-header">${this._localize("Suggested Settlements")}</div>
                <div class="settlements-list">
                  ${settlements.map(
                    (item) => html`
                      <div class="settlement-card">
                        <div class="settlement-text">
                          <strong>${item.from_name}</strong> ${this._localize("owes")} <strong>${item.to_name}</strong>
                        </div>
                        <div class="settlement-action">
                          <span class="amount">${formatCurrency(item.amount, sym)}</span>
                          <button class="settle-btn" @click=${() => this._settleDebt(item)}>${this._localize("Settle")}</button>
                        </div>
                      </div>
                    `
                  )}
                </div>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  _renderAddForm(sym) {
    return html`
      <ha-card>
        <div class="card-header-container">
          <div class="card-header-title">
            <ha-icon icon="mdi:receipt-plus-outline"></ha-icon>
            <span>${this._localize("Quick Add Expense")}</span>
          </div>
          <button class="add-btn-icon" @click=${() => this._showAddForm = false}>
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
        </div>
        <div class="card-content">
          <div class="form-group">
            <label>${this._localize("Amount")} (${sym})</label>
            <input
              type="number"
              step="0.01"
              .value=${this._formData.amount}
              @input=${(e) => { this._formData = { ...this._formData, amount: e.target.value }; }}
              class="text-input"
              placeholder="0.00"
            />
          </div>
          <div class="form-group">
            <label>${this._localize("Category")}</label>
            <select
              .value=${this._formData.category}
              @change=${(e) => { this._formData = { ...this._formData, category: e.target.value }; }}
              class="text-input"
            >
              ${this._categories.map((c) => html`<option value=${c}>${this._localize(c)}</option>`)}
            </select>
          </div>
          <div class="form-group">
            <label>${this._localize("Description")}</label>
            <input
              type="text"
              .value=${this._formData.description}
              @input=${(e) => { this._formData = { ...this._formData, description: e.target.value }; }}
              class="text-input"
              placeholder="e.g., Grocery"
            />
          </div>
          <div class="form-row">
            <div class="form-group inline-group">
              <input
                type="checkbox"
                id="is_shared_cb"
                .checked=${this._formData.is_shared}
                @change=${(e) => { this._formData = { ...this._formData, is_shared: e.target.checked }; }}
              />
              <label for="is_shared_cb">${this._localize("Shared with Household")}</label>
            </div>
          </div>
          <div class="form-actions">
            <button class="save-btn" @click=${this._submitExpense}>${this._localize("Save")}</button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      .card-header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 16px 8px 16px;
      }
      .card-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .card-header-title ha-icon {
        color: var(--primary-color);
      }
      .add-btn-icon {
        background: none;
        border: none;
        color: var(--primary-color);
        cursor: pointer;
        padding: 4px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        transition: background 0.2s;
      }
      .add-btn-icon:hover {
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.1);
      }
      .card-content {
        padding: 0 16px 16px 16px;
      }
      .balances-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
      }
      .balance-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--card-background-color, var(--paper-card-background-color, white));
        border-radius: 8px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      }
      .user-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      }
      .name {
        font-weight: 500;
      }
      .value {
        font-weight: 700;
      }
      .value.owed {
        color: var(--success-color, #4caf50);
      }
      .value.ower {
        color: var(--error-color, #f44336);
      }
      .value.settled {
        color: var(--secondary-text-color);
      }
      .settlements-header {
        font-size: 14px;
        font-weight: 600;
        margin: 16px 0 8px 0;
        color: var(--secondary-text-color);
      }
      .settlements-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .settlement-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--card-background-color, var(--paper-card-background-color, white));
        border-radius: 8px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      }
      .settlement-text {
        font-size: 13px;
      }
      .settlement-action {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .amount {
        font-weight: bold;
      }
      .settle-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }
      .settle-btn:hover {
        opacity: 0.9;
      }
      
      /* Form styles */
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 12px;
      }
      .form-group label {
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
      }
      .text-input {
        padding: 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
        background: var(--card-background-color, var(--paper-card-background-color, white));
        color: var(--primary-text-color);
        font-family: inherit;
        font-size: 14px;
      }
      .inline-group {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .save-btn {
        background: var(--primary-color);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-weight: 600;
        cursor: pointer;
      }
      .save-btn:hover {
        opacity: 0.9;
      }
      .empty-state {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 16px;
        font-style: italic;
      }
    `;
  }
}

customElements.define("expense-tracker-card", ExpenseTrackerCard);

// Register custom card type in customCards global config for Lovelace picker
window.customCards = window.customCards || [];
const cardExists = window.customCards.some(card => card.type === "expense-tracker-card");
if (!cardExists) {
  window.customCards.push({
    type: "expense-tracker-card",
    name: "Expense Tracker Card",
    description: "Displays household balances, suggested settlements, and a quick-add expense form."
  });
}
