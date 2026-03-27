const express = require('express');
const db      = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/points ──────────────────────────────────────────
// Current balance + recent transaction history
router.get('/', requireAuth, async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT points, tier FROM users WHERE id = ?', [req.user.id]
    );

    const [transactions] = await db.query(
      `SELECT pt.*, o.order_no
       FROM points_transactions pt
       LEFT JOIN orders o ON pt.order_id = o.id
       WHERE pt.user_id = ?
       ORDER BY pt.created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    // Tier thresholds (lifetime spend logic could go here later)
    const tierInfo = {
      bronze: { label: 'Bronze', next: 'Silver', pointsNeeded: 500 },
      silver: { label: 'Silver', next: 'Gold',   pointsNeeded: 2000 },
      gold:   { label: 'Gold',   next: null,      pointsNeeded: null },
    };

    res.json({
      balance:      user.points,
      tier:         user.tier,
      tier_info:    tierInfo[user.tier],
      transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/points/preview?amount=XX&redeem=YY ──────────────
// Show how many points will be earned / redeemed before placing order
router.get('/preview', requireAuth, async (req, res) => {
  const amount = parseFloat(req.query.amount) || 0;
  const redeemPoints = parseInt(req.query.redeem) || 0;
  const RATE = parseFloat(process.env.POINTS_REDEEM_RATE) || 0.01;
  const EARN = parseInt(process.env.POINTS_PER_RINGGIT) || 1;

  const discount = redeemPoints * RATE;
  const finalTotal = Math.max(0, amount - discount);
  const wouldEarn = Math.floor(finalTotal * EARN);

  res.json({
    subtotal:       amount,
    redeem_points:  redeemPoints,
    discount:       discount.toFixed(2),
    total:          finalTotal.toFixed(2),
    points_earned:  wouldEarn,
  });
});

module.exports = router;
