# ExpTracker - Client Application

This directory contains the React 19 frontend application for **ExpTracker**.

> For full documentation on the overall project architecture, backend API, database schema, and deployment, please refer to the [Root README](../README.md).

---

## 🛠️ Tech Stack & Dependencies

- **React 19**: Modern UI rendering & component architecture.
- **React Router v7**: Client-side routing & private route protection.
- **Recharts**: Interactive chart visualizations for financial analytics.
- **Axios**: HTTP client configured with JWT interceptors.
- **Tailwind CSS & PostCSS**: Utility-first styling with dark/light mode context.
- **ExcelJS / XLSX**: Client-side spreadsheet handling utilities.

---

## 🚀 Available Scripts

In the `client` directory, you can run:

### `npm start`
Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`
Launches the test runner in interactive watch mode.

### `npm run build`
Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for best performance.

---

## ⚙️ Environment Configuration

You can configure the backend API endpoint by creating a `.env` file in this directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```
