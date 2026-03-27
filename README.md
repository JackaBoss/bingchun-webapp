# Bing Chun — Member Ordering App 冰纯茶饮

A Mixue-style member ordering web app for Bing Chun bubble tea & ice cream.
Built with **Vue.js 3** + **Node.js/Express** + **MySQL**.

---

## What This App Does

Customers scan a QR code or visit a link → register/login with phone number → browse the menu → customize drinks (size, sugar, ice, toppings) → add to cart → redeem points → place order → track order status.

You (the owner) use an admin panel to manage the menu, update order status, and view all orders.

---

## Understanding the Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Customer Phone  │     │  Admin PC/Phone  │
│  (Vue.js app)    │     │  (Vue.js admin)  │
└───────┬─────────┘     └────────┬─────────┘
        │  HTTP requests         │
        └────────┬───────────────┘
                 ▼
        ┌────────────────┐
        │  Node.js API   │  ← Express server (port 3000)
        │  /api/auth     │     Handles login, JWT tokens
        │  /api/menu     │     Serves menu data
        │  /api/orders   │     Creates & tracks orders
        │  /api/points   │     Points balance & history
        └────────┬───────┘
                 │  SQL queries
                 ▼
        ┌────────────────┐
        │  MySQL 8.0     │  ← Stores everything
        │  bing_chun_app │     Users, menu, orders, points
        └────────────────┘
```

### Key Concepts Explained

- **Frontend (Vue.js)** — What the customer sees. Runs in their browser. Sends requests to your backend API.
- **Backend (Node.js + Express)** — Your server. Receives requests, talks to the database, sends back JSON data.
- **MySQL** — The database. Stores all your data in tables (like Excel sheets).
- **JWT Tokens** — How the app knows who is logged in. After login, the server gives the customer a "token" (like a wristband) that they show with every request.
- **Pinia** — Vue's state management. Keeps track of the cart, logged-in user, etc. while the customer browses.

---

## Windows Setup (Step by Step)

### Prerequisites — Install These First

#### 1. Install Node.js (v18+)
- Download from: https://nodejs.org/en/download
- Choose the **LTS** version, Windows Installer (.msi)
- Run the installer, click Next through everything
- Verify: Open Command Prompt → type `node --version` → should show v18.x or higher

#### 2. Install MySQL 8.0
- Download from: https://dev.mysql.com/downloads/installer/
- Choose "MySQL Installer for Windows"
- During setup, select "Developer Default"
- **Set a root password you'll remember** (you'll need it below)
- Verify: Open Command Prompt → type `mysql --version`

#### 3. Install VS Code (recommended)
- Download from: https://code.visualstudio.com
- This is where you'll edit code

---

### Step 1: Set Up the Database

Open Command Prompt (or MySQL Workbench) and run:

```bash
mysql -u root -p < database/schema.sql
```

It will ask for your MySQL password. This creates:
- A database called `bing_chun_app`
- 10 tables (users, menu_items, orders, etc.)
- Your full Bing Chun menu (40 items with options)

**What just happened?** The `schema.sql` file contains SQL commands that tell MySQL to create tables and insert your menu data. Think of each table as an Excel sheet with defined columns.

---

### Step 2: Set Up the Backend

```bash
cd backend
copy .env.example .env
```

Now open `.env` in VS Code and fill in your MySQL password:

```
DB_PASS=your_mysql_password_here
```

The JWT secrets can be any long random string. A quick way to generate them:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then install dependencies and start:

```bash
npm install
npm run dev
```

You should see:
```
✅ MySQL connected
🚀 Server running on http://localhost:3000
```

**What just happened?**
- `npm install` downloaded all the libraries listed in `package.json` (Express, MySQL driver, JWT, bcrypt)
- `npm run dev` started the Express server. It's now listening for HTTP requests on port 3000.
- The server connected to your MySQL database using the credentials in `.env`

**Test it:** Open your browser to `http://localhost:3000/api/menu` — you should see your full menu as JSON data.

---

### Step 3: Set Up the Frontend

Open a **new** Command Prompt window (keep the backend running):

```bash
npm create vue@latest frontend-app -- --router --pinia
```

When prompted:
- Project name: `frontend-app`
- TypeScript? **No**
- JSX? **No**
- Router? **Yes** (should already be selected)
- Pinia? **Yes** (should already be selected)
- Everything else: **No**

Then:

```bash
cd frontend-app
npm install
npm install axios
```

Now replace the scaffolded `src/` contents with our files:

```bash
# Delete the scaffolded src contents
rmdir /s /q src\assets src\components src\router src\stores src\views
del src\App.vue src\main.js

# Copy our source files
xcopy ..\frontend\src\* src\ /s /e /y
```

**Important:** You also need to create `src/main.js` since we didn't include it:

Create `frontend-app/src/main.js` with this content:

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

Then start the frontend:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173` in your browser. You should see the Bing Chun login page!

---

### Step 4: Test It

1. Click **Register** tab
2. Enter a phone number, name, and password
3. After registering, you'll see the menu with all your real products
4. Tap a drink → customize sugar/ice/size → add to cart
5. Go to cart → place order
6. Check your profile → see points

---

## Project Structure

```
bing-chun-app/
├── database/
│   └── schema.sql          ← Database tables + menu seed data
├── backend/
│   ├── .env.example        ← Copy to .env, fill in passwords
│   ├── package.json         ← Backend dependencies
│   └── src/
│       ├── index.js         ← Express server entry point
│       ├── db/pool.js       ← MySQL connection pool
│       ├── middleware/auth.js  ← JWT token verification
│       └── routes/
│           ├── auth.js      ← Register, login, logout, refresh
│           ├── menu.js      ← Get menu with nested options
│           ├── orders.js    ← Place order, order history
│           └── points.js    ← Points balance & preview
└── frontend/
    └── src/
        ├── App.vue          ← Root component + global styles
        ├── router/index.js  ← Page routing + auth guards
        ├── stores/
        │   ├── auth.js      ← User session (Pinia)
        │   └── cart.js       ← Cart state (Pinia)
        ├── services/api.js  ← Axios HTTP client + auto-refresh
        ├── views/
        │   ├── LoginView.vue      ← Login / register
        │   ├── MenuView.vue       ← Category tabs, item cards, modal
        │   ├── CartView.vue       ← Cart, points redemption
        │   ├── OrdersView.vue     ← Order history list
        │   ├── OrderDetailView.vue ← Single order detail
        │   └── ProfileView.vue    ← Points, tier, logout
        └── components/
            └── BottomNav.vue      ← Tab bar (Menu/Cart/Orders/Profile)
```

---

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Login → get tokens |
| POST | /api/auth/refresh | No | Refresh access token |
| POST | /api/auth/logout | Yes | Invalidate refresh token |
| GET  | /api/auth/me | Yes | Get current user |
| GET  | /api/menu | No | Full menu with options |
| POST | /api/orders | Yes | Place an order |
| GET  | /api/orders | Yes | My order history |
| GET  | /api/orders/:id | Yes | Order detail |
| GET  | /api/points | Yes | Points balance + history |

---

## Menu Data (Seeded)

Your full Bing Chun menu is pre-loaded:
- **4** Ice Cream cones (Original, Chocolate, Chocolate Mix, Matcha Mix)
- **12** Sundaes (Strawberry, Mango, Mulberry, Blueberry, Cherry, Apple, Choc Oreo, etc.)
- **2** Milkshakes (Chocolate, Chocolate Oreo)
- **7** Jasmine Teas (Strawberry Coconut, Mango Crystal Boba, Lychee, etc.)
- **11** Fruit Teas (Strawberry Mulberry, Lemon Green, Grapes Crystal, etc.)
- **3** Milk Teas (Boba, Original, Coconut)
- **1** Fresh Juice (Lemonade)

Each drink has: Size (M/L), Sugar Level (0-100%), Ice Level, and optional toppings (Pearl, Coconut Jelly, Crystal Ball, Oreo Crumbs).

---

## Points System

- **Earn:** 1 point per RM1 spent
- **Redeem:** 100 points = RM1 discount
- **Tiers:** Bronze (0+), Silver (500+), Gold (2000+)

---

## Next Steps

1. ✅ Get running locally (you are here)
2. 🔲 Build admin panel (manage menu, update order status)
3. 🔲 Add real product images
4. 🔲 Integrate Billplz payment gateway
5. 🔲 Deploy to cloud (Railway + Vercel)
