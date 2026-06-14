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
 *   this._notifier.show(
 *     (v) => { this._notification = v; },
 *     "expense_added",
 *     "success",
 *     this._t,
 *   );
 *   // in disconnectedCallback:
 *   this._notifier.dispose();
 */

export type NotificationType = "info" | "success" | "error";

export interface NotificationState {
  message: string;
  type: NotificationType;
}

export type NotificationSetter = (value: NotificationState | null) => void;

/**
 * The translation function the notifier needs.
 *
 * We intentionally accept the broader `string` (rather than the narrower
 * `TranslationKey` union from `i18n.js`) so this module stays decoupled
 * from the i18n type system. Callers pass `TranslationFn` because it's
 * structurally compatible.
 */
export type NotifierTranslator = (key: string) => string;

export interface Notifier {
  show(
    setter: NotificationSetter,
    key: string,
    type: NotificationType,
    t: (key: any) => string,
    durationMs?: number
  ): void;
  dispose(): void;
}

export const createNotifier = (): Notifier => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = (): void => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    show(
      setter: NotificationSetter,
      key: string,
      type: NotificationType = "info",
      t: (key: any) => string,
      durationMs = 3000
    ) {
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
