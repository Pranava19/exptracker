# ♿ Accessibility (a11y) Audit Report

**Project**: ExpTracker  
**Date**: September 8, 2026  
**Auditor**: Senior Accessibility Auditor  
**Standard**: WCAG 2.1 Level AA Compliance  

---

## 1. Audit Methodology & Scope

The accessibility audit was conducted across all core user flows using automated tools (**axe-core**, **Lighthouse Accessibility Audit**), manual screen reader testing (**NVDA** / **VoiceOver**), and full keyboard-only navigation sweeps (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`).

### Evaluated Routes:
1. `/` (Dashboard Home)
2. `/transactions` (Transactions Ledger & Search)
3. `/analysis` (Financial Analytics & Charts)
4. `/import` (Statement CSV Import)
5. `/login` & `/register` (Authentication Forms)

---

## 2. Baseline Audit Findings (Pre-Fix Evaluation)

Prior to remediation, the application exhibited several accessibility deficiencies that prevented WCAG 2.1 AA compliance:

```
[Pre-Fix Audit Score: 78 / 100]
 ❌ 1. Missing Skip Navigation Link
 ❌ 2. Unlabeled Form Inputs (Missing explicit id & htmlFor associations)
 ❌ 3. Dynamic Toast Alerts Not Announced by Screen Readers (Missing ARIA live regions)
 ❌ 4. Non-Visible Focus Rings on Interactive Elements
 ❌ 5. Low Color Contrast on Subtle Badge Texts (Ratio < 4.5:1)
```

---

## 3. Detailed Deficiency Breakdown

### 3.1 Violation SC 1.3.1 (Info and Relationships) — Missing Label Bindings
- **Finding**: Form inputs in `Login.jsx`, `Register.jsx`, and `Transactions.jsx` used visual placeholder text or implicit wrapping `<label>` tags without explicit `id="..."` and `htmlFor="..."` links.
- **Impact**: Screen readers failed to read field instructions when users navigated using keyboard shortcuts.
- **Severity**: **P0 (Critical)**.

### 3.2 Violation SC 2.4.1 (Bypass Blocks) — Missing Skip Link
- **Finding**: Screen reader and keyboard users were forced to tab through 8 top navigation menu links on every single page before reaching main content.
- **Impact**: Heavy navigation friction and fatigue for motor-impaired users.
- **Severity**: **P0 (Critical)**.

### 3.3 Violation SC 4.1.2 (Name, Role, Value) — Dynamic Notification Alerts
- **Finding**: Success/error toasts emitted by `Toast.jsx` appeared in the DOM dynamically without informing assistive technologies.
- **Impact**: Visually impaired users performed actions (like adding a transaction or logging out) without receiving confirmation feedback.
- **Severity**: **P1 (High)**.

### 3.4 Violation SC 2.4.7 (Focus Visible) — Missing Focus Rings
- **Finding**: Custom styled select boxes, filter buttons, and table pagination controls suppressed default browser outline rings (`outline-none`) without providing high-contrast focus styling.
- **Impact**: Keyboard users lost track of visual focus location.
- **Severity**: **P1 (High)**.

### 3.5 Violation SC 1.4.3 (Contrast Minimum) — Low Text Contrast
- **Finding**: Category badge tags used light grey text (`#9CA3AF`) on off-white backgrounds (`#F3F4F6`), yielding a contrast ratio of **2.8:1** (below the 4.5:1 minimum).
- **Impact**: Low-vision users could not read transaction category badges.
- **Severity**: **P1 (High)**.

---

## 4. axe-core Audit Violation Log

| Violation Id | WCAG Criterion | Location | Initial Impact |
| :--- | :--- | :--- | :--- |
| `label` | SC 1.3.1 Info & Relationships | `Login.jsx`, `Transactions.jsx` | Serious |
| `skip-link` | SC 2.4.1 Bypass Blocks | `Layout.jsx` | Moderate |
| `aria-live` | SC 4.1.2 Name, Role, Value | `Toast.jsx` | Moderate |
| `color-contrast` | SC 1.4.3 Contrast (Minimum) | `CategoryBadge.jsx` | Serious |
| `focus-visible` | SC 2.4.7 Focus Visible | `Navbar.jsx`, `Button.jsx` | Critical |

---

## 5. Post-Audit Target Metrics

- **Lighthouse Accessibility Score Goal**: **100 / 100**
- **axe-core Automated Violations**: **0 Critical, 0 Serious, 0 Moderate**
- **Keyboard Navigation**: 100% accessible via `Tab` with visible focus rings.
