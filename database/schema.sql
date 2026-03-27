-- ============================================================
--  Bing Chun Member Ordering App — Database Schema
--  Engine: MySQL 8.0+
--  Run once:  mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS bing_chun_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bing_chun_app;

-- 1. USERS
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone         VARCHAR(20)  NOT NULL UNIQUE,
  email         VARCHAR(120) NULL UNIQUE,
  name          VARCHAR(100) NOT NULL DEFAULT '',
  password_hash VARCHAR(255) NOT NULL,
  points        INT UNSIGNED NOT NULL DEFAULT 0,
  tier          ENUM('bronze','silver','gold') NOT NULL DEFAULT 'bronze',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. CATEGORIES
CREATE TABLE categories (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(80)  NOT NULL,
  name_zh    VARCHAR(80)  NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1
);

-- 3. MENU ITEMS
CREATE TABLE menu_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  name         VARCHAR(120) NOT NULL,
  name_zh      VARCHAR(120) NULL,
  description  TEXT         NULL,
  base_price   DECIMAL(8,2) NOT NULL,
  image_url    VARCHAR(255) NULL,
  is_available TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- 4. ITEM OPTIONS
CREATE TABLE item_option_groups (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  item_id      INT UNSIGNED NOT NULL,
  name         VARCHAR(80)  NOT NULL,
  is_required  TINYINT(1)   NOT NULL DEFAULT 1,
  multi_select TINYINT(1)   NOT NULL DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

CREATE TABLE item_options (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  option_group_id INT UNSIGNED NOT NULL,
  label           VARCHAR(80)  NOT NULL,
  extra_price     DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  sort_order      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (option_group_id) REFERENCES item_option_groups(id) ON DELETE CASCADE
);

-- 5. OUTLETS
CREATE TABLE outlets (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  address TEXT         NOT NULL,
  lat     DECIMAL(10,7) NULL,
  lng     DECIMAL(10,7) NULL,
  phone   VARCHAR(20)  NULL,
  is_open TINYINT(1)   NOT NULL DEFAULT 1
);

INSERT INTO outlets (name, address) VALUES
  ('Bing Chun — Amerin Mall', 'Amerin Mall, Seri Kembangan, Selangor'),
  ('Bing Chun — Mantin',      'Mantin, Negeri Sembilan');

-- 6. ORDERS
CREATE TABLE orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  outlet_id       INT UNSIGNED NOT NULL,
  order_no        VARCHAR(20)  NOT NULL UNIQUE,
  status          ENUM('pending','paid','preparing','ready','completed','cancelled')
                               NOT NULL DEFAULT 'pending',
  subtotal        DECIMAL(10,2) NOT NULL,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total           DECIMAL(10,2) NOT NULL,
  points_earned   INT UNSIGNED NOT NULL DEFAULT 0,
  points_redeemed INT UNSIGNED NOT NULL DEFAULT 0,
  payment_method  ENUM('online','cash','points') NOT NULL DEFAULT 'online',
  payment_ref     VARCHAR(100) NULL,
  notes           TEXT         NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE RESTRICT,
  FOREIGN KEY (outlet_id) REFERENCES outlets(id)  ON DELETE RESTRICT,
  INDEX idx_user_id  (user_id),
  INDEX idx_status   (status),
  INDEX idx_created  (created_at)
);

-- 7. ORDER ITEMS
CREATE TABLE order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  menu_item_id INT UNSIGNED NOT NULL,
  quantity     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price   DECIMAL(8,2) NOT NULL,
  item_name    VARCHAR(120) NOT NULL,
  notes        VARCHAR(255) NULL,
  FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
);

-- 8. ORDER ITEM OPTIONS
CREATE TABLE order_item_options (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT UNSIGNED NOT NULL,
  option_id     INT UNSIGNED NOT NULL,
  label         VARCHAR(80)  NOT NULL,
  extra_price   DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id)     REFERENCES item_options(id) ON DELETE RESTRICT
);

-- 9. POINTS TRANSACTIONS
CREATE TABLE points_transactions (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  order_id   INT UNSIGNED NULL,
  type       ENUM('earn','redeem','expire','adjust') NOT NULL,
  amount     INT NOT NULL,
  balance    INT UNSIGNED NOT NULL,
  note       VARCHAR(255) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  INDEX idx_user_points (user_id, created_at)
);

-- 10. REFRESH TOKENS
CREATE TABLE refresh_tokens (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token)
);

-- ============================================================
-- SEED: Real Bing Chun Menu (from sales data)
-- ============================================================

INSERT INTO categories (id, name, name_zh, sort_order) VALUES
  (1, 'Ice Cream',   '冰淇淋',    1),
  (2, 'Sundae',      '圣代',      2),
  (3, 'Milkshake',   '奶昔',      3),
  (4, 'Jasmine Tea', '茉莉茶',    4),
  (5, 'Fruit Tea',   '果茶',      5),
  (6, 'Milk Tea',    '奶茶',      6),
  (7, 'Fresh Juice', '鲜榨果汁',  7);

-- ICE CREAM
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (1,  1, 'Original Ice Cream',          '原味冰淇淋',           2.00, 1),
  (2,  1, 'Chocolate Ice Cream',         '巧克力冰淇淋',         2.00, 2),
  (3,  1, 'Chocolate Mix Ice Cream',     '巧克力混合冰淇淋',     2.00, 3),
  (4,  1, 'Mixed Orig Matcha Ice Cream', '原味抹茶混合冰淇淋',   4.00, 4);

-- SUNDAES (12-oz cup)
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (5,  2, 'Strawberry Sundae',             '草莓圣代',             4.99, 1),
  (6,  2, 'Mango Sundae',                  '芒果圣代',             4.99, 2),
  (7,  2, 'Mulberry Sundae',               '桑葚圣代',             4.99, 3),
  (8,  2, 'Blueberry Sundae',              '蓝莓圣代',             4.99, 4),
  (9,  2, 'Cherry Sundae',                 '樱桃圣代',             5.50, 5),
  (10, 2, 'Apple Sundae',                  '苹果圣代',             5.00, 6),
  (11, 2, 'Chocolate Oreo Sundae',         '巧克力奥利奥圣代',     5.50, 7),
  (12, 2, 'Choc Vanilla Oreo Sundae',      '巧克力香草奥利奥圣代', 5.00, 8),
  (13, 2, 'Brown Sugar Bubble Sundae',     '黑糖珍珠圣代',         5.00, 9),
  (14, 2, 'Chocolate Pearl Sundae',        '巧克力珍珠圣代',       5.00, 10),
  (15, 2, 'Chocolate Blueberry Sundae',    '巧克力蓝莓圣代',       5.50, 11),
  (16, 2, 'Chocolate Biscuit Sundae',      '巧克力饼干圣代',       5.50, 12);

-- MILKSHAKES
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (17, 3, 'Chocolate Milkshake',       '巧克力奶昔',           5.99, 1),
  (18, 3, 'Chocolate Oreo Milkshake',  '巧克力奥利奥奶昔',     5.99, 2);

-- JASMINE TEA (M base price, L +RM1-2)
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (19, 4, 'Strawberry Coconut Jasmine MT',  '草莓椰子茉莉奶茶',       6.50, 1),
  (20, 4, 'Mango Crystal Boba Jasmine MT',  '芒果水晶珍珠茉莉奶茶',   6.00, 2),
  (21, 4, 'Lychee Jasmine MT',              '荔枝茉莉奶茶',           5.50, 3),
  (22, 4, 'Jasmine Tea',                    '茉莉茶',                 3.00, 4),
  (23, 4, 'Apple Jasmine Tea',              '苹果茉莉茶',             7.00, 5),
  (24, 4, 'Jasmine Honey Tea',              '茉莉蜜茶',               5.00, 6),
  (25, 4, 'Lychee Jasmine Tea',             '荔枝茉莉茶',             5.00, 7);

-- FRUIT TEA
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (26, 5, 'Strawberry Mulberry Tea',       '草莓桑葚茶',       8.00, 1),
  (27, 5, 'Strawberry Mango Lemon Tea',    '草莓芒果柠檬茶',   5.99, 2),
  (28, 5, 'Lemon Green Tea',               '柠檬绿茶',         3.99, 3),
  (29, 5, 'Lemon Black Tea',               '柠檬红茶',         4.00, 4),
  (30, 5, 'Grapes Crystal Tea',            '葡萄水晶茶',       5.99, 5),
  (31, 5, 'Blueberry Fruit Tea',           '蓝莓果茶',         6.99, 6),
  (32, 5, 'Mulberry Popping Pearls Juice', '桑葚爆珠果汁',     6.99, 7),
  (33, 5, 'Cherries Green Tea',            '樱桃绿茶',         5.99, 8),
  (34, 5, 'Cherry Strawberry Tea',         '樱桃草莓茶',       5.99, 9),
  (35, 5, 'Strawberry Lemon Tea',          '草莓柠檬茶',       5.99, 10),
  (36, 5, 'Iced Apple Tea',                '冰苹果茶',         5.95, 11);

-- MILK TEA
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (37, 6, 'Boba Milk Tea',      '珍珠奶茶',   5.50, 1),
  (38, 6, 'Original Milk Tea',  '原味奶茶',   5.50, 2),
  (39, 6, 'Coconut Milk Tea',   '椰子奶茶',   5.00, 3);

-- FRESH JUICE
INSERT INTO menu_items (id, category_id, name, name_zh, base_price, sort_order) VALUES
  (40, 7, 'Fresh Lemonade Juice', '鲜榨柠檬汁', 3.00, 1);


-- ============================================================
-- SIZE OPTIONS (for drinks with M/L variants)
-- ============================================================

-- Items with both M and L sizes (base = M price)
INSERT INTO item_option_groups (item_id, name, is_required, multi_select) VALUES
  (19, 'Size', 1, 0), (20, 'Size', 1, 0), (21, 'Size', 1, 0),
  (37, 'Size', 1, 0), (39, 'Size', 1, 0);

-- Strawberry Coconut Jasmine MT: M=6.50, L=+1.00
INSERT INTO item_options (option_group_id, label, extra_price, sort_order) VALUES
  ((SELECT id FROM item_option_groups WHERE item_id=19 AND name='Size'), 'M (500ml)', 0.00, 1),
  ((SELECT id FROM item_option_groups WHERE item_id=19 AND name='Size'), 'L (700ml)', 1.00, 2);
-- Mango Crystal Boba Jasmine MT: M=6.00, L=+1.00
INSERT INTO item_options (option_group_id, label, extra_price, sort_order) VALUES
  ((SELECT id FROM item_option_groups WHERE item_id=20 AND name='Size'), 'M (500ml)', 0.00, 1),
  ((SELECT id FROM item_option_groups WHERE item_id=20 AND name='Size'), 'L (700ml)', 1.00, 2);
-- Lychee Jasmine MT: M=5.50, L=same
INSERT INTO item_options (option_group_id, label, extra_price, sort_order) VALUES
  ((SELECT id FROM item_option_groups WHERE item_id=21 AND name='Size'), 'M (500ml)', 0.00, 1),
  ((SELECT id FROM item_option_groups WHERE item_id=21 AND name='Size'), 'L (700ml)', 0.00, 2);
-- Boba Milk Tea: M=5.50, L=+1.50
INSERT INTO item_options (option_group_id, label, extra_price, sort_order) VALUES
  ((SELECT id FROM item_option_groups WHERE item_id=37 AND name='Size'), 'M (500ml)', 0.00, 1),
  ((SELECT id FROM item_option_groups WHERE item_id=37 AND name='Size'), 'L (700ml)', 1.50, 2);
-- Coconut Milk Tea: M=5.00, L=+2.00
INSERT INTO item_options (option_group_id, label, extra_price, sort_order) VALUES
  ((SELECT id FROM item_option_groups WHERE item_id=39 AND name='Size'), 'M (500ml)', 0.00, 1),
  ((SELECT id FROM item_option_groups WHERE item_id=39 AND name='Size'), 'L (700ml)', 2.00, 2);


-- ============================================================
-- SUGAR LEVEL for all drink items (19-40)
-- ============================================================
INSERT INTO item_option_groups (item_id, name, is_required, multi_select)
SELECT id, 'Sugar Level', 1, 0 FROM menu_items WHERE id BETWEEN 19 AND 40;

INSERT INTO item_options (option_group_id, label, extra_price, sort_order)
SELECT g.id, s.label, 0.00, s.sort_order
FROM item_option_groups g
CROSS JOIN (
  SELECT '100% Sugar' AS label, 1 AS sort_order UNION ALL
  SELECT '75% Sugar', 2 UNION ALL
  SELECT '50% Sugar', 3 UNION ALL
  SELECT '25% Sugar', 4 UNION ALL
  SELECT '0% Sugar', 5
) s
WHERE g.name = 'Sugar Level' AND g.item_id BETWEEN 19 AND 40;


-- ============================================================
-- ICE LEVEL for all drink items (19-40)
-- ============================================================
INSERT INTO item_option_groups (item_id, name, is_required, multi_select)
SELECT id, 'Ice Level', 1, 0 FROM menu_items WHERE id BETWEEN 19 AND 40;

INSERT INTO item_options (option_group_id, label, extra_price, sort_order)
SELECT g.id, i.label, 0.00, i.sort_order
FROM item_option_groups g
CROSS JOIN (
  SELECT 'Normal Ice' AS label, 1 AS sort_order UNION ALL
  SELECT 'Less Ice', 2 UNION ALL
  SELECT 'No Ice', 3
) i
WHERE g.name = 'Ice Level' AND g.item_id BETWEEN 19 AND 40;


-- ============================================================
-- TOPPING ADD-ONS (optional, multi-select) for drink items
-- ============================================================
INSERT INTO item_option_groups (item_id, name, is_required, multi_select)
SELECT id, 'Add Toppings', 0, 1 FROM menu_items WHERE id BETWEEN 19 AND 40;

INSERT INTO item_options (option_group_id, label, extra_price, sort_order)
SELECT g.id, t.label, t.extra_price, t.sort_order
FROM item_option_groups g
CROSS JOIN (
  SELECT 'Pearl'         AS label, 1.00 AS extra_price, 1 AS sort_order UNION ALL
  SELECT 'Coconut Jelly',          1.00,                2 UNION ALL
  SELECT 'Crystal Ball',           1.50,                3 UNION ALL
  SELECT 'Oreo Crumbs',            1.00,                4
) t
WHERE g.name = 'Add Toppings' AND g.item_id BETWEEN 19 AND 40;
