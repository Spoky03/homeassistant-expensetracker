"""Config flow for the Expense Tracker integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult

from .const import (
    CONF_CURRENCY,
    CONF_INSTANCE_NAME,
    CONF_SHARED_TRACKING,
    CURRENCIES,
    DEFAULT_CURRENCY,
    DEFAULT_INSTANCE_NAME,
    DOMAIN,
)


class ExpenseTrackerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Expense Tracker."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Handle the initial step."""
        # Only allow a single instance
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(
                title=user_input.get(CONF_INSTANCE_NAME, DEFAULT_INSTANCE_NAME),
                data=user_input,
            )

        currency_options = {code: f"{code} ({symbol})" for code, symbol in CURRENCIES.items()}

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_INSTANCE_NAME, default=DEFAULT_INSTANCE_NAME
                    ): str,
                    vol.Required(
                        CONF_CURRENCY, default=DEFAULT_CURRENCY
                    ): vol.In(currency_options),
                    vol.Required(
                        CONF_SHARED_TRACKING, default=True
                    ): bool,
                }
            ),
        )
