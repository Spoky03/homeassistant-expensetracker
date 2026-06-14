"""WebSocket API handlers for the Expense Tracker integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, EVENT_EXPENSE_CHANGED


def async_register_websocket_commands(hass: HomeAssistant) -> None:
    """Register all WebSocket commands."""
    websocket_api.async_register_command(hass, ws_list_expenses)
    websocket_api.async_register_command(hass, ws_add_expense)
    websocket_api.async_register_command(hass, ws_update_expense)
    websocket_api.async_register_command(hass, ws_delete_expense)
    websocket_api.async_register_command(hass, ws_get_summary)
    websocket_api.async_register_command(hass, ws_list_categories)
    websocket_api.async_register_command(hass, ws_add_category)
    websocket_api.async_register_command(hass, ws_remove_category)
    websocket_api.async_register_command(hass, ws_set_budget)
    websocket_api.async_register_command(hass, ws_get_budgets)
    websocket_api.async_register_command(hass, ws_get_config)


def _get_store(hass: HomeAssistant) -> Any:
    """Get the expense tracker store."""
    return hass.data[DOMAIN]["store"]


def _fire_change_event(hass: HomeAssistant) -> None:
    """Fire an event when expenses change."""
    hass.bus.async_fire(EVENT_EXPENSE_CHANGED)


# ──────────────────────────────────────────────
# Expenses
# ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/expenses/list",
        vol.Optional("month"): str,
        vol.Optional("category"): str,
        vol.Optional("user_id"): str,
        vol.Optional("include_shared", default=True): bool,
        vol.Optional("limit"): int,
        vol.Optional("offset", default=0): int,
    }
)
@callback
def ws_list_expenses(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle listing expenses."""
    store = _get_store(hass)
    user_id = msg.get("user_id") or connection.user.id

    expenses = store.get_expenses(
        user_id=user_id,
        month=msg.get("month"),
        category=msg.get("category"),
        include_shared=msg.get("include_shared", True),
        limit=msg.get("limit"),
        offset=msg.get("offset", 0),
    )

    connection.send_result(msg["id"], {"expenses": expenses})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/expenses/add",
        vol.Required("amount"): vol.Coerce(float),
        vol.Required("category"): str,
        vol.Optional("description", default=""): str,
        vol.Optional("date"): str,
        vol.Optional("is_shared", default=False): bool,
        vol.Optional("tags", default=[]): [str],
    }
)
@websocket_api.async_response
async def ws_add_expense(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle adding an expense."""
    store = _get_store(hass)
    user = connection.user

    expense = await store.async_add_expense(
        user_id=user.id,
        user_name=user.name or "Unknown",
        amount=msg["amount"],
        category=msg["category"],
        description=msg.get("description", ""),
        date=msg.get("date"),
        is_shared=msg.get("is_shared", False),
        tags=msg.get("tags", []),
    )

    _fire_change_event(hass)
    connection.send_result(msg["id"], {"expense": expense})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/expenses/update",
        vol.Required("expense_id"): str,
        vol.Optional("amount"): vol.Coerce(float),
        vol.Optional("category"): str,
        vol.Optional("description"): str,
        vol.Optional("date"): str,
        vol.Optional("is_shared"): bool,
        vol.Optional("tags"): [str],
    }
)
@websocket_api.async_response
async def ws_update_expense(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle updating an expense."""
    store = _get_store(hass)
    user = connection.user

    updates = {
        k: v
        for k, v in msg.items()
        if k not in ("id", "type", "expense_id") and v is not None
    }

    expense = await store.async_update_expense(
        user_id=user.id,
        expense_id=msg["expense_id"],
        updates=updates,
    )

    if expense is None:
        connection.send_error(
            msg["id"], "not_found", "Expense not found or access denied."
        )
        return

    _fire_change_event(hass)
    connection.send_result(msg["id"], {"expense": expense})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/expenses/delete",
        vol.Required("expense_id"): str,
    }
)
@websocket_api.async_response
async def ws_delete_expense(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle deleting an expense."""
    store = _get_store(hass)
    user = connection.user

    deleted = await store.async_delete_expense(
        user_id=user.id,
        expense_id=msg["expense_id"],
    )

    if not deleted:
        connection.send_error(
            msg["id"], "not_found", "Expense not found or access denied."
        )
        return

    _fire_change_event(hass)
    connection.send_result(msg["id"], {"success": True})


# ──────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/summary",
        vol.Optional("month"): str,
        vol.Optional("user_id"): str,
    }
)
@callback
def ws_get_summary(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle getting monthly summary."""
    store = _get_store(hass)
    user_id = msg.get("user_id") or connection.user.id

    summary = store.get_monthly_summary(user_id=user_id, month=msg.get("month"))
    connection.send_result(msg["id"], summary)


# ──────────────────────────────────────────────
# Categories
# ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/categories/list",
    }
)
@callback
def ws_list_categories(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle listing categories."""
    store = _get_store(hass)
    user = connection.user
    categories = store.get_user_categories(user.id)
    connection.send_result(msg["id"], {"categories": categories})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/categories/add",
        vol.Required("name"): str,
    }
)
@websocket_api.async_response
async def ws_add_category(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle adding a custom category."""
    store = _get_store(hass)
    user = connection.user

    added = await store.async_add_category(
        user_id=user.id,
        user_name=user.name or "Unknown",
        category_name=msg["name"],
    )

    if not added:
        connection.send_error(
            msg["id"], "already_exists", "Category already exists."
        )
        return

    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/categories/remove",
        vol.Required("name"): str,
    }
)
@websocket_api.async_response
async def ws_remove_category(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle removing a custom category."""
    store = _get_store(hass)
    user = connection.user

    removed = await store.async_remove_category(
        user_id=user.id,
        category_name=msg["name"],
    )

    if not removed:
        connection.send_error(
            msg["id"],
            "not_found",
            "Category not found or is a default category.",
        )
        return

    connection.send_result(msg["id"], {"success": True})


# ──────────────────────────────────────────────
# Budgets
# ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/budgets/set",
        vol.Required("category"): str,
        vol.Required("amount"): vol.Coerce(float),
    }
)
@websocket_api.async_response
async def ws_set_budget(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle setting a budget."""
    store = _get_store(hass)
    user = connection.user

    await store.async_set_budget(
        user_id=user.id,
        user_name=user.name or "Unknown",
        category=msg["category"],
        amount=msg["amount"],
    )

    _fire_change_event(hass)
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/budgets/get",
    }
)
@callback
def ws_get_budgets(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle getting budgets."""
    store = _get_store(hass)
    user = connection.user
    budgets = store.get_budgets(user.id)
    connection.send_result(msg["id"], {"budgets": budgets})


# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────


@websocket_api.websocket_command(
    {
        vol.Required("type"): "expense_tracker/config",
    }
)
@callback
def ws_get_config(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return integration config (currency, etc.)."""
    store = _get_store(hass)
    connection.send_result(
        msg["id"],
        {
            "currency": store.currency,
            "currency_symbol": _get_currency_symbol(store.currency),
            "user_id": connection.user.id,
            "user_name": connection.user.name or "Unknown",
        },
    )


def _get_currency_symbol(code: str) -> str:
    """Get currency symbol from code."""
    from .const import CURRENCIES
    return CURRENCIES.get(code, code)
