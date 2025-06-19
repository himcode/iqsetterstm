require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/auth');
const db = require('./db');

const app = express();
app.use(express.json());

app.use('/api', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  try {
    // Attempt a simple query to ensure DB connection
    await db.query('SELECT 1');
    console.log('Database connection established');
    // List all tables in the public schema
    const tablesResult = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Tables in database:', tablesResult.rows.map(row => row.table_name));
  } catch (err) {
    console.error('Database connection failed:', err);
  }
  console.log(`Server running on port ${PORT}`);
});
