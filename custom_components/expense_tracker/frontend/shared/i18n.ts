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

import type { Hass } from "../../../../types/hass.js";

const CATEGORY_KEYS: Record<string, string> = {
  Food: "cat_food",
  Transport: "cat_transport",
  Utilities: "cat_utilities",
  Entertainment: "cat_entertainment",
  Health: "cat_health",
  Shopping: "cat_shopping",
  Housing: "cat_housing",
  Other: "cat_other",
};

/**
 * Every translation key the frontend knows about. Adding a key here forces
 * every call-site to use a real key, which is the whole point of the union.
 */
export type TranslationKey =
  // Navigation
  | "nav_dashboard"
  | "nav_expenses"
  | "nav_budgets"
  | "nav_settings"
  | "app_title"
  // Common actions
  | "action_add_expense"
  | "action_add"
  | "action_add_first_expense"
  | "action_cancel"
  | "action_save"
  | "action_save_changes"
  | "action_edit"
  | "action_delete"
  | "action_remove"
  // Form
  | "form_amount"
  | "form_category"
  | "form_description"
  | "form_date"
  | "form_shared"
  | "form_shared_household"
  | "form_edit_expense"
  | "form_description_placeholder"
  // Dashboard
  | "dash_total_spent"
  | "dash_transactions"
  | "dash_top_category"
  | "dash_daily_avg"
  | "dash_category_breakdown"
  | "dash_recent_expenses"
  | "dash_no_expenses_month"
  | "dash_no_expenses_yet"
  | "dash_no_expenses_for"
  | "dash_total"
  // Budgets
  | "bdg_progress"
  | "bdg_manage"
  | "bdg_spent"
  | "bdg_left"
  | "bdg_over"
  | "bdg_hint"
  // Settlements & balances
  | "set_owes_title"
  | "set_current_balances"
  | "set_is_owed"
  | "set_owes"
  | "set_settled"
  | "set_suggested"
  | "set_settle"
  | "set_settlement_category"
  | "set_no_settlements"
  | "set_user_spendings"
  | "set_owes_verb"
  | "set_paid"
  | "set_record_prompt"
  | "set_expense_balance"
  | "set_no_balances"
  // Settings
  | "set_integration_details"
  | "set_user"
  | "set_default_currency"
  | "set_custom_categories"
  | "set_categories_hint"
  | "set_new_category_placeholder"
  | "set_default_badge"
  // Card-only
  | "card_loading"
  | "card_quick_add"
  // Notifications
  | "notify_error_server"
  | "notify_invalid_amount"
  | "notify_expense_added"
  | "notify_expense_updated"
  | "notify_expense_deleted"
  | "notify_budget_saved"
  | "notify_category_added"
  | "notify_category_removed"
  | "notify_settlement_ok"
  | "notify_settlement_failed"
  | "notify_add_failed"
  // Loading
  | "loading_expenses"
  // Plurals
  | "noun_expense_sg"
  | "noun_expense_pl"
  // Default category names
  | "cat_food"
  | "cat_transport"
  | "cat_utilities"
  | "cat_entertainment"
  | "cat_health"
  | "cat_shopping"
  | "cat_housing"
  | "cat_other";

export const MESSAGES: Record<string, Record<TranslationKey, string>> = {
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

export type TranslationFn = (key: TranslationKey) => string;

/**
 * Map a category display name to its translation key.
 * Custom (non-default) categories fall through to their raw name so the
 * English version is shown until someone adds a translation.
 */
export const categoryKey = (name: string): TranslationKey => {
  const k = CATEGORY_KEYS[name];
  if (k) return k as TranslationKey;
  return name as TranslationKey;
};

/**
 * Build a translation function bound to a `hass` instance.
 * Re-build whenever `hass` changes so a language switch takes effect.
 */
export const makeT = (hass: Hass | null | undefined): TranslationFn => {
  const lang: string =
    (
      hass?.locale?.language ||
      hass?.language ||
      "en"
    )
      .split("-")[0] ?? "en";
  // Fall back to the key itself when no translation table exists for the
  // user's language. The `?? {}` keeps the rest of the function typed.
  const table: Record<TranslationKey, string> =
    MESSAGES[lang] ?? ({} as Record<TranslationKey, string>);
  return (key) => table[key] ?? key;
};
