const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, store_code, address, lat, lng, phone FROM outlets WHERE is_open = 1 ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('outlets error:', err);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

module.exports = router;