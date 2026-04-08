const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function makeTokens(user) {
  const payload = { id: user.id, phone: user.phone, tier: user.tier, role: user.role || 'member' };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });

  return { accessToken, refreshToken };
}

router.post('/register', async (req, res) => {
  const { phone, name, password, email } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ error: 'phone, name and password are required' });
  }
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (phone, name, password_hash, email) VALUES (?, ?, ?, ?)',
      [phone, name, hash, email || null]
    );
    const userId = result.insertId;
    const [rows]  = await db.query('SELECT id, phone, name, points, tier, role FROM users WHERE id = ?', [userId]);
    const user    = rows[0];
    const { accessToken, refreshToken } = makeTokens(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, refreshToken, expiresAt]
    );
    res.status(201).json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: 'phone and password are required' });
  }
  try {
    const [rows] = await db.query(
      'SELECT id, phone, name, password_hash, points, tier, role, is_active FROM users WHERE phone = ?',
      [phone]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid phone or password' });
    }
    const { accessToken, refreshToken } = makeTokens(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );
    const { password_hash, is_active, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const [rows] = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token invalid or expired' });
    }
    const [userRows] = await db.query(
      'SELECT id, phone, name, points, tier, role FROM users WHERE id = ?',
      [payload.id]
    );
    const user = userRows[0];
    const tokens = makeTokens(user);
    await db.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, tokens.refreshToken, expiresAt]
    );
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
  }
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, phone, email, name, points, tier, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;
