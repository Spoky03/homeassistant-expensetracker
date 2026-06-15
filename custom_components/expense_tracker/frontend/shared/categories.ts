/**
 * Single source of truth for default expense categories, their MDI icons and
 * brand colors. The previous codebase duplicated this list in three places
 * (CATEGORY_COLORS keys, CATEGORY_ICONS keys, an inline `.includes(cat)` check
 * in the settings view) — keep it in sync through this file only.
 */

export const DEFAULT_CATEGORIES: readonly string[] = [
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Housing",
  "Other",
] as const;

export type CategoryName = (typeof DEFAULT_CATEGORIES)[number];

const COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Utilities: "#eab308",
  Entertainment: "#a855f7",
  Health: "#ef4444",
  Shopping: "#ec4899",
  Housing: "#06b6d4",
  Other: "#6b7280",
};

const ICONS: Record<string, string> = {
  Food: "mdi:food",
  Transport: "mdi:car",
  Utilities: "mdi:flash",
  Entertainment: "mdi:movie-open",
  Health: "mdi:heart-pulse",
  Shopping: "mdi:cart",
  Housing: "mdi:home",
  Other: "mdi:dots-horizontal-circle",
};

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

export const getCategoryColor = (cat: string): string =>
  COLORS[cat] ?? `hsl(${hash(cat) % 360}, 65%, 55%)`;

export const getCategoryIcon = (cat: string): string =>
  ICONS[cat] ?? "mdi:tag";

export const isDefaultCategory = (cat: string): boolean =>
  DEFAULT_CATEGORIES.includes(cat);
