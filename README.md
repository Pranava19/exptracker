# ExpTracker - Modern Full-Stack Expense Tracker & Bank Statement Parser

ExpTracker is a personal finance web application built with **React 19**, **Node.js**, **Express 5**, and **PostgreSQL**. It features automated bank statement parsing (Excel statements), automated category classification, HTTP-only cookie authentication, rate limiting, and responsive financial analytics charts.

---

## Features

- **Security & Authentication**:
  - **HTTP-Only Cookies**: Short-lived Access Tokens (15m) and Refresh Tokens (7d) stored in `httpOnly` secure cookies.
  - **Security Hardening**: `helmet` headers, `express-rate-limit` (auth, import, transaction limiters), `express-validator` schema validation, `trust proxy` configuration for reverse proxies (Render/Vercel), and idle connection error handling for serverless PostgreSQL (Neon).
- **Smart Bank Statement Parser**:
  - Upload **Excel (.xlsx, .xls)** bank statements.
  - Supports **password-protected** / encrypted Excel files via `officecrypto-tool`.
  - Intelligently detects header rows, dates, descriptions, payees, credit/debit amounts, and payment modes across varied bank statement layouts (e.g., SBI statements).
  - **Auto-Categorization**: Categorizes transactions into *Food*, *Transport*, *Shopping*, *Entertainment*, *Health*, *Salary*, *Freelance*, *Interest*, *Bank Charges*, *Insurance*, *Cash*, *Refund*, *Transfers*, *Recharge*, *Groceries*, *Education*, and *Other*.
- **Interactive Analytics & Dashboard**:
  - Asymmetric Hero card with month-to-date liquidity and balance summaries.
  - Recharts visual data visualizations (Monthly Income vs Expense, Category Breakdown, Spending Line Trends).
  - Monospace formatting (**IBM Plex Mono**) for numeric metrics and **Instrument Sans** for interface typography.
- **Transaction Management**:
  - Full CRUD operations with filtering by date range, category, type (income/expense), and payment mode.
  - Automatic duplicate transaction detection and cleanups.
  - Native multi-sheet Excel spreadsheet export generation (`.xlsx`).

---

## Tech Stack

### **Frontend** (`/client`)
- **Framework**: React 19, React Router v7
- **Styling**: Tailwind CSS & PostCSS
- **Icons**: Lucide React (`lucide-react`)
- **Data Visualization**: Recharts
- **HTTP Client**: Axios with credentials & automatic 401 token refresh interceptor
- **Spreadsheets**: SheetJS (`xlsx`) for Excel export

### **Backend** (`/server`)
- **Runtime & Framework**: Node.js, Express 5
- **Database**: PostgreSQL (`pg` pool with Neon serverless idle connection recovery)
- **Security & Auth**: JWT (`jsonwebtoken`), BcryptJS (`bcryptjs`), Helmet, Cookie-Parser, Express-Rate-Limit
- **File Parsing**: Multer (Memory Storage), `xlsx`, `officecrypto-tool`

---

## 🗄️ Database Schema

ExpTracker uses a **PostgreSQL** database. Run the following SQL queries to initialize your schema:

```sql
-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    payee VARCHAR(255),
    date DATE NOT NULL,
    mode VARCHAR(50) DEFAULT 'Other',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
```

---

## ⚙️ Environment Variables Setup

### Server Environment (`server/.env`)
Create `server/.env` with placeholders:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_super_secret_refresh_jwt_key_here
CLIENT_URL=http://localhost:3000
```

### Client Environment (`client/.env`)
*(Optional for local development)*:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🚀 Quick Start & Installation

### Step 1: Clone & Setup Backend

```bash
cd server
npm install
npm run dev
# Backend server runs at http://localhost:5000
```

### Step 2: Setup Frontend

Open a new terminal window:

```bash
cd client
npm install
npm start
# Client application runs at http://localhost:3000
```

---

## 🔌 API Endpoints Reference

### **Authentication (`/api/auth`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate user & issue HTTP-Only JWT cookies |
| `POST` | `/api/auth/forgot-password` | Request password reset token |
| `POST` | `/api/auth/reset-password` | Reset password using valid reset token |
| `POST` | `/api/auth/refresh` | Refresh access token using HTTP-Only refresh cookie |
| `POST` | `/api/auth/logout` | Clear authentication cookies |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |

### **Transactions (`/api/transactions`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Fetch user transactions (with optional date/category filters) |
| `POST` | `/api/transactions` | Create a single transaction |
| `GET` | `/api/transactions/summary` | Get total income, total expense, and net liquidity summary |
| `PUT` | `/api/transactions/:id` | Update an existing transaction |
| `PATCH` | `/api/transactions/:id` | Update transaction category and payment mode |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |
| `DELETE` | `/api/transactions/duplicates` | Clean up duplicate transactions |

### **Statement Import (`/api/import`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/import` | Upload Excel bank statement (`.xlsx`, `.xls`) with optional password |
| `POST` | `/api/import/preview` | Preview parsed transactions before committing |

---

## 📝 License

This project is open-source software licensed under the [ISC License](LICENSE).
