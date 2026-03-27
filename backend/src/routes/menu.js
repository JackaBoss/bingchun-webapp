const express = require('express');
const db      = require('../db/pool');

const router = express.Router();

// ── GET /api/menu ────────────────────────────────────────────
// Returns all active categories with their items and options
router.get('/', async (req, res) => {
  try {
    // 1. Categories
    const [categories] = await db.query(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order'
    );

    // 2. All available items
    const [items] = await db.query(
      `SELECT * FROM menu_items
       WHERE is_available = 1
       ORDER BY category_id, sort_order`
    );

    // 3. All option groups for those items
    const itemIds = items.map(i => i.id);
    let groups = [], options = [];

    if (itemIds.length > 0) {
      [groups]  = await db.query(
        'SELECT * FROM item_option_groups WHERE item_id IN (?)', [itemIds]
      );
      const groupIds = groups.map(g => g.id);
      if (groupIds.length > 0) {
        [options] = await db.query(
          'SELECT * FROM item_options WHERE option_group_id IN (?) ORDER BY sort_order',
          [groupIds]
        );
      }
    }

    // 4. Assemble nested structure
    const optionsByGroup = {};
    options.forEach(opt => {
      if (!optionsByGroup[opt.option_group_id]) optionsByGroup[opt.option_group_id] = [];
      optionsByGroup[opt.option_group_id].push(opt);
    });

    const groupsByItem = {};
    groups.forEach(g => {
      if (!groupsByItem[g.item_id]) groupsByItem[g.item_id] = [];
      groupsByItem[g.item_id].push({ ...g, options: optionsByGroup[g.id] || [] });
    });

    const itemsByCategory = {};
    items.forEach(item => {
      if (!itemsByCategory[item.category_id]) itemsByCategory[item.category_id] = [];
      itemsByCategory[item.category_id].push({
        ...item,
        option_groups: groupsByItem[item.id] || [],
      });
    });

    const result = categories.map(cat => ({
      ...cat,
      items: itemsByCategory[cat.id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error('Menu error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/menu/item/:id ───────────────────────────────────
router.get('/item/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });

    const item = rows[0];
    const [groups] = await db.query(
      'SELECT * FROM item_option_groups WHERE item_id = ?', [item.id]
    );
    const groupIds = groups.map(g => g.id);
    let options = [];
    if (groupIds.length > 0) {
      [options] = await db.query(
        'SELECT * FROM item_options WHERE option_group_id IN (?) ORDER BY sort_order',
        [groupIds]
      );
    }

    const optionsByGroup = {};
    options.forEach(o => {
      if (!optionsByGroup[o.option_group_id]) optionsByGroup[o.option_group_id] = [];
      optionsByGroup[o.option_group_id].push(o);
    });

    item.option_groups = groups.map(g => ({
      ...g,
      options: optionsByGroup[g.id] || [],
    }));

    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
