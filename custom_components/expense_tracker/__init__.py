"""The Expense Tracker integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_CURRENCY,
    DEFAULT_CURRENCY,
    DOMAIN,
    PLATFORMS,
)
from .store import ExpenseTrackerStore
from .websocket_api import async_register_websocket_commands

_LOGGER = logging.getLogger(__name__)

FRONTEND_URL_BASE = f"/api/{DOMAIN}/static"


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

    _LOGGER.info("Expense Tracker integration loaded successfully")
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        hass.data.pop(DOMAIN, None)

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
                "module_url": f"{FRONTEND_URL_BASE}/expense-tracker-panel.js",
            }
        },
        require_admin=False,
    )
