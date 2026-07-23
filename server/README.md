# ExpTracker - Server Backend API

This directory contains the Node.js / Express backend API for **ExpTracker**.

> For full project documentation, database schema setup, and step-by-step installation, see the [Root README](../README.md).

---

## 🛠️ Tech Stack

- **Node.js & Express 5**: Core API server framework.
- **PostgreSQL (`pg`)**: Relational database connection pool.
- **JWT & BcryptJS**: Authentication & password hashing.
- **Multer**: File upload handling.
- **PDF.js (`pdfjs-dist`) & XLSX / ExcelJS**: Bank statement text & data extraction.
- **OfficeCrypto-Tool**: Decryption of password-protected Excel statements.

---

## 🚀 Available Scripts

In the `server` directory:

### `npm run dev`
Starts the Express server with `nodemon` for auto-reloading during development.

### `npm start`
Runs the server with standard `node index.js`.

---

## ⚙️ Environment Variables (`.env`)

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/expense_tracker
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:3000
```
