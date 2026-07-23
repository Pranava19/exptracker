# 💸 ExpTracker - Full-Stack Expense Tracker & Bank Statement Parser

ExpTracker is a modern full-stack web application designed for personal finance tracking, expense/income management, and automated bank statement parsing. It supports password-protected PDF and Excel bank statements (such as SBI statements), automatic transaction categorization, duplicate detection, and visual analytics.

---

## ✨ Features

- **🔐 Authentication & Security**: Secure User Registration and Login using JWT (JSON Web Tokens) and bcrypt password hashing.
- **📊 Interactive Analytics**: Visual category breakdowns and monthly income/expense trends powered by **Recharts**.
- **💳 Transaction Management**: Add, update, delete, and filter transactions by date, category, type (income/expense), and payment mode.
- **📄 Smart Bank Statement Parser**:
  - Upload **PDF** or **Excel (.xlsx, .xls)** bank statements (e.g., SBI bank statements).
  - Handles **password-protected** / encrypted PDF and Excel files seamlessly.
  - Automatically parses dates, descriptions, payees, credit/debit amounts, and payment modes (UPI, Cash, Net Banking, etc.).
  - **Auto-Categorization**: Intelligent rule-based categorization for *Food*, *Transport*, *Shopping*, *Entertainment*, *Health*, *Salary*, *Freelance*, and *Other*.
- **🧹 Duplicate Detection & Cleanup**: Prevents duplicate insertions during imports and provides a one-click duplicate transaction cleanup feature.
- **🎨 Modern UI & Theme Support**: Built with React 19 and Tailwind CSS, including dark and light theme switching.

---

## 🛠️ Tech Stack

### **Frontend** (`/client`)
- **Framework**: [React 19](https://react.dev/) with [React Router v7](https://reactrouter.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & PostCSS
- **Data Visualization**: [Recharts](https://recharts.org/)
- **HTTP Client**: [Axios](https://axios-http.com/)

### **Backend** (`/server`)
- **Runtime & Framework**: Node.js, [Express 5](https://expressjs.com/)
- **Database**: PostgreSQL (`pg` pool, compatible with local PostgreSQL or cloud DBs like Neon Tech)
- **Security & Auth**: JWT (`jsonwebtoken`), BcryptJS (`bcryptjs`), CORS
- **File Processing**: [Multer](https://github.com/expressjs/multer) (Memory Storage), [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`), [XLSX](https://sheetjs.com/), [ExcelJS](https://github.com/exceljs/exceljs), `officecrypto-tool`

---

## 📁 Repository Structure

```text
exptracker/
├── client/                   # React Frontend Application
│   ├── public/               # Static assets & index.html
│   ├── src/
│   │   ├── api/              # Axios instance & HTTP interceptors
│   │   ├── components/       # Reusable UI components (Navbar, Charts, Toast, Skeletons)
│   │   ├── context/          # React Context (AuthContext, ThemeContext)
│   │   ├── hooks/            # Custom React hooks (useToast)
│   │   ├── pages/            # Application pages (Dashboard, Transactions, Analysis, Import, Profile, Login, Register)
│   │   ├── App.js            # Main React App router setup
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/                   # Node.js Express Backend API
│   ├── db/                   # Database connection pool setup (pg)
│   ├── middleware/           # Auth middleware for JWT verification
│   ├── routes/
│   │   ├── auth.js           # Registration & Login endpoints
│   │   ├── transactions.js   # CRUD endpoints for transactions & summary stats
│   │   └── import.js         # File upload & bank statement parser (.pdf, .xlsx)
│   ├── index.js              # Express server entry point
│   ├── .env                  # Environment variables config
│   └── package.json
│
└── README.md                 # Main Project documentation
```

---

## 🗄️ Database Schema

ExpTracker requires a **PostgreSQL** database. Run the following SQL queries to initialize your tables:

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
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
```

---

## ⚙️ Environment Variables Setup

### Server (`server/.env`)
Create or edit `server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:3000
```

### Client (`client/.env`) *(Optional)*
Create `client/.env` if you need custom API URLs (defaults to `http://localhost:5000/api`):
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn**
- **PostgreSQL** running locally or a cloud database URL (e.g., Neon PostgreSQL)

---

### Step 1: Setup Backend

```bash
cd server
npm install
```

Start the backend development server:
```bash
npm run dev
# Server will run at http://localhost:5000
```

---

### Step 2: Setup Frontend

Open a new terminal window:

```bash
cd client
npm install
```

Start the React development server:
```bash
npm start
# Client will open at http://localhost:3000
```

---

## 🔌 API Endpoints Summary

### **Authentication (`/api/auth`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login user & return JWT token |

### **Transactions (`/api/transactions`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Fetch all user transactions (supports `type`, `category`, `start_date`, `end_date` filters) |
| `POST` | `/api/transactions` | Create a single transaction |
| `GET` | `/api/transactions/summary` | Get user's total income, total expense, and balance |
| `PUT` | `/api/transactions/:id` | Update an existing transaction |
| `PATCH` | `/api/transactions/:id` | Update transaction category and payment mode |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |
| `DELETE` | `/api/transactions/duplicates` | Clean up duplicate transactions |
| `POST` | `/api/transactions/import` | Bulk insert array of transactions |

### **Import Statement (`/api/import`)**
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/import` | Upload bank statement file (`.pdf`, `.xlsx`, `.xls`) with optional file password |

---

## 📝 License

This project is open source and available under the [ISC License](LICENSE).
