const express = require('express');
const db = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { notifyNewOrder } = require('../services/telegram');
const router = express.Router();

const POINTS_PER_RINGGIT = parseInt(process.env.POINTS_PER_RINGGIT) || 1;
const POINTS_REDEEM_RATE = parseFloat(process.env.POINTS_REDEEM_RATE) || 0.01;

async function generateOrderNo() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const [rows] = await db.query("SELECT COUNT(*) AS cnt FROM orders WHERE DATE(created_at) = CURDATE()");
  const seq = String(rows[0].cnt + 1).padStart(4, '0');
  return `BC-${today}-${seq}`;
}

// ── POST /api/orders ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { outlet_id, items, redeem_points = 0, notes } = req.body;
  if (!outlet_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'outlet_id and items[] are required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[user]] = await conn.query('SELECT id, name, phone, points FROM users WHERE id = ? FOR UPDATE', [req.user.id]);

    // Calculate subtotal from DB prices
    let subtotal = 0;
    const lineItems = [];
    for (const cartItem of items) {
      const [[menuItem]] = await conn.query(
        'SELECT id, name, base_price, is_available FROM menu_items WHERE id = ?',
        [cartItem.menu_item_id]
      );
      if (!menuItem || !menuItem.is_available) throw new Error(`Item ${cartItem.menu_item_id} is not available`);

      let unitPrice = parseFloat(menuItem.base_price);
      const chosenOptions = [];
      for (const optionId of (cartItem.option_ids || [])) {
        const [[opt]] = await conn.query('SELECT id, label, extra_price FROM item_options WHERE id = ?', [optionId]);
        if (!opt) throw new Error(`Invalid option ${optionId}`);
        unitPrice += parseFloat(opt.extra_price);
        chosenOptions.push(opt);
      }
      const lineTotal = unitPrice * cartItem.quantity;
      subtotal += lineTotal;
      lineItems.push({
        menu_item_id: menuItem.id,
        item_name: menuItem.name,
        quantity: cartItem.quantity,
        unit_price: unitPrice,
        notes: cartItem.notes || null,
        options: chosenOptions,
      });
    }

    // Points redemption
    let discount = 0; let pointsRedeemed = 0;
    if (redeem_points > 0) {
      if (redeem_points > user.points) throw new Error('Insufficient points');
      discount = redeem_points * POINTS_REDEEM_RATE;
      if (discount > subtotal) discount = subtotal;
      pointsRedeemed = Math.ceil(discount / POINTS_REDEEM_RATE);
    }
    const total = Math.max(0, subtotal - discount);
    const pointsEarned = Math.floor(total * POINTS_PER_RINGGIT);

    // Insert order
    const orderNo = await generateOrderNo();
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, outlet_id, order_no, subtotal, discount, total, points_earned, points_redeemed, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, outlet_id, orderNo, subtotal, discount, total, pointsEarned, pointsRedeemed, notes || null]
    );
    const orderId = orderResult.insertId;

    // Insert line items + options
    for (const line of lineItems) {
      const [itemResult] = await conn.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, item_name, notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.menu_item_id, line.quantity, line.unit_price, line.item_name, line.notes]
      );
      const orderItemId = itemResult.insertId;
      for (const opt of line.options) {
        await conn.query(
          `INSERT INTO order_item_options (order_item_id, option_id, label, extra_price) VALUES (?, ?, ?, ?)`,
          [orderItemId, opt.id, opt.label, opt.extra_price]
        );
      }
    }

    // Deduct redeemed points
    if (pointsRedeemed > 0) {
      const newBalance = user.points - pointsRedeemed;
      await conn.query('UPDATE users SET points = ? WHERE id = ?', [newBalance, user.id]);
      await conn.query(
        `INSERT INTO points_transactions (user_id, order_id, type, amount, balance, note) VALUES (?, ?, 'redeem', ?, ?, ?)`,
        [user.id, orderId, -pointsRedeemed, newBalance, `Redeemed for order ${orderNo}`]
      );
    }

    await conn.commit();

    // Fetch outlet name for notification
    const [[outlet]] = await db.query('SELECT name FROM outlets WHERE id = ?', [outlet_id]);

    // Attach options to lineItems for notification (already in memory)
    const [[createdOrder]] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    // Fire and forget — don't block the response
    notifyNewOrder({
      order: createdOrder,
      items: lineItems.map(i => ({ ...i, options: i.options })),
      customerName: user.name,
      customerPhone: user.phone,
      outletName: outlet?.name || `Outlet ${outlet_id}`,
    }).catch(err => console.error('Telegram notify failed:', err.message));

    res.status(201).json(createdOrder);
  } catch (err) {
    await conn.rollback();
    console.error('Order creation error:', err.message);
    if (err.message.includes('not available') || err.message.includes('points')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    conn.release();
  }
});

// ── GET /api/orders ──────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const offset = parseInt(req.query.offset) || 0;
  const [rows] = await db.query(
    `SELECT o.*, ot.name AS outlet_name FROM orders o
     JOIN outlets ot ON o.outlet_id = ot.id
     WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset]
  );
  res.json(rows);
});

// ── GET /api/orders/:id ──────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [[order]] = await db.query(
      `SELECT o.*, ot.name AS outlet_name FROM orders o
       JOIN outlets ot ON o.outlet_id = ot.id
       WHERE o.id = ? AND o.user_id = ?`,
      [req.params.id, req.user.id]
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

module.exports = router;