const jwt = require('jsonwebtoken');
const db = require('../db/pool');

const ADMIN_ROLES = ['staff', 'store_manager'];

// Allows both staff and store_manager. Also fixes outlet_id scoping.
async function requireAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [[user]] = await db.query(
      'SELECT id, phone, role, outlet_id FROM users WHERE id = ?',
      [payload.id]
    );
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Store managers only — rejects staff with 403
async function requireManager(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [[user]] = await db.query(
      'SELECT id, phone, role, outlet_id FROM users WHERE id = ?',
      [payload.id]
    );
    if (!user || user.role !== 'store_manager') {
      return res.status(403).json({ error: 'Store manager access required' });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireAdmin, requireManager };