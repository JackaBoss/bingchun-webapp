const express  = require('express');
const db       = require('../db/pool');
const bcrypt   = require('bcryptjs');
const { requireAdmin } = require('../middleware/admin');
const router   = express.Router();

// ── GET /api/admin/dashboard ───────────────────────────────────────────────
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[todaySales]] = await db.query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'`
    );
    const [[totalUsers]]    = await db.query('SELECT COUNT(*) as count FROM users');
    const [[pendingOrders]] = await db.query(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','paid','preparing')`
    );
    const [recentOrders] = await db.query(
      `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 20`
    );
    res.json({ today: todaySales, total_users: totalUsers.count, pending_orders: pendingOrders.count, recent_orders: recentOrders });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/admin/orders ──────────────────────────────────────────────────
router.get('/orders', requireAdmin, async (req, res) => {
  const status = req.query.status || null;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;
  let sql = `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
             FROM orders o JOIN outlets ot ON o.outlet_id = ot.id JOIN users u ON o.user_id = u.id`;
  const params = [];
  if (status) { sql += ' WHERE o.status = ?'; params.push(status); }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// ── GET /api/admin/orders/:id ──────────────────────────────────────────────
router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
       FROM orders o JOIN outlets ot ON o.outlet_id = ot.id JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`, [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      const [opts] = await db.query('SELECT * FROM order_item_options WHERE order_item_id = ?', [item.id]);
      item.options = opts;
    }
    order.items = items;
    res.json(order);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/admin/orders/:id/status ────────────────────────────────────
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','paid','preparing','ready','completed','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: `Invalid status` });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) { await conn.rollback(); return res.status(404).json({ error: 'Order not found' }); }
    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);
    if (status === 'paid' && order.points_earned > 0 && order.status === 'pending') {
      const [[user]] = await conn.query('SELECT points FROM users WHERE id = ?', [order.user_id]);
      const newBalance = user.points + order.points_earned;
      await conn.query('UPDATE users SET points = ? WHERE id = ?', [newBalance, order.user_id]);
      await conn.query(
        `INSERT INTO points_transactions (user_id, order_id, type, amount, balance, note) VALUES (?, ?, 'earn', ?, ?, ?)`,
        [order.user_id, order.id, order.points_earned, newBalance, `Earned from order ${order.order_no}`]
      );
    }
    await conn.commit();
    const [[updated]] = await db.query('SELECT * FROM orders WHERE id = ?', [order.id]);
    res.json(updated);
  } catch (err) { await conn.rollback(); console.error(err); res.status(500).json({ error: 'Server error' }); }
  finally { conn.release(); }
});

// ── GET /api/admin/menu ────────────────────────────────────────────────────
router.get('/menu', requireAdmin, async (req, res) => {
  const [categories] = await db.query('SELECT * FROM categories ORDER BY sort_order');
  const [items]      = await db.query('SELECT * FROM menu_items ORDER BY category_id, sort_order');
  const itemsByCategory = {};
  items.forEach(item => {
    if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = [];
    itemsByCategory[item.category_id].push(item);
  });
  res.json(categories.map(cat => ({ ...cat, items: itemsByCategory[cat.id] || [] })));
});

// ── PATCH /api/admin/menu/:id ──────────────────────────────────────────────
router.patch('/menu/:id', requireAdmin, async (req, res) => {
  const { name, name_zh, base_price, is_available, description } = req.body;
  const fields = []; const values = [];
  if (name         !== undefined) { fields.push('name = ?');         values.push(name); }
  if (name_zh      !== undefined) { fields.push('name_zh = ?');      values.push(name_zh); }
  if (base_price   !== undefined) { fields.push('base_price = ?');   values.push(base_price); }
  if (is_available !== undefined) { fields.push('is_available = ?'); values.push(is_available); }
  if (description  !== undefined) { fields.push('description = ?');  values.push(description); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  await db.query(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`, values);
  const [[item]] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  res.json(item);
});

// ── PATCH /api/admin/menu/:id/toggle ──────────────────────────────────────
router.patch('/menu/:id/toggle', requireAdmin, async (req, res) => {
  await db.query('UPDATE menu_items SET is_available = NOT is_available WHERE id = ?', [req.params.id]);
  const [[item]] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  res.json(item);
});

// ── GET /api/admin/orders/:id/receipt ─────────────────────────────────────
router.get('/orders/:id/receipt', requireAdmin, async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
       FROM orders o JOIN outlets ot ON o.outlet_id = ot.id JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    for (const item of items) {
      const [opts] = await db.query('SELECT * FROM order_item_options WHERE order_item_id = ?', [item.id]);
      item.options = opts;
    }
    const W = 32;
    const line = '='.repeat(W); const dash = '-'.repeat(W);
    const center = (s) => { const p = Math.max(0, Math.floor((W - s.length) / 2)); return ' '.repeat(p) + s; };
    const lr = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;
    let receipt = center('BING CHUN') + '\n' + center('冰纯茶饮') + '\n' + center(order.outlet_name) + '\n' + line + '\n';
    receipt += center(`Order: ${order.order_no}`) + '\n';
    receipt += center(new Date(order.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })) + '\n';
    receipt += center(`Customer: ${order.customer_name}`) + '\n' + line + '\n';
    for (const item of items) {
      receipt += lr(`${item.quantity}x ${item.item_name}`, `RM${(item.unit_price * item.quantity).toFixed(2)}`) + '\n';
      if (item.options.length > 0) receipt += `  ${item.options.map(o => o.label).join(', ')}\n`;
      if (item.notes) receipt += `  Note: ${item.notes}\n`;
    }
    receipt += dash + '\n' + lr('Subtotal', `RM${parseFloat(order.subtotal).toFixed(2)}`) + '\n';
    if (parseFloat(order.discount) > 0) receipt += lr('Points Discount', `-RM${parseFloat(order.discount).toFixed(2)}`) + '\n';
    receipt += lr('TOTAL', `RM${parseFloat(order.total).toFixed(2)}`) + '\n' + line + '\n';
    if (order.points_earned > 0) receipt += center(`+${order.points_earned} points earned`) + '\n';
    receipt += '\n' + center('Thank you!') + '\n' + center('谢谢光临') + '\n';
    res.type('text/plain').send(receipt);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/admin/member-lookup?phone=XXX ────────────────────────────────
router.get('/member-lookup', requireAdmin, async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  const [[member]] = await db.query(
    'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"', [phone]
  );
  if (!member) return res.status(404).json({ error: 'Member not found. Ask them to register first.' });
  res.json({ id: member.id, name: member.name, phone: member.phone, tier: member.tier, current_points: member.points });
});

// ── GET /api/admin/members ─────────────────────────────────────────────────
router.get('/members', requireAdmin, async (req, res) => {
  try {
    const [members] = await db.query(
      `SELECT id, name, phone, email, points, tier, is_active, role, created_at
       FROM users WHERE role = 'member' ORDER BY created_at DESC`
    );
    res.json(members);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── GET /api/admin/members/:id ────────────────────────────────────────────
router.get('/members/:id', requireAdmin, async (req, res) => {
  try {
    const [[member]] = await db.query(
      `SELECT id, name, phone, email, points, tier, is_active, role, created_at FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json(member);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── POST /api/admin/members ───────────────────────────────────────────────
// Create a new member account
router.post('/members', requireAdmin, async (req, res) => {
  const { name, phone, email, password, tier, points } = req.body;
  if (!name || !phone || !password) {
    return res.status(400).json({ error: 'name, phone, and password are required' });
  }
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH /api/admin/members/:id ─────────────────────────────────────────
// Update member: name, phone, email, tier, points, is_active, password
router.patch('/members/:id', requireAdmin, async (req, res) => {
  const { name, phone, email, tier, points, is_active, password } = req.body;
  const fields = []; const values = [];

  if (name      !== undefined) { fields.push('name = ?');      values.push(name.trim()); }
  if (phone     !== undefined) { fields.push('phone = ?');     values.push(phone.trim()); }
  if (email     !== undefined) { fields.push('email = ?');     values.push(email?.trim() || null); }
  if (tier      !== undefined) { fields.push('tier = ?');      values.push(tier); }
  if (points    !== undefined) { fields.push('points = ?');    values.push(parseInt(points)); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    fields.push('password_hash = ?');
    values.push(hash);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  try {
    // Check phone uniqueness if changing phone
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ══════════════════════════════════════════════════════════════════════════
//  WALK-IN COUNTER
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
      'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"', [phone]
    );
    if (!member) { await conn.rollback(); return res.status(404).json({ error: 'Member not found' }); }
    const EARN         = parseInt(process.env.POINTS_PER_RINGGIT) || 1;
    const pointsEarned = Math.floor(amount * EARN);
    const newBalance   = member.points + pointsEarned;
    await conn.query('UPDATE users SET points = ? WHERE id = ?', [newBalance, member.id]);
    const [wsResult] = await conn.query(
      `INSERT INTO walkin_sales (user_id, walkin_order_no, bill_amount, points_earned, staff_note, staff_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member.id, walkin_order_no.trim(), amount, pointsEarned, note || null, req.user.id]
    );
    await conn.query(
      `INSERT INTO points_transactions (user_id, type, amount, balance, note) VALUES (?, 'earn', ?, ?, ?)`,
      [member.id, pointsEarned, newBalance, `Walk-in ${walkin_order_no} — RM${amount.toFixed(2)}`]
    );
    await conn.commit();
    res.json({ success: true, walkin_sale_id: wsResult.insertId, member: { name: member.name, phone: member.phone, tier: member.tier }, points_earned: pointsEarned, new_balance: newBalance });
  } catch (err) { await conn.rollback(); console.error(err); res.status(500).json({ error: 'Server error' }); }
  finally { conn.release(); }
});

router.post('/walkin-sales/:id/items', requireAdmin, async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items array required' });
  const [[sale]] = await db.query('SELECT id FROM walkin_sales WHERE id = ?', [req.params.id]);
  if (!sale) return res.status(404).json({ error: 'Walk-in sale not found' });
  try {
    await db.query('DELETE FROM walkin_sale_items WHERE walkin_sale_id = ?', [req.params.id]);
    const rows = items.map(it => [req.params.id, it.menu_item_id || null, it.item_name, it.quantity || 1, parseFloat(it.unit_price) || 0]);
    await db.query(`INSERT INTO walkin_sale_items (walkin_sale_id, menu_item_id, item_name, quantity, unit_price) VALUES ?`, [rows]);
    const [saved] = await db.query('SELECT * FROM walkin_sale_items WHERE walkin_sale_id = ?', [req.params.id]);
    res.json({ success: true, items: saved });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ══════════════════════════════════════════════════════════════════════════
//  MEMBER PURCHASE HISTORY & ANALYTICS
// ══════════════════════════════════════════════════════════════════════════

router.get('/members/:id/history', requireAdmin, async (req, res) => {
  try {
    const [[member]] = await db.query(
      'SELECT id, name, phone, points, tier FROM users WHERE id = ? AND role = "member"', [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const [sales] = await db.query(
      `SELECT ws.*, u.name as staff_name FROM walkin_sales ws LEFT JOIN users u ON ws.staff_id = u.id
       WHERE ws.user_id = ? ORDER BY ws.created_at DESC`, [req.params.id]
    );
    for (const sale of sales) {
      const [items] = await db.query('SELECT * FROM walkin_sale_items WHERE walkin_sale_id = ?', [sale.id]);
      sale.items = items;
    }
    res.json({ member, sales });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/members/:id/item-ranking', requireAdmin, async (req, res) => {
  try {
    const [[member]] = await db.query(
      'SELECT id, name, phone FROM users WHERE id = ? AND role = "member"', [req.params.id]
    );
    if (!member) return res.status(404).json({ error: 'Member not found' });
    const [ranking] = await db.query(
      `SELECT wsi.menu_item_id, wsi.item_name,
         SUM(wsi.quantity)                  AS total_qty,
         SUM(wsi.quantity * wsi.unit_price) AS total_spend,
         COUNT(DISTINCT wsi.walkin_sale_id) AS order_count,
         MAX(ws.created_at)                 AS last_ordered
       FROM walkin_sale_items wsi
       JOIN walkin_sales ws ON wsi.walkin_sale_id = ws.id
       WHERE ws.user_id = ?
       GROUP BY wsi.menu_item_id, wsi.item_name
       ORDER BY total_qty DESC, total_spend DESC
       LIMIT 5`, [req.params.id]
    );
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total_visits, SUM(bill_amount) AS total_spend,
              AVG(bill_amount) AS avg_bill, MAX(created_at) AS last_visit, MIN(created_at) AS first_visit
       FROM walkin_sales WHERE user_id = ?`, [req.params.id]
    );
    res.json({ member, stats, ranking });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;