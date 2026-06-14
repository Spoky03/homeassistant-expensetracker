"""Sensor platform for the Expense Tracker integration."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from homeassistant.components.sensor import (
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import CURRENCIES, DOMAIN, EVENT_EXPENSE_CHANGED
from .store import ExpenseTrackerStore

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Expense Tracker sensors."""
    store: ExpenseTrackerStore = hass.data[DOMAIN]["store"]

    # Create the household total sensor
    entities: list[SensorEntity] = [
        ExpenseMonthlyTotalSensor(store, entry),
    ]

    # Create per-user sensors for existing users
    for user_id in store.get_all_user_ids():
        user_name = store.get_user_name(user_id)
        entities.append(ExpenseUserMonthlySensor(store, entry, user_id, user_name))
        entities.append(ExpenseUserDailySensor(store, entry, user_id, user_name))

    async_add_entities(entities, True)

    # Listen for expense changes to create sensors for new users
    @callback
    def _handle_expense_change(_event: Any) -> None:
        """Handle expense change events — add sensors for new users."""
        new_entities: list[SensorEntity] = []
        existing_user_ids = {
            e.user_id
            for e in entities
            if isinstance(e, (ExpenseUserMonthlySensor, ExpenseUserDailySensor))
        }

        for user_id in store.get_all_user_ids():
            if user_id not in existing_user_ids:
                user_name = store.get_user_name(user_id)
                monthly = ExpenseUserMonthlySensor(store, entry, user_id, user_name)
                daily = ExpenseUserDailySensor(store, entry, user_id, user_name)
                new_entities.extend([monthly, daily])
                entities.extend([monthly, daily])

        if new_entities:
            async_add_entities(new_entities, True)

        # Update all existing entities
        for entity in entities:
            if hasattr(entity, "async_schedule_update_ha_state"):
                entity.async_schedule_update_ha_state(True)

    hass.bus.async_listen(EVENT_EXPENSE_CHANGED, _handle_expense_change)


class ExpenseMonthlyTotalSensor(SensorEntity):
    """Sensor showing total household monthly spending."""

    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(self, store: ExpenseTrackerStore, entry: ConfigEntry) -> None:
        """Initialize the sensor."""
        self._store = store
        self._attr_unique_id = f"{entry.entry_id}_monthly_total"
        self._attr_name = "Monthly Total"
        self._attr_icon = "mdi:cash-multiple"
        self._attr_native_unit_of_measurement = store.currency
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Expense Tracker",
            "manufacturer": "Custom Integration",
            "model": "Expense Tracker",
            "sw_version": "1.0.0",
        }

    async def async_update(self) -> None:
        """Update the sensor."""
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        summary = self._store.get_monthly_summary(user_id=None, month=month)
        self._attr_native_value = summary["total"]
        self._attr_extra_state_attributes = {
            "month": month,
            "expense_count": summary["expense_count"],
            "top_category": summary.get("top_category"),
            "by_category": summary.get("by_category", {}),
            "currency_symbol": CURRENCIES.get(self._store.currency, self._store.currency),
        }


class ExpenseUserMonthlySensor(SensorEntity):
    """Sensor showing a user's monthly spending."""

    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(
        self,
        store: ExpenseTrackerStore,
        entry: ConfigEntry,
        user_id: str,
        user_name: str,
    ) -> None:
        """Initialize the sensor."""
        self._store = store
        self.user_id = user_id
        self._user_name = user_name
        self._attr_unique_id = f"{entry.entry_id}_{user_id}_monthly"
        self._attr_name = f"{user_name} Monthly"
        self._attr_icon = "mdi:account-cash"
        self._attr_native_unit_of_measurement = store.currency
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Expense Tracker",
            "manufacturer": "Custom Integration",
            "model": "Expense Tracker",
            "sw_version": "1.0.0",
        }

    async def async_update(self) -> None:
        """Update the sensor."""
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        summary = self._store.get_monthly_summary(user_id=self.user_id, month=month)
        self._attr_native_value = summary["total"]
        self._attr_extra_state_attributes = {
            "month": month,
            "user_name": self._user_name,
            "expense_count": summary["expense_count"],
            "top_category": summary.get("top_category"),
            "by_category": summary.get("by_category", {}),
            "budgets": summary.get("budgets", {}),
        }


class ExpenseUserDailySensor(SensorEntity):
    """Sensor showing a user's daily spending."""

    _attr_has_entity_name = True
    _attr_state_class = SensorStateClass.TOTAL

    def __init__(
        self,
        store: ExpenseTrackerStore,
        entry: ConfigEntry,
        user_id: str,
        user_name: str,
    ) -> None:
        """Initialize the sensor."""
        self._store = store
        self.user_id = user_id
        self._user_name = user_name
        self._attr_unique_id = f"{entry.entry_id}_{user_id}_daily"
        self._attr_name = f"{user_name} Daily"
        self._attr_icon = "mdi:calendar-today"
        self._attr_native_unit_of_measurement = store.currency
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Expense Tracker",
            "manufacturer": "Custom Integration",
            "model": "Expense Tracker",
            "sw_version": "1.0.0",
        }

    async def async_update(self) -> None:
        """Update the sensor."""
        daily_total = self._store.get_daily_total(user_id=self.user_id)
        self._attr_native_value = daily_total
        self._attr_extra_state_attributes = {
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "user_name": self._user_name,
        }
