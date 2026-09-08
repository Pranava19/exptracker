# Contributing to ExpTracker

Thank you for your interest in contributing to ExpTracker! This document provides guidelines and setup instructions to help you contribute efficiently.

---

## 🛠 Local Setup

### Prerequisites
- **Node.js**: v18.x or v20.x
- **PostgreSQL**: v14 or later (or a cloud PostgreSQL instance like Neon)
- **Git**

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Pranava19/exptracker.git
   cd exptracker
   ```

2. **Backend Setup**:
   ```bash
   cd server
   npm install
   cp .env.example .env # Set your DATABASE_URL and JWT_SECRET
   npm run dev
   ```

3. **Frontend Setup**:
   ```bash
   cd ../client
   npm install
   npm start
   ```

---

## 🌿 Branching & Commit Workflow

- **Branch Naming**: Use descriptive prefixes:
  - `feat/feature-name` for new features
  - `fix/bug-name` for bug fixes
  - `chore/task-name` for maintainence tasks
- **Commit Messages**: Follow Conventional Commits:
  - `feat(auth): add password reset endpoint`
  - `fix(ui): resolve text selection overflow`
  - `docs(readme): update API setup section`

---

## 🧪 Testing

Before submitting changes, run tests and verify production builds:

```bash
# Run server tests
cd server
npm test

# Verify client production build
cd ../client
npm run build
```
