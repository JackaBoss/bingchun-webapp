const express = require('express');
const db = require('../db/pool');
const bcrypt = require('bcryptjs');
const { requireAdmin, requireManager } = require('../middleware/admin');
const { notifyStatusChange } = require('../services/telegram');
const router = express.Router();

// ── Outlet scoping helper ────────────────────────────────────────────────
function outletScope(user, tableAlias = 'o') {
  if (user.outlet_id) {
    return { where: `${tableAlias}.outlet_id = ?`, params: [user.outlet_id] };
  }
  return { where: null, params: [] };
}

// ── GET /api/admin/outlets ──────────────────────────────────────────────
router.get('/outlets', requireManager, async (req, res) => {
  try {
    let sql = 'SELECT id, store_code, name, address, is_open, close_reason FROM outlets';
    const params = [];
    if (req.user.outlet_id) {
      sql += ' WHERE id = ?';
      params.push(req.user.outlet_id);
    }
    sql += ' ORDER BY store_code';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/outlets/:id/toggle ─────────────────────────────────
router.patch('/outlets/:id/toggle', requireManager, async (req, res) => {
  const outletId = req.params.id;
  if (req.user.outlet_id && req.user.outlet_id != outletId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { is_open, close_reason } = req.body;
  try {
    await db.query(
      'UPDATE outlets SET is_open = ?, close_reason = ? WHERE id = ?',
      [is_open ? 1 : 0, is_open ? null : (close_reason || null), outletId]
    );
    const [[outlet]] = await db.query(
      'SELECT id, store_code, name, address, is_open, close_reason FROM outlets WHERE id = ?',
      [outletId]
    );
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });
    res.json(outlet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/outlets/:id/hours ────────────────────────────────────
router.get('/outlets/:id/hours', requireManager, async (req, res) => {
  const outletId = req.params.id;
  if (req.user.outlet_id && req.user.outlet_id != outletId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    let [rows] = await db.query(
      'SELECT day_of_week, open_time, close_time, is_closed FROM outlet_hours WHERE outlet_id = ? ORDER BY day_of_week',
      [outletId]
    );
    // Auto-seed if new outlet has no rows yet
    if (rows.length === 0) {
      await db.query(
        `INSERT IGNORE INTO outlet_hours (outlet_id, day_of_week, open_time, close_time, is_closed)
         SELECT ?, d.n, '10:30:00', '22:00:00', 0
         FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
               UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) d`,
        [outletId]
      );
      [rows] = await db.query(
        'SELECT day_of_week, open_time, close_time, is_closed FROM outlet_hours WHERE outlet_id = ? ORDER BY day_of_week',
        [outletId]
      );
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PUT /api/admin/outlets/:id/hours ────────────────────────────────────
router.put('/outlets/:id/hours', requireManager, async (req, res) => {
  const outletId = req.params.id;
  if (req.user.outlet_id && req.user.outlet_id != outletId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { hours } = req.body;
  if (!Array.isArray(hours) || hours.length !== 7) {
    return res.status(400).json({ error: 'hours must be an array of 7 days' });
  }
  try {
    for (const h of hours) {
      const closed = h.is_closed ? 1 : 0;
      await db.query(
        `INSERT INTO outlet_hours (outlet_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE open_time = VALUES(open_time), close_time = VALUES(close_time), is_closed = VALUES(is_closed)`,
        [outletId, h.day_of_week, closed ? null : (h.open_time || null), closed ? null : (h.close_time || null), closed]
      );
    }
    const [rows] = await db.query(
      'SELECT day_of_week, open_time, close_time, is_closed FROM outlet_hours WHERE outlet_id = ? ORDER BY day_of_week',
      [outletId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/dashboard ─────────────────────────────────────────────
router.get('/dashboard', requireManager, async (req, res) => {
  try {
    const scope = outletScope(req.user);
    const [todaySales] = await db.query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total),0) as revenue
       FROM orders o WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'
       ${scope.where ? 'AND ' + scope.where : ''}`,
      scope.params
    );
    const [pendingOrders] = await db.query(
      `SELECT COUNT(*) as count FROM orders o
       WHERE status IN ('pending','paid','preparing')
       ${scope.where ? 'AND ' + scope.where : ''}`,
      scope.params
    );
    const [[totalUsers]] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "member"');
    const [recentOrders] = await db.query(
      `SELECT o.*, ot.name as outlet_name, ot.store_code,
              u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       JOIN users u ON o.user_id = u.id
       WHERE 1=1 ${scope.where ? 'AND ' + scope.where : ''}
       ORDER BY o.created_at DESC LIMIT 20`,
      scope.params
    );
    res.json({
      today: todaySales[0],
      total_users: totalUsers.count,
      pending_orders: pendingOrders[0].count,
      recent_orders: recentOrders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/orders ────────────────────────────────────────────────
router.get('/orders', requireAdmin, async (req, res) => {
  const status = req.query.status || null;
  const filterOutletId = req.user.outlet_id || req.query.outlet_id || null;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  let sql = `SELECT o.*, ot.name as outlet_name, ot.store_code,
             u.name as customer_name, u.phone as customer_phone
             FROM orders o
             JOIN outlets ot ON o.outlet_id = ot.id
             JOIN users u ON o.user_id = u.id
             WHERE 1=1`;
  const params = [];
  if (status) { sql += ' AND o.status = ?'; params.push(status); }
  if (filterOutletId) { sql += ' AND o.outlet_id = ?'; params.push(filterOutletId); }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// ── GET /api/admin/orders/:id ────────────────────────────────────────────
router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const scope = outletScope(req.user);
    const [[order]] = await db.query(
      `SELECT o.*, ot.name as outlet_name, ot.store_code,
              u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ? ${scope.where ? 'AND ' + scope.where : ''}`,
      [req.params.id, ...scope.params]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      const [opts] = await db.query('SELECT * FROM order_item_options WHERE order_item_id = ?', [item.id]);
      item.options = opts;
    }
    order.items = items;
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/orders/:id/status ──────────────────────────────────
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','paid','preparing','ready','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const scope = outletScope(req.user);
    const [[order]] = await conn.query(
      `SELECT * FROM orders o WHERE id = ? ${scope.where ? 'AND ' + scope.where : ''}`,
      [req.params.id, ...scope.params]
    );
    if (!order) { await conn.rollback(); return res.status(404).json({ error: 'Order not found' }); }

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
    if (status === 'paid' && order.points_earned > 0 && order.status === 'pending') {
      const [[user]] = await conn.query('SELECT points FROM users WHERE id = ?', [order.user_id]);
      const newBalance = user.points + order.points_earned;
      await conn.query('UPDATE users SET points = ? WHERE id = ?', [newBalance, order.user_id]);
      await conn.query(
        `INSERT INTO points_transactions (user_id, order_id, type, amount, balance, note)
         VALUES (?, ?, 'earn', ?, ?, ?)`,
        [order.user_id, order.id, order.points_earned, newBalance, `Earned from order ${order.order_no}`]
      );
    }
    await conn.commit();
    const [[updated]] = await db.query('SELECT * FROM orders WHERE id = ?', [order.id]);

    if (['paid', 'ready', 'cancelled'].includes(status)) {
      const [[customer]] = await db.query('SELECT name FROM users WHERE id = ?', [order.user_id]);
      const [[outlet]] = await db.query('SELECT name FROM outlets WHERE id = ?', [order.outlet_id]);
      notifyStatusChange({
        order: updated,
        status,
        outletName: outlet?.name || '',
        customerName: customer?.name || '',
      }).catch(err => console.error('Telegram notify failed:', err.message));
    }

    res.json(updated);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── GET /api/admin/menu ──────────────────────────────────────────────────
router.get('/menu', requireAdmin, async (req, res) => {
  const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
  const [items] = await db.query('SELECT * FROM menu_items ORDER BY category_id, sort_order');
  const itemsByCategory = {};
  items.forEach(item => {
    if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = [];
    itemsByCategory[item.category_id].push(item);
  });
  res.json(categories.map(cat => ({ ...cat, items: itemsByCategory[cat.id] || [] })));
});

// ── PATCH /api/admin/menu/:id ────────────────────────────────────────────
router.patch('/menu/:id', requireAdmin, async (req, res) => {
  const { name, name_zh, base_price, is_available, description } = req.body;
  const fields = []; const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (name_zh !== undefined) { fields.push('name_zh = ?'); values.push(name_zh); }
  if (base_price !== undefined) { fields.push('base_price = ?'); values.push(base_price); }
  if (is_available !== undefined) { fields.push('is_available = ?'); values.push(is_available); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  await db.query(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`, values);
  const [[item]] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  res.json(item);
});

// ── PATCH /api/admin/menu/:id/toggle ────────────────────────────────────
router.patch('/menu/:id/toggle', requireAdmin, async (req, res) => {
  await db.query('UPDATE menu_items SET is_available = NOT is_available WHERE id = ?', [req.params.id]);
  const [[item]] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  res.json(item);
});

// ── GET /api/admin/orders/:id/receipt ───────────────────────────────────
router.get('/orders/:id/receipt', requireAdmin, async (req, res) => {
  try {
    const scope = outletScope(req.user);
    const [[order]] = await db.query(
      `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ? ${scope.where ? 'AND ' + scope.where : ''}`,
      [req.params.id, ...scope.params]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      const [opts] = await db.query('SELECT * FROM order_item_options WHERE order_item_id = ?', [item.id]);
      item.options = opts;
    }

    const W = 32;
    const line = '='.repeat(W);
    const dash = '-'.repeat(W);
    const center = (s) => { const p = Math.max(0, Math.floor((W - s.length) / 2)); return ' '.repeat(p) + s; };
    const lr = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;

    let receipt = center('BING CHUN MALAYSIA') + '\n' + center(order.outlet_name) + '\n' + line + '\n';
    receipt += center(`Order: ${order.order_no}`) + '\n';
    receipt += center(new Date(order.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })) + '\n';
    receipt += center(`Customer: ${order.customer_name}`) + '\n' + line + '\n';
    for (const item of items) {
      receipt += lr(`${item.quantity}x ${item.item_name}`, `RM${(item.unit_price * item.quantity).toFixed(2)}`) + '\n';
      if (item.options.length > 0) receipt += ` ${item.options.map(o => o.label).join(', ')}\n`;
      if (item.notes) receipt += ` Note: ${item.notes}\n`;
    }
    receipt += dash + '\n' + lr('Subtotal', `RM${parseFloat(order.subtotal).toFixed(2)}`) + '\n';
    if (parseFloat(order.discount) > 0) receipt += lr('Points Discount', `-RM${parseFloat(order.discount).toFixed(2)}`) + '\n';
    receipt += lr('TOTAL', `RM${parseFloat(order.total).toFixed(2)}`) + '\n' + line + '\n';
    if (order.points_earned > 0) receipt += center(`+${order.points_earned} points earned`) + '\n';
    receipt += '\n' + center('Thank you! / Terima Kasih!') + '\n';
    res.type('text/plain').send(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/member-lookup ─────────────────────────────────────────
router.get('/member-lookup', requireAdmin, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  const [[member]] = await db.query(
    'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"',
    [phone]
  );
  if (!member) return res.status(404).json({ error: 'Member not found. Ask them to register first.' });
  res.json({ id: member.id, name: member.name, phone: member.phone, tier: member.tier, current_points: member.points });
});

// ── GET /api/admin/members ────────────────────────────────────────────── (manager only)
router.get('/members', requireManager, async (req, res) => {
  try {
    const [members] = await db.query(
      `SELECT id, name, phone, email, points, tier, is_active, role, created_at
       FROM users WHERE role = 'member' ORDER BY created_at DESC`
    );
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/members/:id', requireManager, async (req, res) => {
  try {
    const [[member]] = await db.query(
      `SELECT id, name, phone, email, points, tier, is_active, role, created_at FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/members', requireManager, async (req, res) => {
  const { name, phone, email, password, tier, points } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'name, phone, and password are required' });
  try {
    const [[existing]] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) return res.status(409).json({ error: 'Phone number already registered' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO users (name, phone, email, password_hash, tier, points, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 'member', 1)`,
      [name.trim(), phone.trim(), email?.trim() || null, hash, tier || 'bronze', parseInt(points) || 0]
    );
    const [[created]] = await db.query(
      'SELECT id, name, phone, email, points, tier, is_active, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/members/:id', requireManager, async (req, res) => {
  const { name, phone, email, tier, points, is_active, password } = req.body;
  const fields = []; const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone.trim()); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email?.trim() || null); }
  if (tier !== undefined) { fields.push('tier = ?'); values.push(tier); }
  if (points !== undefined) { fields.push('points = ?'); values.push(parseInt(points)); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (password) { const hash = await bcrypt.hash(password, 12); fields.push('password_hash = ?'); values.push(hash); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  try {
    if (phone) {
      const [[existing]] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, req.params.id]);
      if (existing) return res.status(409).json({ error: 'Phone number already in use' });
    }
    values.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [[updated]] = await db.query(
      'SELECT id, name, phone, email, points, tier, is_active, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// STAFF MANAGEMENT (store_manager only)
// ══════════════════════════════════════════════════════════════════════════

router.get('/staff', requireManager, async (req, res) => {
  try {
    const scope = outletScope(req.user, 'u');
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.phone, u.role, u.is_active, u.outlet_id, u.created_at,
              ot.name as outlet_name, ot.store_code
       FROM users u
       LEFT JOIN outlets ot ON u.outlet_id = ot.id
       WHERE u.role IN ('staff', 'store_manager')
       ${scope.where ? 'AND ' + scope.where : ''}
       ORDER BY u.role DESC, u.name ASC`,
      scope.params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/staff', requireManager, async (req, res) => {
  const { name, phone, password, role, outlet_id } = req.body;
  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: 'name, phone, password, and role are required' });
  }
  if (!['staff', 'store_manager'].includes(role)) {
    return res.status(400).json({ error: 'role must be staff or store_manager' });
  }
  const effectiveOutletId = req.user.outlet_id || outlet_id || null;
  try {
    const [[existing]] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existing) return res.status(409).json({ error: 'Phone number already registered' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO users (name, phone, password_hash, role, outlet_id, is_active, email_verified)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [name.trim(), phone.trim(), hash, role, effectiveOutletId]
    );
    const [[created]] = await db.query(
      `SELECT u.id, u.name, u.phone, u.role, u.is_active, u.outlet_id, u.created_at,
              ot.name as outlet_name, ot.store_code
       FROM users u LEFT JOIN outlets ot ON u.outlet_id = ot.id
       WHERE u.id = ?`,
      [result.insertId]
    );
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/staff/:id', requireManager, async (req, res) => {
  const { name, phone, password, role, outlet_id, is_active } = req.body;
  const fields = []; const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone.trim()); }
  if (role !== undefined) {
    if (!['staff', 'store_manager'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    fields.push('role = ?'); values.push(role);
  }
  if (outlet_id !== undefined) { fields.push('outlet_id = ?'); values.push(outlet_id || null); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (password) { const hash = await bcrypt.hash(password, 12); fields.push('password_hash = ?'); values.push(hash); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  try {
    if (phone) {
      const [[existing]] = await db.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, req.params.id]);
      if (existing) return res.status(409).json({ error: 'Phone number already in use' });
    }
    values.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    const [[updated]] = await db.query(
      `SELECT u.id, u.name, u.phone, u.role, u.is_active, u.outlet_id, u.created_at,
              ot.name as outlet_name, ot.store_code
       FROM users u LEFT JOIN outlets ot ON u.outlet_id = ot.id WHERE u.id = ?`,
      [req.params.id]
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// WALK-IN COUNTER
// ══════════════════════════════════════════════════════════════════════════

router.post('/credit-points', requireAdmin, async (req, res) => {
  const { phone, bill_amount, walkin_order_no, note } = req.body;
  if (!phone || !bill_amount || !walkin_order_no)
    return res.status(400).json({ error: 'phone, bill_amount, and walkin_order_no are required' });
  const amount = parseFloat(bill_amount);
  if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Invalid bill amount' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[member]] = await conn.query(
      'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"',
      [phone]
    );
    if (!member) { await conn.rollback(); return res.status(404).json({ error: 'Member not found' }); }
    const EARN = parseInt(process.env.POINTS_PER_RINGGIT) || 1;
    const pointsEarned = Math.floor(amount * EARN);
    const newBalance = member.points + pointsEarned;
    await conn.query('UPDATE users SET points = ? WHERE id = ?', [newBalance, member.id]);
    const [wsResult] = await conn.query(
      `INSERT INTO walkin_sales (user_id, walkin_order_no, bill_amount, points_earned, staff_note, staff_id, outlet_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [member.id, walkin_order_no.trim(), amount, pointsEarned, note || null, req.user.id, req.user.outlet_id || null]
    );
    await conn.query(
      `INSERT INTO points_transactions (user_id, type, amount, balance, note) VALUES (?, 'earn', ?, ?, ?)`,
      [member.id, pointsEarned, newBalance, `Walk-in ${walkin_order_no} — RM${amount.toFixed(2)}`]
    );
    await conn.commit();
    res.json({
      success: true,
      walkin_sale_id: wsResult.insertId,
      member: { name: member.name, phone: member.phone, tier: member.tier },
      points_earned: pointsEarned,
      new_balance: newBalance,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

router.get('/walkin-sales', requireManager, async (req, res) => {
  const scope = outletScope(req.user, 'ws');
  try {
    const [rows] = await db.query(
      `SELECT ws.id, ws.walkin_order_no, ws.bill_amount, ws.points_earned, ws.staff_note, ws.created_at,
              ws.outlet_id, u.name as member_name, u.phone as member_phone, ot.name as outlet_name,
              COUNT(wsi.id) as item_count
       FROM walkin_sales ws
       JOIN users u ON ws.user_id = u.id
       LEFT JOIN outlets ot ON ws.outlet_id = ot.id
       LEFT JOIN walkin_sale_items wsi ON wsi.walkin_sale_id = ws.id
       ${scope.where ? 'WHERE ' + scope.where : ''}
       GROUP BY ws.id ORDER BY ws.created_at DESC LIMIT 200`,
      scope.params
    );
    if (rows.length) {
      const ids = rows.map(r => r.id);
      const [items] = await db.query(`SELECT * FROM walkin_sale_items WHERE walkin_sale_id IN (?)`, [ids]);
      const itemMap = {};
      items.forEach(it => { if (!itemMap[it.walkin_sale_id]) itemMap[it.walkin_sale_id] = []; itemMap[it.walkin_sale_id].push(it); });
      rows.forEach(r => { r.items = itemMap[r.id] || []; });
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/walkin-sales/:id/items', requireManager, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' });
  const scope = outletScope(req.user, 'ws');
  const [[sale]] = await db.query(
    `SELECT ws.id FROM walkin_sales ws WHERE ws.id = ? ${scope.where ? 'AND ' + scope.where : ''}`,
    [req.params.id, ...scope.params]
  );
  if (!sale) return res.status(404).json({ error: 'Walk-in sale not found' });
  try {
    await db.query('DELETE FROM walkin_sale_items WHERE walkin_sale_id = ?', [req.params.id]);
    const rows = items.map(it => [req.params.id, it.menu_item_id || null, it.item_name, it.quantity || 1, parseFloat(it.unit_price) || 0]);
    await db.query(`INSERT INTO walkin_sale_items (walkin_sale_id, menu_item_id, item_name, quantity, unit_price) VALUES ?`, [rows]);
    const [saved] = await db.query('SELECT * FROM walkin_sale_items WHERE walkin_sale_id = ?', [req.params.id]);
    res.json({ success: true, items: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// MEMBER HISTORY & ANALYTICS (manager only)
// ══════════════════════════════════════════════════════════════════════════

router.get('/members/:id/history', requireManager, async (req, res) => {
  try {
    const [[member]] = await db.query(
      'SELECT id, name, phone, points, tier FROM users WHERE id = ? AND role = "member"',
      [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const scope = outletScope(req.user, 'ws');
    const [sales] = await db.query(
      `SELECT ws.*, u.name as staff_name, ot.name as outlet_name
       FROM walkin_sales ws
       LEFT JOIN users u ON ws.staff_id = u.id
       LEFT JOIN outlets ot ON ws.outlet_id = ot.id
       WHERE ws.user_id = ? ${scope.where ? 'AND ' + scope.where : ''}
       ORDER BY ws.created_at DESC`,
      [req.params.id, ...scope.params]
    );
    for (const sale of sales) {
      const [items] = await db.query('SELECT * FROM walkin_sale_items WHERE walkin_sale_id = ?', [sale.id]);
      sale.items = items;
    }
    res.json({ member, sales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/members/:id/item-ranking', requireManager, async (req, res) => {
  try {
    const [[member]] = await db.query(
      'SELECT id, name, phone FROM users WHERE id = ? AND role = "member"',
      [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const scope = outletScope(req.user, 'ws');
    const [ranking] = await db.query(
      `SELECT wsi.menu_item_id, wsi.item_name, SUM(wsi.quantity) AS total_qty,
              SUM(wsi.quantity * wsi.unit_price) AS total_spend,
              COUNT(DISTINCT wsi.walkin_sale_id) AS order_count,
              MAX(ws.created_at) AS last_ordered
       FROM walkin_sale_items wsi
       JOIN walkin_sales ws ON wsi.walkin_sale_id = ws.id
       WHERE ws.user_id = ? ${scope.where ? 'AND ' + scope.where : ''}
       GROUP BY wsi.menu_item_id, wsi.item_name
       ORDER BY total_qty DESC, total_spend DESC LIMIT 5`,
      [req.params.id, ...scope.params]
    );
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total_visits, SUM(bill_amount) AS total_spend,
              AVG(bill_amount) AS avg_bill, MAX(created_at) AS last_visit, MIN(created_at) AS first_visit
       FROM walkin_sales ws WHERE user_id = ? ${scope.where ? 'AND ' + scope.where : ''}`,
      [req.params.id, ...scope.params]
    );
    res.json({ member, stats, ranking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// PRINT AGENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

router.get('/print-queue', requireAdmin, async (req, res) => {
  const scope = outletScope(req.user, 'o');
  try {
    const [orders] = await db.query(
      `SELECT o.id, o.order_no, o.total, o.notes, o.created_at,
              u.name as customer_name, u.phone as customer_phone, ot.name as outlet_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN outlets ot ON o.outlet_id = ot.id
       WHERE o.status = 'paid' AND o.printed_at IS NULL
       ${scope.where ? 'AND ' + scope.where : ''}
       ORDER BY o.created_at ASC`,
      scope.params
    );
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.item_name, oi.quantity, oi.unit_price, oi.notes,
                GROUP_CONCAT(oio.label ORDER BY oio.id SEPARATOR ', ') as options
         FROM order_items oi
         LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
         WHERE oi.order_id = ? GROUP BY oi.id`,
        [order.id]
      );
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/print-queue/:id/printed', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE orders SET printed_at = NOW() WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// SALES REPORT (manager only)
// ══════════════════════════════════════════════════════════════════════════

router.get('/reports/sales', requireManager, async (req, res) => {
  const { from, to, format = 'json' } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to dates required (YYYY-MM-DD)' });
  const scope = outletScope(req.user, 'o');
  try {
    const [summary] = await db.query(
      `SELECT COUNT(*) AS order_count, SUM(o.subtotal) AS gross_sales, SUM(o.discount) AS total_discounts,
              SUM(o.total) AS net_sales, SUM(o.points_earned) AS points_issued,
              SUM(o.points_redeemed) AS points_redeemed, COUNT(DISTINCT o.user_id) AS unique_customers
       FROM orders o WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status NOT IN ('cancelled')
       ${scope.where ? 'AND ' + scope.where : ''}`,
      [from, to, ...scope.params]
    );
    const [daily] = await db.query(
      `SELECT DATE(o.created_at) AS date, ot.name AS outlet, COUNT(*) AS orders, SUM(o.total) AS revenue
       FROM orders o JOIN outlets ot ON o.outlet_id = ot.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status NOT IN ('cancelled')
       ${scope.where ? 'AND ' + scope.where : ''}
       GROUP BY DATE(o.created_at), o.outlet_id ORDER BY date ASC`,
      [from, to, ...scope.params]
    );
    const [topItems] = await db.query(
      `SELECT oi.item_name, SUM(oi.quantity) AS qty_sold, SUM(oi.quantity * oi.unit_price) AS revenue
       FROM order_items oi JOIN orders o ON oi.order_id = o.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status NOT IN ('cancelled')
       ${scope.where ? 'AND ' + scope.where : ''}
       GROUP BY oi.item_name ORDER BY qty_sold DESC LIMIT 20`,
      [from, to, ...scope.params]
    );
    const [orders] = await db.query(
      `SELECT o.order_no, DATE(o.created_at) AS date, TIME(o.created_at) AS time,
              ot.name AS outlet, u.name AS customer, u.phone AS customer_phone,
              o.subtotal, o.discount, o.total, o.points_earned, o.points_redeemed, o.status
       FROM orders o JOIN users u ON o.user_id = u.id JOIN outlets ot ON o.outlet_id = ot.id
       WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.status NOT IN ('cancelled')
       ${scope.where ? 'AND ' + scope.where : ''}
       ORDER BY o.created_at DESC`,
      [from, to, ...scope.params]
    );
    if (format === 'csv') {
      const rows = [
        ['Order No','Date','Time','Outlet','Customer','Phone','Subtotal','Discount','Total','Points Earned','Points Redeemed','Status'],
        ...orders.map(o => [o.order_no,o.date,o.time,o.outlet,o.customer,o.customer_phone,o.subtotal,o.discount,o.total,o.points_earned,o.points_redeemed,o.status]),
      ];
      const csv = rows.map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales_${from}_${to}.csv"`);
      return res.send(csv);
    }
    res.json({ summary: summary[0], daily, topItems, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;