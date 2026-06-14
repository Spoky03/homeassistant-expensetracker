"""The Expense Tracker integration."""

from __future__ import annotations

import logging
from pathlib import Path
import time

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

import voluptuous as vol
from homeassistant.helpers import config_validation as cv

from .const import (
    CONF_CURRENCY,
    DEFAULT_CURRENCY,
    DOMAIN,
    EVENT_EXPENSE_CHANGED,
    PLATFORMS,
)
from .store import ExpenseTrackerStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_URL_BASE = f"/api/{DOMAIN}/static"

# Cache buster generated at startup time
STARTUP_TIME = int(time.time())


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Expense Tracker from a config entry."""
    currency = entry.data.get(CONF_CURRENCY, DEFAULT_CURRENCY)

    # Initialize store
    store = ExpenseTrackerStore(hass, currency)
    await store.async_load()

    # Store in hass.data
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN]["store"] = store
    hass.data[DOMAIN]["entry"] = entry

    # Register WebSocket commands
    async_register_websocket_commands(hass)

    # Register frontend panel
    await _async_register_panel(hass)

    # Forward setup to sensor platform
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register services
    async_register_services(hass)

    _LOGGER.info("Expense Tracker integration loaded successfully")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        hass.data.pop(DOMAIN, None)
        # Unregister services
        hass.services.async_remove(DOMAIN, "add_expense")
        hass.services.async_remove(DOMAIN, "settle_debt")

    return unload_ok


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the custom frontend panel."""
    # Serve static frontend files
    frontend_dir = Path(__file__).parent / "frontend"

    await hass.http.async_register_static_paths(
        [
            StaticPathConfig(
                url_path=FRONTEND_URL_BASE,
                path=str(frontend_dir),
                cache_headers=False,
            )
        ]
    )

    # Register sidebar panel
    async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="Expenses",
        sidebar_icon="mdi:currency-usd",
        frontend_url_path="expense-tracker",
        config={
            "_panel_custom": {
                "name": "expense-tracker-panel",
                "module_url": f"{FRONTEND_URL_BASE}/expense-tracker-panel.js?v={STARTUP_TIME}",
            }
        },
        require_admin=False,
    )


def async_register_services(hass: HomeAssistant) -> None:
    """Register custom services for Expense Tracker."""

    add_expense_schema = vol.Schema({
        vol.Required("amount"): vol.Coerce(float),
        vol.Required("category"): cv.string,
        vol.Optional("user_id"): cv.string,
        vol.Optional("description", default=""): cv.string,
        vol.Optional("is_shared", default=True): cv.boolean,
    })

    settle_debt_schema = vol.Schema({
        vol.Required("from_user_id"): cv.string,
        vol.Required("to_user_id"): cv.string,
        vol.Required("amount"): vol.Coerce(float),
    })

    async def async_handle_add_expense(call) -> None:
        """Handle add_expense service call."""
        store = hass.data[DOMAIN]["store"]
        amount = call.data["amount"]
        category = call.data["category"]
        description = call.data.get("description", "")
        is_shared = call.data.get("is_shared", True)

        users = store.data.get("users", {})
        if "user_id" in call.data:
            user_id = call.data["user_id"]
        elif users:
            user_id = list(users.keys())[0]
        else:
            user_id = "system"

        user_name = store.get_user_name(user_id)
        if user_name == "Unknown":
            user_name = "Automation System"

        await store.async_add_expense(
            user_id=user_id,
            user_name=user_name,
            amount=amount,
            category=category,
            description=description,
            is_shared=is_shared,
        )
        hass.bus.async_fire(EVENT_EXPENSE_CHANGED)

    async def async_handle_settle_debt(call) -> None:
        """Handle settle_debt service call."""
        store = hass.data[DOMAIN]["store"]
        from_uid = call.data["from_user_id"]
        to_uid = call.data["to_user_id"]
        amount = call.data["amount"]

        from_name = store.get_user_name(from_uid)
        to_name = store.get_user_name(to_uid)

        await store.async_add_expense(
            user_id=from_uid,
            user_name=from_name,
            amount=amount,
            category="Settlement",
            description=f"Debt settlement to {to_name}",
            is_shared=False,
            tags=[f"to:{to_uid}"]
        )
        hass.bus.async_fire(EVENT_EXPENSE_CHANGED)

    hass.services.async_register(
        DOMAIN, "add_expense", async_handle_add_expense, schema=add_expense_schema
    )
    hass.services.async_register(
        DOMAIN, "settle_debt", async_handle_settle_debt, schema=settle_debt_schema
    )

