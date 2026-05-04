const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const db       = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { sendOTP } = require('../services/email');

const router = express.Router();

// ---------- helpers ----------
function makeTokens(user) {
  const payload = {
    id:        user.id,
    phone:     user.phone,
    tier:      user.tier,
    role:      user.role || 'member',
    outlet_id: user.outlet_id || null,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function issueOTP(email, purpose = 'registration') {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  // Invalidate prior unused codes for this email+purpose
  await db.query(
    'UPDATE otp_codes SET used = TRUE WHERE email = ? AND purpose = ? AND used = FALSE',
    [email, purpose]
  );
  await db.query(
    'INSERT INTO otp_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
    [email, code, purpose, expiresAt]
  );
  await sendOTP(email, code);
  return code;
}

// ---------- register: step 1 (request OTP) ----------
router.post('/register', async (req, res) => {
  const { phone, name, password, email } = req.body;
  if (!phone || !password || !name || !email) {
    return res.status(400).json({ error: 'phone, name, email and password are required' });
  }
  try {
    const [existingPhone] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhone.length > 0) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }
    const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (phone, name, password_hash, email, email_verified) VALUES (?, ?, ?, ?, FALSE)',
      [phone, name, hash, email]
    );

    await issueOTP(email, 'registration');

    res.status(201).json({
      message: 'OTP sent to email. Verify to complete registration.',
      userId: result.insertId,
      email,
      requiresOtp: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- register: step 2 (verify OTP) ----------
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'email and code are required' });
  }
  try {
    const [rows] = await db.query(
      `SELECT id, code, expires_at, used, attempts FROM otp_codes
       WHERE email = ? AND purpose = 'registration'
       ORDER BY id DESC LIMIT 1`,
      [email]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No OTP found. Please register again.' });

    const otp = rows[0];
    if (otp.used)                            return res.status(400).json({ error: 'OTP already used' });
    if (new Date(otp.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
    if (otp.attempts >= 5)                   return res.status(429).json({ error: 'Too many attempts. Request a new code.' });

    if (otp.code !== code) {
      await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?', [otp.id]);
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Mark OTP used + user verified
    await db.query('UPDATE otp_codes SET used = TRUE WHERE id = ?', [otp.id]);
    await db.query(
      'UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE email = ?',
      [email]
    );

    // Issue tokens
    const [userRows] = await db.query(
      'SELECT id, phone, name, points, tier, role, outlet_id FROM users WHERE email = ?',
      [email]
    );
    const user = userRows[0];
    const { accessToken, refreshToken } = makeTokens(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- resend OTP ----------
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });
  try {
    const [users] = await db.query(
      'SELECT id, email_verified FROM users WHERE email = ?',
      [email]
    );
    if (users.length === 0)        return res.status(404).json({ error: 'Email not found' });
    if (users[0].email_verified)   return res.status(400).json({ error: 'Email already verified' });

    await issueOTP(email, 'registration');
    res.json({ message: 'OTP resent', email });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- login (unchanged) ----------
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'phone and password are required' });
  try {
    const [rows] = await db.query(
      'SELECT id, phone, name, password_hash, points, tier, role, outlet_id, is_active, email, email_verified FROM users WHERE phone = ?',
      [phone]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid phone or password' });
    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account is deactivated' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid phone or password' });

    // Block login if registration was never verified
    if (user.email && !user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified. Please complete registration.',
        requiresOtp: true,
        email: user.email,
      });
    }

    const { accessToken, refreshToken } = makeTokens(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, refreshToken, expiresAt]
    );
    const { password_hash, is_active, email_verified, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- refresh / logout / me (unchanged) ----------
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const [rows] = await db.query(
      'SELECT id FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
      [refreshToken]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Refresh token invalid or expired' });
    const [userRows] = await db.query(
      'SELECT id, phone, name, points, tier, role, outlet_id FROM users WHERE id = ?',
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
    'SELECT id, phone, email, name, points, tier, role, outlet_id, email_verified, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  res.json(rows[0]);
});

module.exports = router;