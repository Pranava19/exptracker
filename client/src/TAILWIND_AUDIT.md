# Tailwind CSS Audit & Migration Roadmap for ExpTracker Client

## 1. Tailwind Configuration Analysis (`client/tailwind.config.js`)
- **Theme Mode**: `darkMode: 'class'` (toggled via `.dark` on `document.documentElement`).
- **Color Palette**:
  - `ink`:
    - 50: `#f8fafc`
    - 100: `#e2e8f0`
    - 200: `#cbd5e1`
    - 300: `#94a3b8`
    - 400: `#64748b`
    - 500: `#64748b`
    - 600: `#475569`
    - 700: `#334155`
    - 800: `#1e293b`
    - 900: `#0f172a`
  - `accent`:
    - DEFAULT: `#2563eb`
    - light: `#3b82f6`
    - dark / hover: `#1d4ed8`
  - `positive`: `#16a34a`
  - `negative`: `#dc2626`
- **Border Radii**:
  - `card`: `10px`
  - `sharp`: `2px`
- **Typography / Font Families**:
  - `sans`: `'Inter', system-ui, sans-serif`
  - `mono`: `'IBM Plex Mono', monospace`
- **Standard Breakpoints**:
  - `sm`: `640px`
  - `md`: `768px`
  - `lg`: `1024px`
  - `xl`: `1280px`
- **Plugins**: None

## 2. Inventory of Files Using Tailwind Classes

### Shared Components (11 files)
1. `client/src/App.js` - LoadingFallback screen and spinner.
2. `client/src/components/HeaderClock.jsx` - Clock text, flex container, dark mode text styling.
3. `client/src/components/Toast.jsx` - Toast floating notification container, types (error, success, info).
4. `client/src/components/Skeleton.jsx` - Pulse animations, skeleton lines, card placeholders.
5. `client/src/components/Layout.jsx` - Application shell, layout container, ambient blobs.
6. `client/src/components/Navbar.jsx` - Desktop sidebar navigation, mobile bottom navigation bar, active links.
7. `client/src/components/QuickAddFAB.jsx` - Fixed floating action button, hover/active animations, ping ring.
8. `client/src/components/QuickAddModal.jsx` - Modal overlay, dialog window, form controls, merchant suggestions.
9. `client/src/components/MonthlyChart.jsx` - Recharts bar chart wrapper and card container.
10. `client/src/components/CategoryChart.jsx` - Category distribution bar list and percentage meters.
11. `client/src/components/ImportStatement.jsx` - Statement file dropzone, password input, progress bar, upload button.

### Pages (10 files)
12. `client/src/pages/DashboardHome.jsx` - Asymmetric hero card, metric badges, recent transaction list.
13. `client/src/pages/Transactions.jsx` - Filters toolbar, transaction table (desktop), cards (mobile), pagination.
14. `client/src/pages/Analysis.jsx` - Summary cards, Net Cash Flow area chart, cumulative line chart.
15. `client/src/pages/Import.jsx` - Page shell, headers, and container.
16. `client/src/pages/Profile.jsx` - User credentials card, data backup download, JSON restore dropzone.
17. `client/src/pages/Login.jsx` - Auth container, login form, inputs, button, switch to register link.
18. `client/src/pages/Register.jsx` - Register form, inputs, terms disclaimer, switch to login link.
19. `client/src/pages/NotFound.jsx` - 404 message, illustration container, return to dashboard button.
20. `client/src/pages/Privacy.jsx` - Privacy policy document layout and typography.
21. `client/src/pages/Terms.jsx` - Terms of service document layout and typography.

## 3. PostCSS & Stylesheet Baseline
- `client/src/index.css`: Contains CSS variables, glassmorphism design tokens, and compiled Tailwind preflight.
- `client/postcss.config.js`: Contains `tailwindcss` and `autoprefixer`.
