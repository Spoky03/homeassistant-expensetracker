/**
 * Toast notification factory.
 *
 * Replaces the ad-hoc `_notification` state + raw `setTimeout` pattern in
 * the panel, which had two bugs:
 *   - the timer could fire after the element was unmounted (no cleanup), and
 *   - `_saveBudget` showed "Budget saved!" even when the backend rejected.
 *
 * Usage:
 *   this._notifier = createNotifier();
 *   this._notifier.show((v) => { this._notification = v; }, "expense_added", "success", this._t);
 *   // in disconnectedCallback:
 *   this._notifier.dispose();
 */

export const createNotifier = () => {
  let timer = null;

  const clear = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    /**
     * Show a localised toast.
     * @param {(v: object|null) => void} setter - updates the reactive prop
     * @param {string} key - translation key
     * @param {"info"|"success"|"error"} type
     * @param {(k: string) => string} t - translation function
     * @param {number} durationMs - hide after this many ms
     */
    show(setter, key, type = "info", t, durationMs = 3000) {
      clear();
      setter({ message: t(key), type });
      timer = setTimeout(() => {
        setter(null);
        timer = null;
      }, durationMs);
    },
    dispose: clear,
  };
};
