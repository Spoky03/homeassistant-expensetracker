"""Data storage manager for the Expense Tracker integration."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import (
    DEFAULT_CATEGORIES,
    STORAGE_KEY,
    STORAGE_VERSION,
)


class ExpenseTrackerStore:
    """Manage expense tracker data persistence."""

    def __init__(self, hass: HomeAssistant, currency: str) -> None:
        """Initialize the store."""
        self.hass = hass
        self._store = Store[dict[str, Any]](hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = {}
        self._default_currency = currency

    async def async_load(self) -> None:
        """Load data from disk."""
        stored = await self._store.async_load()
        if stored:
            self._data = stored
        else:
            self._data = {
                "users": {},
                "expenses": [],
                "settings": {
                    "currency": self._default_currency,
                    "categories": list(DEFAULT_CATEGORIES),
                },
            }
            await self._async_save()

    @property
    def data(self) -> dict[str, Any]:
        """Return current data."""
        return self._data

    @property
    def currency(self) -> str:
        """Return the default currency."""
        return self._data.get("settings", {}).get("currency", self._default_currency)

    @property
    def global_categories(self) -> list[str]:
        """Return the global category list."""
        return self._data.get("settings", {}).get("categories", list(DEFAULT_CATEGORIES))

    # ──────────────────────────────────────────────
    # User management
    # ──────────────────────────────────────────────

    def _ensure_user(self, user_id: str, user_name: str = "Unknown") -> dict[str, Any]:
        """Ensure a user entry exists in the data store."""
        if "users" not in self._data:
            self._data["users"] = {}
        if user_id not in self._data["users"]:
            self._data["users"][user_id] = {
                "name": user_name,
                "custom_categories": [],
                "budgets": {},
            }
        return self._data["users"][user_id]

    def get_user_categories(self, user_id: str) -> list[str]:
        """Get all categories available to a user (global + custom)."""
        user_data = self._data.get("users", {}).get(user_id, {})
        custom = user_data.get("custom_categories", [])
        return list(dict.fromkeys(self.global_categories + custom))

    # ──────────────────────────────────────────────
    # Expense CRUD
    # ──────────────────────────────────────────────

    async def async_add_expense(
        self,
        user_id: str,
        user_name: str,
        amount: float,
        category: str,
        description: str = "",
        date: str | None = None,
        is_shared: bool = False,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        """Add a new expense."""
        self._ensure_user(user_id, user_name)

        now = datetime.now(timezone.utc)
        expense: dict[str, Any] = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_name": user_name,
            "amount": round(float(amount), 2),
            "currency": self.currency,
            "category": category,
            "description": description,
            "date": date or now.strftime("%Y-%m-%d"),
            "created_at": now.isoformat(),
            "is_shared": is_shared,
            "tags": tags or [],
        }

        self._data.setdefault("expenses", []).append(expense)
        await self._async_save()
        return expense

    async def async_update_expense(
        self,
        user_id: str,
        expense_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any] | None:
        """Update an existing expense. Returns updated expense or None."""
        for expense in self._data.get("expenses", []):
            if expense["id"] == expense_id and expense["user_id"] == user_id:
                allowed_fields = {
                    "amount", "category", "description", "date", "is_shared", "tags"
                }
                for key, value in updates.items():
                    if key in allowed_fields:
                        if key == "amount":
                            expense[key] = round(float(value), 2)
                        else:
                            expense[key] = value
                expense["updated_at"] = datetime.now(timezone.utc).isoformat()
                await self._async_save()
                return expense
        return None

    async def async_delete_expense(self, user_id: str, expense_id: str) -> bool:
        """Delete an expense. Returns True if deleted."""
        expenses = self._data.get("expenses", [])
        for i, expense in enumerate(expenses):
            if expense["id"] == expense_id and expense["user_id"] == user_id:
                expenses.pop(i)
                await self._async_save()
                return True
        return False

    def get_expenses(
        self,
        user_id: str | None = None,
        month: str | None = None,
        category: str | None = None,
        include_shared: bool = True,
        limit: int | None = None,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        """Get filtered expenses."""
        expenses = self._data.get("expenses", [])
        result: list[dict[str, Any]] = []

        for expense in expenses:
            # Filter by user
            if user_id:
                if expense["user_id"] != user_id:
                    if not (include_shared and expense.get("is_shared")):
                        continue

            # Filter by month (format: "2026-06")
            if month and not expense.get("date", "").startswith(month):
                continue

            # Filter by category
            if category and expense.get("category") != category:
                continue

            result.append(expense)

        # Sort by date descending, then by created_at descending
        result.sort(
            key=lambda e: (e.get("date", ""), e.get("created_at", "")),
            reverse=True,
        )

        # Pagination
        if offset:
            result = result[offset:]
        if limit:
            result = result[:limit]

        return result

    # ──────────────────────────────────────────────
    # Summary / analytics
    # ──────────────────────────────────────────────

    def get_monthly_summary(
        self, user_id: str | None = None, month: str | None = None
    ) -> dict[str, Any]:
        """Get a monthly spending summary."""
        if not month:
            month = datetime.now(timezone.utc).strftime("%Y-%m")

        expenses = self.get_expenses(
            user_id=user_id, month=month, include_shared=True
        )

        total = 0.0
        by_category: dict[str, float] = {}
        by_user: dict[str, dict[str, Any]] = {}
        expense_count = 0

        for expense in expenses:
            amount = expense.get("amount", 0.0)
            cat = expense.get("category", "Other")
            uid = expense.get("user_id", "unknown")
            uname = expense.get("user_name", "Unknown")

            total += amount
            by_category[cat] = by_category.get(cat, 0.0) + amount
            expense_count += 1

            if uid not in by_user:
                by_user[uid] = {"name": uname, "total": 0.0, "count": 0}
            by_user[uid]["total"] += amount
            by_user[uid]["count"] += 1

        # Round all values
        total = round(total, 2)
        by_category = {k: round(v, 2) for k, v in by_category.items()}
        for uid_data in by_user.values():
            uid_data["total"] = round(uid_data["total"], 2)

        # Get top category
        top_category = max(by_category, key=by_category.get) if by_category else None

        # Budget info
        budgets: dict[str, Any] = {}
        if user_id:
            user_data = self._data.get("users", {}).get(user_id, {})
            raw_budgets = user_data.get("budgets", {})
            for cat, budget_amount in raw_budgets.items():
                spent = by_category.get(cat, 0.0)
                budgets[cat] = {
                    "budget": budget_amount,
                    "spent": spent,
                    "remaining": round(budget_amount - spent, 2),
                    "percentage": round((spent / budget_amount) * 100, 1) if budget_amount > 0 else 0,
                }

        return {
            "month": month,
            "total": total,
            "currency": self.currency,
            "expense_count": expense_count,
            "by_category": by_category,
            "by_user": by_user,
            "top_category": top_category,
            "budgets": budgets,
        }

    def get_daily_total(self, user_id: str | None = None) -> float:
        """Get today's total spending."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        expenses = self.get_expenses(user_id=user_id)
        return round(
            sum(e.get("amount", 0.0) for e in expenses if e.get("date") == today),
            2,
        )

    # ──────────────────────────────────────────────
    # Budgets
    # ──────────────────────────────────────────────

    async def async_set_budget(
        self, user_id: str, user_name: str, category: str, amount: float
    ) -> None:
        """Set a monthly budget for a category."""
        user = self._ensure_user(user_id, user_name)
        if amount <= 0:
            user["budgets"].pop(category, None)
        else:
            user["budgets"][category] = round(float(amount), 2)
        await self._async_save()

    def get_budgets(self, user_id: str) -> dict[str, float]:
        """Get all budgets for a user."""
        return self._data.get("users", {}).get(user_id, {}).get("budgets", {})

    # ──────────────────────────────────────────────
    # Categories
    # ──────────────────────────────────────────────

    async def async_add_category(
        self, user_id: str, user_name: str, category_name: str
    ) -> bool:
        """Add a custom category for a user. Returns True if added."""
        user = self._ensure_user(user_id, user_name)
        all_cats = self.get_user_categories(user_id)
        if category_name in all_cats:
            return False
        user["custom_categories"].append(category_name)
        await self._async_save()
        return True

    async def async_remove_category(
        self, user_id: str, category_name: str
    ) -> bool:
        """Remove a custom category. Returns True if removed."""
        user_data = self._data.get("users", {}).get(user_id, {})
        custom = user_data.get("custom_categories", [])
        if category_name in custom:
            custom.remove(category_name)
            await self._async_save()
            return True
        return False

    # ──────────────────────────────────────────────
    # All users summary (for household sensors)
    # ──────────────────────────────────────────────

    def get_all_user_ids(self) -> list[str]:
        """Return all user IDs that have data."""
        return list(self._data.get("users", {}).keys())

    def get_user_name(self, user_id: str) -> str:
        """Return user display name."""
        return self._data.get("users", {}).get(user_id, {}).get("name", "Unknown")

    # ──────────────────────────────────────────────
    # Internal persistence
    # ──────────────────────────────────────────────

    async def _async_save(self) -> None:
        """Persist data to disk using delayed save for efficiency."""
        self._store.async_delay_save(self._data_to_save, 1.0)

    @callback
    def _data_to_save(self) -> dict[str, Any]:
        """Return the data to save."""
        return self._data
