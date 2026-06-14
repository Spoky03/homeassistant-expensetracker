# 💰 Expense Tracker for Home Assistant

A premium, multi-user expense tracker that runs natively inside Home Assistant as a custom integration with a dedicated sidebar panel.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz)
![HA](https://img.shields.io/badge/Home%20Assistant-2026-blue.svg)

## Features

- 🏠 **Multi-user** — Each HA user tracks their own expenses
- 📊 **Dashboard** — Monthly summary with SVG donut chart, top categories, and budget progress
- 💳 **Quick Add** — Fast expense entry with category picker, date, and shared toggle
- 📋 **Expense List** — Filterable list with edit/delete, month navigation
- 🎯 **Budgets** — Set monthly spending limits per category with visual progress bars
- 🏷️ **Custom Categories** — Add your own categories on top of 8 built-in defaults
- 👥 **Shared Expenses** — Mark expenses as shared with the household
- 📱 **Responsive** — Works on desktop and mobile HA companion app
- 🌙 **Theme-aware** — Follows HA dark/light mode automatically
- 📈 **Sensors** — Exposes monthly & daily spending as HA sensor entities

## Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Click the 3 dots → **Custom repositories**
3. Add this repository URL as **Integration**
4. Search for "Expense Tracker" → Install
5. Restart Home Assistant

### Manual

1. Copy `custom_components/expense_tracker/` to your HA `config/custom_components/` directory
2. Restart Home Assistant

## Setup

1. Go to **Settings → Devices & Services → Add Integration**
2. Search for "Expense Tracker"
3. Configure:
   - **Instance name** (e.g., "Family Expenses")
   - **Default currency** (EUR, USD, GBP, PLN, etc.)
   - **Shared tracking** enabled/disabled
4. The "Expenses" panel will appear in your sidebar

## Sensors

The integration creates the following sensors:

| Sensor | Description |
|--------|-------------|
| `sensor.expense_tracker_monthly_total` | Total household spending this month |
| `sensor.expense_tracker_{user}_monthly` | Per-user monthly spending |
| `sensor.expense_tracker_{user}_daily` | Per-user daily spending |

All sensors include attributes like `top_category`, `expense_count`, `by_category`, and `budgets`.

## Data Storage

Expenses are stored locally in `.storage/expense_tracker.data` using Home Assistant's built-in `Store` helper. No cloud services, no external APIs.

## Architecture

```
custom_components/expense_tracker/
├── __init__.py              # Integration setup & panel registration
├── manifest.json            # HA integration manifest
├── const.py                 # Constants & defaults
├── config_flow.py           # UI-based configuration flow
├── store.py                 # Data persistence (JSON storage)
├── websocket_api.py         # WebSocket command handlers (11 commands)
├── sensor.py                # Sensor entities
├── strings.json             # Localization
├── translations/en.json     # English translations
└── frontend/
    └── expense-tracker-panel.js  # LitElement panel (all views)
```

## License

MIT
