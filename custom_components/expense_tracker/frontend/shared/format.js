/**
 * Pure formatting helpers — currency, month navigation, month names.
 * No `this` context, no DOM, easy to unit-test.
 */

export const formatCurrency = (amount, symbol = "€") =>
  `${symbol}${Number(amount).toFixed(2)}`;

export const getCurrentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const shiftMonth = (monthStr, delta) => {
  const [y, m] = monthStr.split("-");
  // For delta=-1 we want the previous month, so use month-1 (zero-indexed)
  // and let Date handle year wraparound.
  const d = new Date(Number(y), Number(m) - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const getPreviousMonth = (m) => shiftMonth(m, -1);
export const getNextMonth = (m) => shiftMonth(m, +1);

export const getMonthName = (monthStr, locale = "default") => {
  const [y, m] = monthStr.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleString(locale, {
    month: "long",
    year: "numeric",
  });
};
