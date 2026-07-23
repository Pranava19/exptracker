const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db/index');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const importRoute = require('./routes/import');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/import', importRoute);

app.get('/', (req, res) => {
  res.send('Expense Tracker API is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));