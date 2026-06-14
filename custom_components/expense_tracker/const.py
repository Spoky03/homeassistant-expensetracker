"""Constants for the Expense Tracker integration."""

from __future__ import annotations

DOMAIN = "expense_tracker"
STORAGE_KEY = "expense_tracker.data"
STORAGE_VERSION = 1

CONF_CURRENCY = "currency"
CONF_INSTANCE_NAME = "instance_name"
CONF_SHARED_TRACKING = "shared_tracking"

DEFAULT_CURRENCY = "EUR"
DEFAULT_INSTANCE_NAME = "Family Expenses"

# Supported currencies
CURRENCIES: dict[str, str] = {
    "EUR": "€",
    "USD": "$",
    "GBP": "£",
    "PLN": "zł",
    "CHF": "CHF",
    "SEK": "kr",
    "NOK": "kr",
    "DKK": "kr",
    "CZK": "Kč",
    "HUF": "Ft",
    "JPY": "¥",
    "CNY": "¥",
    "CAD": "CA$",
    "AUD": "A$",
    "BRL": "R$",
    "INR": "₹",
}

# Default expense categories
DEFAULT_CATEGORIES: list[str] = [
    "Food",
    "Transport",
    "Utilities",
    "Entertainment",
    "Health",
    "Shopping",
    "Housing",
    "Other",
]

# Category icons (Material Design Icons)
CATEGORY_ICONS: dict[str, str] = {
    "Food": "mdi:food",
    "Transport": "mdi:car",
    "Utilities": "mdi:flash",
    "Entertainment": "mdi:movie-open",
    "Health": "mdi:heart-pulse",
    "Shopping": "mdi:cart",
    "Housing": "mdi:home",
    "Other": "mdi:dots-horizontal-circle",
}

# Category colors (HSL-based for premium look)
CATEGORY_COLORS: dict[str, str] = {
    "Food": "#f97316",
    "Transport": "#3b82f6",
    "Utilities": "#eab308",
    "Entertainment": "#a855f7",
    "Health": "#ef4444",
    "Shopping": "#ec4899",
    "Housing": "#06b6d4",
    "Other": "#6b7280",
}

# Event fired when expenses change
EVENT_EXPENSE_CHANGED = f"{DOMAIN}_expense_changed"

# Platforms
PLATFORMS: list[str] = ["sensor"]
