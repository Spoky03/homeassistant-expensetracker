/**
 * Styles for the expense tracker panel.
 *
 * Extracted from the monolithic panel file so the rendering code and the
 * style sheet can be edited independently. The literal content of the
 * template is unchanged.
 */

import { css, type CSSResult } from "./lit.js";

export const panelStyles: CSSResult = css`
      :host {
        display: block;
        height: 100%;
        --panel-bg: var(--primary-background-color, #0f0f23);
        --card-bg: var(--card-background-color, #1a1a2e);
        --text-primary: var(--primary-text-color, #e2e8f0);
        --text-secondary: var(--secondary-text-color, #94a3b8);
        --accent: var(--primary-color, #6366f1);
        --accent-hover: var(--light-primary-color, #818cf8);
        --border: var(--divider-color, rgba(255,255,255,0.08));
        --success: #22c55e;
        --danger: #ef4444;
        --warning: #f59e0b;
        --radius: 16px;
        --radius-sm: 10px;
        --shadow: 0 4px 24px rgba(0,0,0,0.25);
        font-family: var(--paper-font-body1_-_font-family, "Inter", "Segoe UI", sans-serif);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      .panel-root {
        display: flex;
        height: 100%;
        background: var(--panel-bg);
        color: var(--text-primary);
      }

      /* ─── Navigation ─── */
      .panel-nav {
        width: 240px;
        min-height: 100%;
        background: var(--card-bg);
        border-right: 1px solid var(--border);
        display: flex;
        flex-direction: column;
        padding: 20px 12px;
        gap: 8px;
      }

      .nav-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px 20px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 8px;
      }

      .nav-header ha-icon {
        color: var(--accent);
        --mdc-icon-size: 28px;
      }

      .nav-title {
        font-size: 17px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .nav-items {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }

      .nav-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border: none;
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .nav-btn:hover {
        background: var(--border);
        color: var(--text-primary);
      }

      .nav-btn.active {
        background: var(--accent);
        color: #fff;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
      }

      .nav-btn ha-icon {
        --mdc-icon-size: 20px;
      }

      .fab {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--primary-color);
        color: #fff;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.25s ease;
        font-family: inherit;
        margin-top: 8px;
      }

      .fab:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      .fab ha-icon { --mdc-icon-size: 20px; }

      /* ─── Main Content ─── */
      .panel-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px 32px;
        max-height: 100vh;
      }

      .view-container {
        max-width: 960px;
        margin: 0 auto;
      }

      .view-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
      }

      .view-header h1 {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .month-nav {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--card-bg);
        padding: 4px 8px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
      }

      .month-label {
        font-size: 14px;
        font-weight: 600;
        min-width: 140px;
        text-align: center;
      }

      .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .icon-btn:hover {
        background: var(--border);
        color: var(--text-primary);
      }

      .icon-btn ha-icon { --mdc-icon-size: 20px; }

      /* ─── Glass Cards ─── */
      .glass-card {
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 24px;
        margin-bottom: 20px;
        backdrop-filter: blur(12px);
        box-shadow: var(--shadow);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      .glass-card:hover {
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      }

      .glass-card h2 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 16px;
        color: var(--text-primary);
        letter-spacing: -0.2px;
      }

      /* ─── Summary Cards ─── */
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }

      .summary-card {
        display: flex;
        align-items: center;
        gap: 16px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        box-shadow: var(--shadow);
        transition: transform 0.2s ease;
      }

      .summary-card:hover {
        transform: translateY(-3px);
      }

      .card-icon-wrap {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .card-icon-wrap ha-icon {
        --mdc-icon-size: 24px;
        color: #fff;
      }

      .gradient-1 { background: var(--primary-color); }
      .gradient-2 { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
      .gradient-3 { background: linear-gradient(135deg, #f97316, #eab308); }
      .gradient-4 { background: linear-gradient(135deg, #22c55e, #06b6d4); }

      .card-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .card-label {
        font-size: 12px;
        color: var(--text-secondary);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-value {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.5px;
      }

      .total-card {
        border-color: rgba(99, 102, 241, 0.3);
      }

      /* ─── Dashboard Grid ─── */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }

      /* ─── Donut Chart ─── */
      .donut-container {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-wrap: wrap;
      }

      .donut-visual {
        width: 200px;
        height: 200px;
        flex-shrink: 0;
        border-radius: 50%;
        position: relative;
      }

      .donut-hole {
        position: absolute;
        inset: 28px;
        border-radius: 50%;
        background: var(--card-bg);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }

      .donut-total-label {
        font-size: 11px;
        color: var(--text-secondary);
        font-weight: 500;
      }

      .donut-total-value {
        font-size: 16px;
        color: var(--text-primary);
        font-weight: 800;
      }

      .donut-legend {
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-width: 150px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;
      }

      .legend-label {
        flex: 1;
        color: var(--text-secondary);
      }

      .legend-value {
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }

      .legend-pct {
        color: var(--text-secondary);
        font-size: 12px;
        min-width: 32px;
        text-align: right;
      }

      /* ─── Recent Expenses ─── */
      .recent-list {
        display: flex;
        flex-direction: column;
      }

      .recent-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 4px;
        border-bottom: 1px solid var(--border);
        cursor: pointer;
        transition: background 0.15s ease;
        border-radius: 8px;
      }

      .recent-item:hover {
        background: var(--border);
      }

      .recent-item:last-child {
        border-bottom: none;
      }

      .recent-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .recent-icon ha-icon { --mdc-icon-size: 18px; }

      .recent-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .recent-desc {
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .recent-meta {
        font-size: 11px;
        color: var(--text-secondary);
      }

      .recent-amount {
        font-size: 14px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }

      /* ─── Budget Progress ─── */
      .budget-bars { display: flex; flex-direction: column; gap: 16px; }

      .budget-bar-item { display: flex; flex-direction: column; gap: 6px; }

      .budget-bar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }

      .budget-cat {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }

      .budget-cat ha-icon { --mdc-icon-size: 16px; }

      .budget-amounts {
        color: var(--text-secondary);
        font-variant-numeric: tabular-nums;
      }

      .progress-track {
        height: 8px;
        background: var(--border);
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease;
      }

      .progress-fill.over-budget { animation: pulse-danger 1.5s ease-in-out infinite; }

      @keyframes pulse-danger {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .budget-remaining {
        font-size: 12px;
        color: var(--text-secondary);
      }

      .budget-remaining.negative { color: var(--danger); font-weight: 600; }

      /* ─── User Breakdown ─── */
      .user-breakdown-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
      }

      .user-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 20px;
        background: var(--panel-bg);
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .balance-card.owed {
        border-color: rgba(34, 197, 94, 0.4);
        background: linear-gradient(to bottom, var(--panel-bg), rgba(34, 197, 94, 0.03));
      }

      .balance-card.ower {
        border-color: rgba(239, 68, 68, 0.4);
        background: linear-gradient(to bottom, var(--panel-bg), rgba(239, 68, 68, 0.03));
      }

      .balance-card.settled {
        border-color: var(--border);
        opacity: 0.8;
      }

      .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: var(--primary-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
      }

      .user-name { font-size: 14px; font-weight: 600; }
      .user-total { font-size: 18px; font-weight: 800; }
      .user-count { font-size: 12px; color: var(--text-secondary); }

      /* ─── Expense Table ─── */
      .expense-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 4px;
        border-bottom: 1px solid var(--border);
        transition: background 0.15s ease;
      }

      .expense-row:hover {
        background: var(--border);
        border-radius: 8px;
      }

      .expense-row:last-child { border-bottom: none; }

      .expense-cat-icon {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .expense-cat-icon ha-icon { --mdc-icon-size: 20px; }

      .expense-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }

      .expense-desc {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .expense-meta {
        font-size: 12px;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
      }

      .shared-badge {
        background: var(--accent);
        color: #fff;
        font-size: 10px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 600;
      }

      .expense-amount {
        font-size: 16px;
        font-weight: 700;
        color: var(--danger);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }

      .expense-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .expense-row:hover .expense-actions { opacity: 1; }

      .action-btn {
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }

      .action-btn:hover {
        background: var(--border);
      }

      .action-btn.edit:hover { color: var(--accent); }
      .action-btn.delete:hover { color: var(--danger); }
      .action-btn ha-icon { --mdc-icon-size: 16px; }

      /* ─── Form ─── */
      .form-card { max-width: 560px; }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .amount-input-wrap {
        display: flex;
        align-items: center;
        background: var(--panel-bg);
        border: 2px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0 16px;
        transition: border-color 0.2s ease;
      }

      .amount-input-wrap:focus-within {
        border-color: var(--accent);
      }

      .currency-prefix {
        font-size: 22px;
        font-weight: 700;
        color: var(--text-secondary);
        margin-right: 8px;
      }

      .currency-prefix.small {
        font-size: 14px;
      }

      .amount-input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 32px;
        font-weight: 800;
        color: var(--text-primary);
        padding: 12px 0;
        outline: none;
        font-family: inherit;
      }

      .amount-input::placeholder {
        color: var(--text-secondary);
        opacity: 0.4;
      }

      .text-input {
        width: 100%;
        border: 2px solid var(--border);
        background: var(--panel-bg);
        border-radius: var(--radius-sm);
        padding: 12px 16px;
        font-size: 14px;
        color: var(--text-primary);
        outline: none;
        transition: border-color 0.2s ease;
        font-family: inherit;
      }

      .text-input:focus {
        border-color: var(--accent);
      }

      .category-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .cat-chip {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border: 2px solid var(--border);
        border-radius: 24px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .cat-chip:hover {
        border-color: var(--cat-color);
        color: var(--cat-color);
      }

      .cat-chip.selected {
        border-color: var(--cat-color);
        background: color-mix(in srgb, var(--cat-color) 15%, transparent);
        color: var(--cat-color);
        font-weight: 600;
      }

      .cat-chip ha-icon { --mdc-icon-size: 16px; }

      .form-row {
        display: flex;
        gap: 16px;
        align-items: flex-end;
      }

      .flex-1 { flex: 1; }

      /* Toggle */
      .toggle-label {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 28px;
        cursor: pointer;
      }

      .toggle-label input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: absolute;
        inset: 0;
        background: var(--border);
        border-radius: 14px;
        transition: background 0.3s ease;
      }

      .toggle-slider::before {
        content: "";
        position: absolute;
        width: 22px;
        height: 22px;
        left: 3px;
        bottom: 3px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.3s ease;
      }

      .toggle-label input:checked + .toggle-slider {
        background: var(--accent);
      }

      .toggle-label input:checked + .toggle-slider::before {
        transform: translateX(20px);
      }

      .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 8px;
      }

      .primary-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 20px;
        border: none;
        border-radius: var(--radius-sm);
        background: var(--primary-color);
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }

      .primary-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }

      .primary-btn ha-icon { --mdc-icon-size: 18px; }

      .secondary-btn {
        padding: 10px 20px;
        border: 2px solid var(--border);
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        font-family: inherit;
      }

      .secondary-btn:hover {
        border-color: var(--text-secondary);
        color: var(--text-primary);
      }

      /* ─── Budgets Edit ─── */
      .budget-hint {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 20px;
      }

      .budget-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .budget-edit-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 8px;
        border-radius: 8px;
        transition: background 0.15s ease;
      }

      .budget-edit-row:hover {
        background: var(--panel-bg);
      }

      .budget-edit-cat {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 160px;
        font-weight: 600;
        font-size: 14px;
      }

      .budget-edit-input-wrap {
        display: flex;
        align-items: center;
        background: var(--panel-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 0 10px;
        width: 140px;
      }

      .budget-input {
        border: none;
        background: transparent;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        padding: 8px 4px;
        outline: none;
        width: 80px;
        font-family: inherit;
      }

      .budget-edit-spent {
        font-size: 13px;
        color: var(--text-secondary);
        min-width: 100px;
      }

      /* ─── Settings ─── */
      .settings-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .settings-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }

      .settings-row:last-child { border-bottom: none; }

      .settings-label {
        font-size: 14px;
        color: var(--text-secondary);
      }

      .settings-value {
        font-size: 14px;
        font-weight: 600;
      }

      .add-category-form {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .add-category-form .text-input {
        flex: 1;
      }

      .category-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .category-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 8px;
        transition: background 0.15s ease;
      }

      .category-item:hover {
        background: var(--panel-bg);
      }

      .category-item span {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }

      .default-badge {
        font-size: 11px;
        color: var(--text-secondary);
        background: var(--border);
        padding: 2px 8px;
        border-radius: 4px;
        font-weight: 500;
        flex: 0 !important;
      }

      /* ─── Empty State ─── */
      .empty-state {
        text-align: center;
        color: var(--text-secondary);
        padding: 32px 16px;
        font-size: 14px;
      }

      .empty-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 48px;
      }

      .empty-card ha-icon {
        --mdc-icon-size: 48px;
        color: var(--text-secondary);
        opacity: 0.5;
      }

      .empty-card p {
        color: var(--text-secondary);
        font-size: 15px;
      }

      /* ─── Loader ─── */
      .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: 16px;
        color: var(--text-secondary);
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--border);
        border-top-color: var(--accent);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* ─── Notification Toast ─── */
      .notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 20px;
        border-radius: var(--radius-sm);
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        z-index: 1000;
        animation: toast-in 0.3s ease;
      }

      .notification.success {
        background: var(--success);
        color: #fff;
      }

      .notification.error {
        background: var(--danger);
        color: #fff;
      }

      .notification.info {
        background: var(--accent);
        color: #fff;
      }

      .notification ha-icon { --mdc-icon-size: 20px; }

      @keyframes toast-in {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* ─── Responsive ─── */
      @media (max-width: 768px) {
        .panel-root {
          flex-direction: column;
        }

        .panel-nav {
          width: 100%;
          min-height: auto;
          flex-direction: row;
          padding: 8px 12px;
          overflow-x: auto;
          border-right: none;
          border-bottom: 1px solid var(--border);
          gap: 4px;
        }

        .nav-header {
          display: none;
        }

        .nav-items {
          flex-direction: row;
          gap: 4px;
        }

        .nav-btn span {
          display: none;
        }

        .nav-btn {
          padding: 10px;
        }

        .fab {
          margin-top: 0;
          padding: 10px;
        }

        .fab span { display: none; }

        .panel-content {
          padding: 16px;
          max-height: none;
        }

        .summary-grid {
          grid-template-columns: 1fr 1fr;
        }

        .dashboard-grid {
          grid-template-columns: 1fr;
        }

        .donut-container {
          flex-direction: column;
          align-items: center;
        }

        .form-row {
          flex-direction: column;
        }

        .view-header {
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }

        .expense-actions {
          opacity: 1;
        }

        .budget-edit-row {
          flex-wrap: wrap;
        }

        .card-value {
          font-size: 18px;
        }
      }

      @media (max-width: 480px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
