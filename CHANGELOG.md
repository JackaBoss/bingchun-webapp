# Changelog

All notable changes to Bing Chun 冰纯 Web App.

---

## [0.0.2] - 2026-04-16

### Added
- GPS store selector — auto-detects nearest outlet on login, fallback to manual selection
- Outlet Pinia store with localStorage persistence
- `GET /api/outlets` public endpoint
- `outlets` table with `lat`, `lng`, `phone` columns; coordinates set for Amerin Mall (WM-13) and Mantin (WM-23)
- Walk-in Sales admin view — operator can fill in items purchased at own pace
- `GET /api/admin/walkin-sales` endpoint with items attached
- `GET /api/admin/print-queue` and `POST /api/admin/print-queue/:id/printed` endpoints
- Label print agent (`print-agent/`) — Node.js script polling backend every 5s, sends ESC/POS to Xprinter XP-365B via TCP 9100
- `printed_at` column on `orders` table

### Changed
- Counter view simplified from 3 steps to 2 — item entry removed from counter staff flow
- Router guard: unauthenticated or outlet-less users redirected to store selector
- Cart syncs `outlet_id` from outlet store before placing order
- Profile page shows current outlet with change option

---

## [0.0.1] - 2026-03-27

### Added

**Infrastructure**
- Vue 3 + Pinia + Vue Router frontend deployed on Vercel (`bingchun-webapp.vercel.app`)
- Separate admin app on Vercel (`bingchun-admin-webapp.vercel.app`)
- Node.js/Express backend on Railway (`bingchun.up.railway.app`)
- MySQL 8 database on Railway

**Customer App**
- Member registration and login with phone number + JWT auth
- Auto token refresh with stale chunk error handling
- Full menu — 40+ items across 8 categories (Coffee, Ice Cream, Sundae, Milkshake, Jasmine Tea, Fruit Tea, Milk Tea, Fresh Juice)
- Item customization — size, sugar level, ice level, toppings
- Shopping cart with quantity controls and order notes
- Points earn and redeem (1 pt per RM1, redeem 100 pts = RM1)
- Member tiers — Bronze, Silver, Gold
- Voucher system — create, validate, redeem, toggle active
- Order placement and order history
- Order detail view with live status polling every 60s
- Toast notifications
- Profile view with points balance and tier
- Bottom navigation bar
- Empty cart state

**Admin App**
- Login with role-based access (owner sees all outlets, staff sees own)
- Dashboard with daily sales, order counts, top items
- Orders list and detail view
- Order status management (pending → paid → preparing → ready → completed)
- 58mm thermal receipt printing from order detail
- Menu management — add, edit, toggle availability, product images
- Members list with search
- Member history and purchase analytics
- Member edit
- Voucher management — create, toggle, view redemptions
- Walk-in counter — phone lookup → bill amount → credit points (2-step)
- Walk-in sales history with item tracking
- Multi-outlet support — `outlets` table, `store_code` WM-13 / WM-23, outlet-scoped queries

**Backend**
- JWT access + refresh token auth
- Outlet-scoped middleware for staff vs owner queries
- Points transaction ledger
- Voucher validation with min spend, discount types, points multiplier
- Order number generation (`BC-YYYYMMDD-XXXX`)

---

*Versioning starts at 0.0.1. No stable release yet — pre-launch development.*