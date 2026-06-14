/**
 * Translation tables and a `t()` factory.
 *
 * Keys are short identifiers rather than English text so that:
 *   1. the English source is implicit (fall back to the key itself), and
 *   2. notification messages are stable identifiers that survive rewording.
 *
 * `makeT(hass)` returns a `t(key)` function bound to the current HA language.
 * The factory should be re-invoked in `updated()` whenever `hass` changes so
 * a language switch is picked up on the next render.
 */

import { DEFAULT_CATEGORIES } from "./categories.js";

const CATEGORY_KEYS = {
  Food: "cat_food",
  Transport: "cat_transport",
  Utilities: "cat_utilities",
  Entertainment: "cat_entertainment",
  Health: "cat_health",
  Shopping: "cat_shopping",
  Housing: "cat_housing",
  Other: "cat_other",
};

export const MESSAGES = {
  pl: {
    // Navigation
    nav_dashboard: "Pulpit",
    nav_expenses: "Wydatki",
    nav_budgets: "Budżety",
    nav_settings: "Ustawienia",
    app_title: "Menedżer Wydatków",

    // Common actions
    action_add_expense: "Dodaj Wydatek",
    action_add: "Dodaj",
    action_add_first_expense: "Dodaj pierwszy wydatek",
    action_cancel: "Anuluj",
    action_save: "Zapisz",
    action_save_changes: "Zapisz Zmiany",
    action_edit: "Edytuj",
    action_delete: "Usuń",
    action_remove: "Usuń",

    // Form
    form_amount: "Kwota",
    form_category: "Kategoria",
    form_description: "Opis",
    form_date: "Data",
    form_shared: "Wspólny wydatek",
    form_shared_household: "Wspólny wydatek",
    form_edit_expense: "Edytuj Wydatek",
    form_description_placeholder: "Na co był ten wydatek?",

    // Dashboard
    dash_total_spent: "Suma Wydatków",
    dash_transactions: "Transakcje",
    dash_top_category: "Główna Kategoria",
    dash_daily_avg: "Średnia dzienna",
    dash_category_breakdown: "Podział na Kategorie",
    dash_recent_expenses: "Ostatnie Wydatki",
    dash_no_expenses_month: "Brak wydatków w tym miesiącu",
    dash_no_expenses_yet: "Brak wydatków. Dodaj swój pierwszy wydatek!",
    dash_no_expenses_for: "Brak wydatków na",
    dash_total: "Suma",

    // Budgets
    bdg_progress: "Postęp budżetu",
    bdg_manage: "Zarządzaj Budżetami",
    bdg_spent: "Wydane",
    bdg_left: "zostało",
    bdg_over: "ponad budżet",
    bdg_hint:
      "Ustaw limity miesięczne dla każdej kategorii. Ustaw 0, aby usunąć budżet.",

    // Settlements & balances
    set_owes_title: "Długi / Rozliczenia",
    set_current_balances: "Bieżące salda",
    set_is_owed: "Do odebrania",
    set_owes: "Musi oddać",
    set_settled: "Rozliczony",
    set_suggested: "Sugerowane Rozliczenia",
    set_settle: "Rozlicz",
    set_settlement_category: "Rozliczenie",
    set_no_settlements: "Wszystkie rozliczenia uregulowane!",
    set_user_spendings: "Wydatki Użytkowników",
    set_owes_verb: "wisi",
    set_paid: "zapłacił(a)",
    set_record_prompt: "Zapisz rozliczenie:",
    set_expense_balance: "Saldo Wydatków",
    set_no_balances: "Brak sald do wyświetlenia.",

    // Settings
    set_integration_details: "Szczegóły Integracji",
    set_user: "Użytkownik",
    set_default_currency: "Domyślna Waluta",
    set_custom_categories: "Własne Kategorie",
    set_categories_hint:
      "Dodaj własne kategorie obok domyślnych. Kategorie domyślne nie mogą być usunięte.",
    set_new_category_placeholder: "Nazwa nowej kategorii...",
    set_default_badge: "Domyślna",

    // Card-only
    card_loading: "Ładowanie...",
    card_quick_add: "Szybkie Dodawanie Wydatku",

    // Notifications
    notify_error_server: "Błąd komunikacji z serwerem",
    notify_invalid_amount: "Wpisz poprawną kwotę",
    notify_expense_added: "Dodano wydatek!",
    notify_expense_updated: "Zaktualizowano wydatek!",
    notify_expense_deleted: "Usunięto wydatek",
    notify_budget_saved: "Zapisano budżet!",
    notify_category_added: "Dodano kategorię!",
    notify_category_removed: "Usunięto kategorię",
    notify_settlement_ok: "Pomyślnie zapisano rozliczenie długu",
    notify_settlement_failed: "Nie udało się zapisać rozliczenia długu",
    notify_add_failed: "Nie udało się dodać wydatku",

    // Loading
    loading_expenses: "Ładowanie wydatków...",

    // Plurals
    noun_expense_sg: "wydatek",
    noun_expense_pl: "wydatki",

    // Default category names
    ...CATEGORY_KEYS,
    cat_food: "Żywność",
    cat_transport: "Transport",
    cat_utilities: "Opłaty",
    cat_entertainment: "Rozrywka",
    cat_health: "Zdrowie",
    cat_shopping: "Zakupy",
    cat_housing: "Mieszkanie",
    cat_other: "Inne",
  },
};

/**
 * Map a category display name to its translation key.
 * Custom (non-default) categories fall through to their raw name so the
 * English version is shown until someone adds a translation.
 */
export const categoryKey = (name) =>
  CATEGORY_KEYS[name] ?? (DEFAULT_CATEGORIES.includes(name) ? name : name);

/**
 * Build a translation function bound to a `hass` instance.
 * Re-build whenever `hass` changes so a language switch takes effect.
 */
export const makeT = (hass) => {
  const lang = (
    hass?.locale?.language ||
    hass?.language ||
    "en"
  )
    .split("-")[0];
  const table = MESSAGES[lang] || {};
  return (key) => table[key] ?? key;
};
