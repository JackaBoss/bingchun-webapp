<template>
  <div id="app">
    <template v-if="auth.isLoggedIn">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon">🧋</span>
          <div>
            <div class="brand-name">冰纯茶饮</div>
            <div class="brand-sub">Admin Panel</div>
          </div>
        </div>

        <nav class="sidebar-nav">
          <router-link to="/"        class="nav-item" active-class="active" exact><span>📊</span> Dashboard</router-link>
          <router-link to="/orders"  class="nav-item" active-class="active"><span>📋</span> Orders</router-link>
          <router-link to="/menu"    class="nav-item" active-class="active"><span>🍹</span> Menu</router-link>
          <router-link to="/members" class="nav-item" active-class="active"><span>👥</span> Members</router-link>
          <router-link to="/counter" class="nav-item" active-class="active"><span>🧾</span> Walk-in Points</router-link>
        </nav>

        <div class="sidebar-footer">
          <div class="admin-info">
            <div class="admin-avatar">{{ auth.user?.name?.charAt(0) }}</div>
            <div>
              <div class="admin-name">{{ auth.user?.name }}</div>
              <div class="admin-role">Administrator</div>
            </div>
          </div>
          <button class="logout-btn" @click="logout">Sign out</button>
        </div>
      </aside>

      <main class="main-content">
        <router-view />
      </main>
    </template>

    <router-view v-else />
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth   = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --sidebar-w: 240px;
  --blue:      #1e88e5;
  --blue-dk:   #1565c0;
  --bg:        #f0f2f5;
  --white:     #ffffff;
  --border:    #e5e7eb;
  --text:      #1a1a2e;
  --muted:     #6b7280;
  --radius:    10px;
  --shadow:    0 1px 4px rgba(0,0,0,0.08);
  --green:     #16a34a;
  --red:       #dc2626;
  --amber:     #d97706;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

#app { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: var(--sidebar-w);
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.brand-icon  { font-size: 28px; }
.brand-name  { font-size: 16px; font-weight: 700; color: #fff; }
.brand-sub   { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 1px; text-transform: uppercase; letter-spacing: 1px; }

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: rgba(255,255,255,0.55);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
.nav-item.active { background: var(--blue); color: #fff; }
.nav-item span { font-size: 16px; }

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.admin-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.admin-avatar {
  width: 34px; height: 34px;
  background: var(--blue);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.admin-name { font-size: 13px; font-weight: 600; color: #fff; }
.admin-role { font-size: 11px; color: rgba(255,255,255,0.4); }
.logout-btn {
  width: 100%; padding: 8px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 7px;
  color: rgba(255,255,255,0.55);
  font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.logout-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

/* Main content */
.main-content {
  margin-left: var(--sidebar-w);
  flex: 1;
  min-height: 100vh;
  overflow-y: auto;
}

/* Shared page layout */
.page { padding: 32px; }
.page-header { margin-bottom: 28px; }
.page-title  { font-size: 24px; font-weight: 800; color: var(--text); }
.page-sub    { font-size: 14px; color: var(--muted); margin-top: 4px; }

/* Cards */
.card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}

/* Stat cards */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }
.stat-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--text); }
.stat-sub   { font-size: 12px; color: var(--muted); margin-top: 4px; }

/* Tables */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }

/* Status badges */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: capitalize;
}
.badge-pending   { background: #fef3c7; color: #92400e; }
.badge-paid      { background: #d1fae5; color: #065f46; }
.badge-preparing { background: #dbeafe; color: #1e40af; }
.badge-ready     { background: #d1fae5; color: #065f46; }
.badge-completed { background: #f3f4f6; color: #6b7280; }
.badge-cancelled { background: #fee2e2; color: #991b1b; }
.badge-bronze  { background: #fde8d8; color: #8A4A20; }
.badge-silver  { background: #E8EEF5; color: #546078; }
.badge-gold    { background: #FFF3CD; color: #856404; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border-radius: 7px; border: none;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s;
}
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover { background: var(--blue-dk); }
.btn-ghost   { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-ghost:hover { background: var(--bg); }
.btn-danger  { background: #fee2e2; color: var(--red); }
.btn-danger:hover { background: #fecaca; }

/* Form inputs */
.input {
  width: 100%; padding: 9px 12px;
  border: 1.5px solid var(--border); border-radius: 7px;
  font-size: 14px; outline: none;
  transition: border-color 0.15s;
}
.input:focus { border-color: var(--blue); }
</style>
