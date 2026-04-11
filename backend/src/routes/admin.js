const express = require('express');
const db      = require('../db/pool');
const { requireAdmin } = require('../middleware/admin');

const router = express.Router();

// ── GET /api/admin/dashboard ─────────────────────────────────
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [[todaySales]] = await db.query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(total),0) as revenue
       FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'`
    );
    const [[totalUsers]] = await db.query('SELECT COUNT(*) as count FROM users');
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
    res.json({
      today: todaySales,
      total_users: totalUsers.count,
      pending_orders: pendingOrders.count,
      recent_orders: recentOrders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/orders ────────────────────────────────────
router.get('/orders', requireAdmin, async (req, res) => {
  const status = req.query.status || null;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
  const offset = parseInt(req.query.offset) || 0;

  let sql = `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
             FROM orders o
             JOIN outlets ot ON o.outlet_id = ot.id
             JOIN users u ON o.user_id = u.id`;
  const params = [];

  if (status) {
    sql += ' WHERE o.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// ── GET /api/admin/orders/:id ────────────────────────────────
router.get('/orders/:id', requireAdmin, async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, ot.name as outlet_name, u.name as customer_name, u.phone as customer_phone
       FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       JOIN users u ON o.user_id = u.id
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PATCH /api/admin/orders/:id/status ───────────────────────
router.patch('/orders/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['pending','paid','preparing','ready','completed','cancelled'];
  if (!valid.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be: ${valid.join(', ')}` });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      await conn.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    await conn.query('UPDATE orders SET status = ? WHERE id = ?', [status, order.id]);

    // Award points when order is marked as paid or completed
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
    res.json(updated);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    conn.release();
  }
});

// ── GET /api/admin/menu ──────────────────────────────────────
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

// ── PATCH /api/admin/menu/:id ────────────────────────────────
router.patch('/menu/:id', requireAdmin, async (req, res) => {
  const { name, name_zh, base_price, is_available, description } = req.body;
  const fields = [];
  const values = [];

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

// ── PATCH /api/admin/menu/:id/toggle ─────────────────────────
router.patch('/menu/:id/toggle', requireAdmin, async (req, res) => {
  await db.query('UPDATE menu_items SET is_available = NOT is_available WHERE id = ?', [req.params.id]);
  const [[item]] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
  res.json(item);
});

// ── GET /api/admin/orders/:id/receipt ─────────────────────────
// Returns plain text receipt for thermal printer
router.get('/orders/:id/receipt', requireAdmin, async (req, res) => {
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

    const W = 32; // chars width for 58mm printer
    const line = '='.repeat(W);
    const dash = '-'.repeat(W);
    const center = (s) => { const pad = Math.max(0, Math.floor((W - s.length) / 2)); return ' '.repeat(pad) + s; };
    const lr = (l, r) => l + ' '.repeat(Math.max(1, W - l.length - r.length)) + r;

    let receipt = '';
    receipt += center('BING CHUN') + '\n';
    receipt += center('冰纯茶饮') + '\n';
    receipt += center(order.outlet_name) + '\n';
    receipt += line + '\n';
    receipt += center(`Order: ${order.order_no}`) + '\n';
    receipt += center(new Date(order.created_at).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })) + '\n';
    receipt += center(`Customer: ${order.customer_name}`) + '\n';
    receipt += line + '\n';

    for (const item of items) {
      receipt += lr(`${item.quantity}x ${item.item_name}`, `RM${(item.unit_price * item.quantity).toFixed(2)}`) + '\n';
      if (item.options.length > 0) {
        receipt += `   ${item.options.map(o => o.label).join(', ')}\n`;
      }
      if (item.notes) receipt += `   Note: ${item.notes}\n`;
    }

    receipt += dash + '\n';
    receipt += lr('Subtotal', `RM${parseFloat(order.subtotal).toFixed(2)}`) + '\n';
    if (parseFloat(order.discount) > 0) {
      receipt += lr('Points Discount', `-RM${parseFloat(order.discount).toFixed(2)}`) + '\n';
    }
    receipt += lr('TOTAL', `RM${parseFloat(order.total).toFixed(2)}`) + '\n';
    receipt += line + '\n';
    if (order.points_earned > 0) {
      receipt += center(`+${order.points_earned} points earned`) + '\n';
    }
    receipt += '\n';
    receipt += center('Thank you!') + '\n';
    receipt += center('谢谢光临') + '\n';

    res.type('text/plain').send(receipt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


// ── POST /api/admin/credit-points ─────────────────────────────
// Staff credits walk-in points by phone number + bill amount
router.post('/credit-points', requireAdmin, async (req, res) => {
  const { phone, bill_amount, note } = req.body

  if (!phone || !bill_amount) {
    return res.status(400).json({ error: 'Phone and bill_amount required' })
  }

  const amount = parseFloat(bill_amount)
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bill amount' })
  }

  try {
    // Find member by phone
    const [[member]] = await db.query(
      'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"',
      [phone]
    )

    if (!member) {
      return res.status(404).json({ error: 'Member not found' })
    }

    const EARN = parseInt(process.env.POINTS_PER_RINGGIT) || 1
    const pointsEarned = Math.floor(amount * EARN)

    // Credit points + log transaction in one go
    await db.query('START TRANSACTION')
    try {
      await db.query(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [pointsEarned, member.id]
      )
      await db.query(
        `INSERT INTO points_transactions 
         (user_id, points, type, source, bill_amount, staff_note, created_at)
         VALUES (?, ?, 'earn', 'walkin', ?, ?, NOW())`,
        [member.id, pointsEarned, amount, note || 'Walk-in sale']
      )
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }

    const [[updated]] = await db.query(
      'SELECT points FROM users WHERE id = ?',
      [member.id]
    )

    res.json({
      success: true,
      member: {
        name: member.name,
        phone: member.phone,
        tier: member.tier,
      },
      points_earned: pointsEarned,
      new_balance: updated.points,
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/admin/member-lookup?phone=XXX ────────────────────
router.get('/member-lookup', requireAdmin, async (req, res) => {
  const { phone } = req.query
  if (!phone) return res.status(400).json({ error: 'Phone required' })

  const [[member]] = await db.query(
    'SELECT id, name, phone, points, tier FROM users WHERE phone = ? AND role = "member"',
    [phone]
  )
  if (!member) return res.status(404).json({ error: 'Member not found. Ask them to register first.' })

  res.json({
    id: member.id,
    name: member.name,
    phone: member.phone,
    tier: member.tier,
    current_points: member.points,
  })
})