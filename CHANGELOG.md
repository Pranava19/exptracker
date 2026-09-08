# Changelog

All notable changes to the ExpTracker project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-08

### Added
- **Password Reset Flow**: `/api/auth/forgot-password` and `/api/auth/reset-password` endpoints using SHA-256 hashed token storage.
- **Input Validation**: `express-validator` middleware rules across authentication routes (`/register`, `/login`, `/forgot-password`, `/reset-password`).
- **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) for automated testing and client build verification.
- **Testing Setup**: Jest test suite configuration for backend routes.
- **Structured Logging**: Winston logging utility (`server/utils/logger.js`).
- **Health Check**: `/api/health` endpoint for database connectivity health monitoring.
- **Governance & Specs**: Added `CONTRIBUTING.md`, `CHANGELOG.md`, `.editorconfig`, and `.github/PULL_REQUEST_TEMPLATE.md`.

### Fixed
- UI text selection and caret behavior across all dashboard components.
- Removed unused CRA spin keyframe animations and redundant code comments.

---

## [1.0.0] - 2026-08-21

### Added
- Initial release of ExpTracker personal expense tracker & statement parser.
- React frontend with Tailwind CSS styling and Recharts analytics.
- Express REST API with PostgreSQL database, JWT authentication, and bank statement parser.
