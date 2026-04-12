const express      = require('express');
const db           = require('../db/pool');
const { requireAdmin } = require('../middleware/admin');
const { requireAuth }  = require('../middleware/auth');
const router = express.Router();

// ═══════════════════════════════════════════════════════════════
//  ADMIN — VOUCHER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/admin/vouchers
router.get('/admin/vouchers', requireAdmin, async (req, res) => {
  try {
    const { sort = 'created_at', order = 'desc', filter = 'all' } = req.query;
    const validSorts  = ['created_at', 'used_count', 'expires_at', 'code'];
    const validOrders = ['asc', 'desc'];
    const sortCol = validSorts.includes(sort)   ? sort  : 'created_at';
    const sortDir = validOrders.includes(order) ? order : 'desc';

    let where = '';
    if (filter === 'active')   where = `WHERE v.is_active = 1 AND (v.expires_at IS NULL OR v.expires_at > NOW()) AND (v.starts_at IS NULL OR v.starts_at <= NOW())`;
    if (filter === 'expired')  where = `WHERE v.expires_at IS NOT NULL AND v.expires_at <= NOW()`;
    if (filter === 'inactive') where = `WHERE v.is_active = 0`;

    const [rows] = await db.query(
      `SELECT v.*, m.name AS free_item_name, u.name AS created_by_name
       FROM vouchers v
       LEFT JOIN menu_items m ON v.free_item_id = m.id
       LEFT JOIN users u      ON v.created_by   = u.id
       ${where}
       ORDER BY v.${sortCol} ${sortDir}`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/admin/vouchers/:id/redemptions
router.get('/admin/vouchers/:id/redemptions', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT vr.*, u.name AS member_name, u.phone AS member_phone, o.order_no
       FROM voucher_redemptions vr
       JOIN users u ON vr.user_id = u.id
       LEFT JOIN orders o ON vr.order_id = o.id
       WHERE vr.voucher_id = ?
       ORDER BY vr.redeemed_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/admin/vouchers
router.post('/admin/vouchers', requireAdmin, async (req, res) => {
  const { code, description, type, value, free_item_id, min_spend, max_discount,
          total_uses, per_user_limit, is_active, starts_at, expires_at } = req.body;

  if (!code || !type || value === undefined)
    return res.status(400).json({ error: 'code, type, and value are required' });

  const validTypes = ['fixed', 'percent', 'free_item', 'points_multiplier'];
  if (!validTypes.includes(type)) return res.status(400).json({ error: 'Invalid type' });
  if (type === 'percent' && (parseFloat(value) <= 0 || parseFloat(value) > 100))
    return res.status(400).json({ error: 'Percent value must be 1–100' });

  try {
    const [result] = await db.query(
      `INSERT INTO vouchers
         (code, description, type, value, free_item_id, min_spend, max_discount,
          total_uses, per_user_limit, is_active, starts_at, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(), description || null, type, parseFloat(value),
        free_item_id || null, parseFloat(min_spend) || 0,
        max_discount ? parseFloat(max_discount) : null,
        total_uses   ? parseInt(total_uses)     : null,
        parseInt(per_user_limit) || 1,
        is_active !== false ? 1 : 0,
        starts_at || null, expires_at || null, req.user.id,
      ]
    );
    const [[created]] = await db.query('SELECT * FROM vouchers WHERE id = ?', [result.insertId]);
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Voucher code already exists' });
    console.error(err); res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/vouchers/:id
router.patch('/admin/vouchers/:id', requireAdmin, async (req, res) => {
  const allowed = ['description','type','value','free_item_id','min_spend','max_discount',
                   'total_uses','per_user_limit','is_active','starts_at','expires_at'];
  const fields = []; const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[key] === '' ? null : req.body[key]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    await db.query(`UPDATE vouchers SET ${fields.join(', ')} WHERE id = ?`, values);
    const [[updated]] = await db.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// PATCH /api/admin/vouchers/:id/toggle
router.patch('/admin/vouchers/:id/toggle', requireAdmin, async (req, res) => {
  try {
    await db.query('UPDATE vouchers SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
    const [[updated]] = await db.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ═══════════════════════════════════════════════════════════════
//  CUSTOMER — VALIDATE & REDEEM
// ═══════════════════════════════════════════════════════════════

// POST /api/vouchers/validate
router.post('/vouchers/validate', requireAuth, async (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const [[voucher]] = await db.query(
      `SELECT v.*, m.name AS free_item_name, m.base_price AS free_item_price
       FROM vouchers v LEFT JOIN menu_items m ON v.free_item_id = m.id
       WHERE v.code = ?`,
      [code.trim().toUpperCase()]
    );

    if (!voucher)          return res.status(404).json({ valid: false, message: 'Invalid voucher code' });
    if (!voucher.is_active) return res.status(400).json({ valid: false, message: 'Voucher is not active' });

    const now = new Date();
    if (voucher.starts_at && new Date(voucher.starts_at) > now)
      return res.status(400).json({ valid: false, message: 'Voucher is not yet valid' });
    if (voucher.expires_at && new Date(voucher.expires_at) < now)
      return res.status(400).json({ valid: false, message: 'Voucher has expired' });
    if (voucher.total_uses !== null && voucher.used_count >= voucher.total_uses)
      return res.status(400).json({ valid: false, message: 'Voucher has reached its usage limit' });

    const [[userUses]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM voucher_redemptions WHERE voucher_id = ? AND user_id = ?',
      [voucher.id, req.user.id]
    );
    if (userUses.cnt >= voucher.per_user_limit)
      return res.status(400).json({ valid: false, message: 'You have already used this voucher' });

    const orderSubtotal = parseFloat(subtotal) || 0;
    if (voucher.min_spend > 0 && orderSubtotal < voucher.min_spend)
      return res.status(400).json({
        valid: false,
        message: `Minimum spend of RM${parseFloat(voucher.min_spend).toFixed(2)} required`,
      });

    let discountAmount = 0;
    let label = '';

    if (voucher.type === 'fixed') {
      discountAmount = parseFloat(voucher.value);
      label = `RM${discountAmount.toFixed(2)} off`;
    } else if (voucher.type === 'percent') {
      discountAmount = (orderSubtotal * parseFloat(voucher.value)) / 100;
      if (voucher.max_discount) discountAmount = Math.min(discountAmount, parseFloat(voucher.max_discount));
      discountAmount = Math.round(discountAmount * 100) / 100;
      label = `${voucher.value}% off${voucher.max_discount ? ` (max RM${parseFloat(voucher.max_discount).toFixed(2)})` : ''}`;
    } else if (voucher.type === 'free_item') {
      discountAmount = parseFloat(voucher.free_item_price) || 0;
      label = `Free ${voucher.free_item_name}`;
    } else if (voucher.type === 'points_multiplier') {
      discountAmount = 0;
      label = `${voucher.value}× points on this order`;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);

    res.json({
      valid: true,
      voucher_id: voucher.id,
      type: voucher.type,
      value: voucher.value,
      discount_amount: discountAmount,
      points_multiplier: voucher.type === 'points_multiplier' ? parseFloat(voucher.value) : null,
      free_item_name: voucher.free_item_name || null,
      label,
      message: `Voucher applied: ${label}`,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/vouchers/redeem  — called after order is placed
router.post('/vouchers/redeem', requireAuth, async (req, res) => {
  const { voucher_id, order_id, discount_applied } = req.body;
  if (!voucher_id) return res.status(400).json({ error: 'voucher_id required' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[voucher]] = await conn.query('SELECT * FROM vouchers WHERE id = ? FOR UPDATE', [voucher_id]);
    if (!voucher || !voucher.is_active) {
      await conn.rollback(); return res.status(400).json({ error: 'Voucher no longer valid' });
    }
    if (voucher.total_uses !== null && voucher.used_count >= voucher.total_uses) {
      await conn.rollback(); return res.status(400).json({ error: 'Voucher limit reached' });
    }
    await conn.query('UPDATE vouchers SET used_count = used_count + 1 WHERE id = ?', [voucher_id]);
    await conn.query(
      `INSERT INTO voucher_redemptions (voucher_id, user_id, order_id, discount_applied)
       VALUES (?, ?, ?, ?)`,
      [voucher_id, req.user.id, order_id || null, parseFloat(discount_applied) || 0]
    );
    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback(); console.error(err); res.status(500).json({ error: 'Server error' });
  } finally { conn.release(); }
});

module.exports = router;