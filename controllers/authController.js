const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required' });
  try {
    // Ensure users table exists
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )`);
    // Check if user with email already exists
    const userExists = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) return res.status(409).json({ message: 'User with this email already exists' });
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert new user
    const insertResult = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );
    const newUserId = insertResult.rows[0].id;
    res.status(201).json({ message: 'User registered', userId: newUserId });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = userResult.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const accessToken = jwt.sign({ email: user.email, id: user.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ email: user.email, id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
    // Ensure refresh_tokens table exists
    await db.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      token TEXT NOT NULL,
      username VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await db.query('INSERT INTO refresh_tokens (token, username) VALUES ($1, $2)', [refreshToken, user.email]);
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.token = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });
  try {
    const tokenResult = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
    if (tokenResult.rows.length === 0) return res.status(403).json({ message: 'Invalid refresh token' });
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid refresh token' });
      const accessToken = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '15m' });
      res.json({ accessToken });
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
};
