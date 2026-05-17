<template>
  <div id="app">
    <template v-if="auth.isLoggedIn">
      <div class="nav-overlay" :class="{ visible: navOpen }" @click="navOpen = false"></div>

      <aside class="sidebar" :class="{ open: navOpen }">
        <div class="sidebar-brand">
          <span class="brand-icon">🧋</span>
          <div>
            <div class="brand-name">Bing Chun Malaysia</div>
            <div class="brand-sub">Admin Panel</div>
          </div>
          <button class="nav-close" @click="navOpen = false">✕</button>
        </div>

        <nav class="sidebar-nav">
          <template v-if="auth.isManager">
            <router-link to="/" class="nav-item" active-class="active" exact @click="navOpen = false">
              <span>📊</span> {{ t('nav_dashboard') }}
            </router-link>
          </template>
          <router-link to="/orders" class="nav-item" active-class="active" @click="navOpen = false">
            <span>📋</span> {{ t('nav_orders') }}
          </router-link>
          <router-link to="/menu" class="nav-item" active-class="active" @click="navOpen = false">
            <span>🍹</span> {{ t('nav_menu') }}
          </router-link>
          <router-link to="/counter" class="nav-item" active-class="active" @click="navOpen = false">
            <span>📷</span> {{ t('nav_counter') }}
          </router-link>
          <router-link to="/vouchers" class="nav-item" active-class="active" @click="navOpen = false">
            <span>🎫</span> {{ t('nav_vouchers') }}
          </router-link>
          <template v-if="auth.isManager">
            <div class="nav-divider"></div>
            <router-link to="/outlets" class="nav-item" active-class="active" @click="navOpen = false">
              <span>🏪</span> {{ t('nav_outlets') }}
            </router-link>
            <router-link to="/walkin-sales" class="nav-item" active-class="active" @click="navOpen = false">
              <span>📝</span> {{ t('nav_walkin') }}
            </router-link>
            <router-link to="/members" class="nav-item" active-class="active" @click="navOpen = false">
              <span>👥</span> {{ t('nav_members') }}
            </router-link>
            <router-link to="/reports" class="nav-item" active-class="active" @click="navOpen = false">
              <span>📈</span> {{ t('nav_reports') }}
            </router-link>
            <router-link to="/staff" class="nav-item" active-class="active" @click="navOpen = false">
              <span>🧑‍💼</span> {{ t('nav_staff') }}
            </router-link>
          </template>
        </nav>

        <div class="sidebar-footer">
          <div class="lang-toggle">
            <button v-for="l in langs" :key="l.code" :class="['lang-btn', { active: lang === l.code }]" @click="setLang(l.code)">
              {{ l.label }}
            </button>
          </div>
          <div class="admin-info">
            <div class="admin-avatar">{{ auth.user?.name?.charAt(0) }}</div>
            <div>
              <div class="admin-name">{{ auth.user?.name }}</div>
              <div class="admin-role">
                <span :class="['role-chip', auth.isManager ? 'role-manager' : 'role-staff']">{{ auth.roleLabel }}</span>
              </div>
            </div>
          </div>
          <button class="logout-btn" @click="logout">{{ t('nav_signout') }}</button>
        </div>
      </aside>

      <div class="main-wrap">
        <header class="topbar">
          <button class="hamburger" @click="navOpen = !navOpen" :class="{ active: navOpen }">
            <span></span><span></span><span></span>
          </button>
          <span class="topbar-title">{{ pageTitle }}</span>
          <div class="lang-toggle-mobile">
            <button v-for="l in langs" :key="l.code" :class="['lang-btn-sm', { active: lang === l.code }]" @click="setLang(l.code)">
              {{ l.label }}
            </button>
          </div>
        </header>
        <div v-if="forbiddenMsg" class="forbidden-toast">🔒 {{ forbiddenMsg }}</div>
        <main class="main-content">
          <router-view />
        </main>
      </div>

      <!-- Floating QR scan button — hidden on /counter itself -->
      <router-link
        v-if="route.path !== '/counter'"
        to="/counter"
        class="fab-scan"
        title="Scan Customer QR"
      >
        <span class="fab-icon">📷</span>
        <span class="fab-label">Scan QR</span>
      </router-link>
    </template>

    <router-view v-else />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLang } from '@/composables/useLang'

const auth    = useAuthStore()
const router  = useRouter()
const route   = useRoute()
const { lang, t, setLang } = useLang()

const navOpen      = ref(false)
const forbiddenMsg = ref('')

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'bm', label: 'BM' },
]

onMounted(() => {
  if (sessionStorage.getItem('forbidden_toast')) {
    forbiddenMsg.value = "You don't have permission to access that page."
    sessionStorage.removeItem('forbidden_toast')
    setTimeout(() => { forbiddenMsg.value = '' }, 4000)
  }
})

watch(() => route.path, () => { navOpen.value = false })

const titleMap = computed(() => ({
  '/':             t.value('nav_dashboard'),
  '/orders':       t.value('nav_orders'),
  '/menu':         t.value('nav_menu'),
  '/members':      t.value('nav_members'),
  '/vouchers':     t.value('nav_vouchers'),
  '/counter':      t.value('nav_counter'),
  '/walkin-sales': t.value('nav_walkin'),
  '/reports':      t.value('nav_reports'),
  '/staff':        t.value('nav_staff'),
  '/outlets':      t.value('nav_outlets'),
}))

const pageTitle = computed(() => {
  if (route.path.startsWith('/orders/')) return 'Order Detail'
  if (route.path.startsWith('/members/') && route.path.endsWith('/edit')) return 'Edit Member'
  if (route.path.startsWith('/members/') && route.path !== '/members') return 'Member History'
  return titleMap.value[route.path] || 'Admin'
})

function logout() { auth.logout(); router.push('/login') }
</script>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --sidebar-w: 240px; --topbar-h: 52px;
  --blue: #1e88e5; --blue-dk: #1565c0;
  --bg: #f0f2f5; --white: #ffffff; --border: #e5e7eb;
  --text: #1a1a2e; --muted: #6b7280;
  --radius: 10px; --shadow: 0 1px 4px rgba(0,0,0,0.08);
  --green: #16a34a; --red: #dc2626; --amber: #d97706;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
#app { display: flex; min-height: 100vh; }

.sidebar { width: var(--sidebar-w); background: #1a1a2e; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 300; transition: transform .25s ease; }
.sidebar-brand { display: flex; align-items: center; gap: 12px; padding: 24px 20px; border-bottom: 1px solid rgba(255,255,255,.08); }
.brand-icon { font-size: 28px; }
.brand-name { font-size: 16px; font-weight: 700; color: #fff; }
.brand-sub { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 1px; text-transform: uppercase; letter-spacing: 1px; }
.nav-close { display: none; margin-left: auto; background: none; border: none; color: rgba(255,255,255,.4); font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.nav-close:hover { color: #fff; background: rgba(255,255,255,.08); }
.sidebar-nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: rgba(255,255,255,.55); text-decoration: none; font-size: 14px; font-weight: 500; transition: all .15s; }
.nav-item:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.85); }
.nav-item.active { background: var(--blue); color: #fff; }
.nav-item span { font-size: 16px; }
.nav-divider { height: 1px; background: rgba(255,255,255,.08); margin: 8px 0; }

.sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 12px; }
.admin-info { display: flex; align-items: center; gap: 10px; }
.admin-avatar { width: 34px; height: 34px; background: var(--blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0; }
.admin-name { font-size: 13px; font-weight: 600; color: #fff; }
.role-chip { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.role-manager { background: #ffd700; color: #1a1a2e; }
.role-staff { background: rgba(255,255,255,.15); color: rgba(255,255,255,.7); }
.logout-btn { width: 100%; padding: 8px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); border-radius: 7px; color: rgba(255,255,255,.55); font-size: 13px; cursor: pointer; transition: all .15s; }
.logout-btn:hover { background: rgba(255,255,255,.12); color: #fff; }

.lang-toggle { display: flex; gap: 6px; }
.lang-btn { flex: 1; padding: 6px 0; border-radius: 6px; border: 1px solid rgba(255,255,255,.15); background: transparent; color: rgba(255,255,255,.45); font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s; letter-spacing: .5px; }
.lang-btn:hover { background: rgba(255,255,255,.08); color: rgba(255,255,255,.8); }
.lang-btn.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.lang-toggle-mobile { display: none; margin-left: auto; gap: 4px; }
.lang-btn-sm { padding: 4px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,.2); background: transparent; color: rgba(255,255,255,.5); font-size: 11px; font-weight: 700; cursor: pointer; transition: all .15s; }
.lang-btn-sm.active { background: var(--blue); border-color: var(--blue); color: #fff; }

.main-wrap { margin-left: var(--sidebar-w); flex: 1; min-height: 100vh; display: flex; flex-direction: column; }
.main-content { flex: 1; }
.topbar { display: none; align-items: center; gap: 14px; height: var(--topbar-h); padding: 0 16px; background: #1a1a2e; position: sticky; top: 0; z-index: 200; }
.topbar-title { font-size: 16px; font-weight: 700; color: #fff; }
.hamburger { display: flex; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 6px 4px; flex-shrink: 0; }
.hamburger span { display: block; width: 22px; height: 2px; background: rgba(255,255,255,.8); border-radius: 2px; transition: all .2s; }
.hamburger.active span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.hamburger.active span:nth-child(2) { opacity: 0; }
.hamburger.active span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 250; }
.nav-overlay.visible { display: block; }

/* ── Floating QR scan button ── */
.fab-scan {
  position: fixed;
  bottom: 28px;
  right: 24px;
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: var(--blue);
  color: #fff;
  border-radius: 100px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(30, 136, 229, 0.45);
  transition: all .2s;
  border: none;
}
.fab-scan:hover { background: var(--blue-dk); transform: translateY(-2px); box-shadow: 0 6px 24px rgba(30,136,229,.55); }
.fab-scan:active { transform: translateY(0); }
.fab-icon { font-size: 18px; line-height: 1; }
.fab-label { letter-spacing: .3px; }

/* On desktop, FAB sits to the right of the sidebar */
@media (min-width: 769px) {
  .fab-scan { bottom: 32px; right: 32px; }
}

@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .nav-close { display: block; }
  .main-wrap { margin-left: 0; }
  .topbar { display: flex; }
  .lang-toggle-mobile { display: flex; }
  /* Smaller FAB on mobile */
  .fab-scan { bottom: 20px; right: 16px; padding: 12px 16px; font-size: 13px; }
}

.forbidden-toast { background: #fee2e2; color: #991b1b; padding: 10px 20px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #fecaca; animation: slide-down .2s ease; }
@keyframes slide-down { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

/* ══ Global shared styles ══ */
.page { padding: 32px; }
.page-header { margin-bottom: 28px; }
.page-title { font-size: 24px; font-weight: 800; color: var(--text); }
.page-sub { font-size: 14px; color: var(--muted); margin-top: 4px; }
@media (max-width: 768px) { .page { padding: 16px; } }
.card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }
.stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 28px; }
.stat-card { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 20px; }
.stat-label { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 8px; }
.stat-value { font-size: 28px; font-weight: 800; color: var(--text); }
.stat-sub { font-size: 12px; color: var(--muted); margin-top: 4px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid var(--border); }
td { padding: 12px 14px; border-bottom: 1px solid var(--border); color: var(--text); }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }
.badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: capitalize; }
.badge-pending { background: #fef3c7; color: #92400e; }
.badge-paid { background: #d1fae5; color: #065f46; }
.badge-preparing { background: #dbeafe; color: #1e40af; }
.badge-ready { background: #d1fae5; color: #065f46; }
.badge-completed { background: #f3f4f6; color: #6b7280; }
.badge-cancelled { background: #fee2e2; color: #991b1b; }
.badge-bronze { background: #fde8d8; color: #8A4A20; }
.badge-silver { background: #E8EEF5; color: #546078; }
.badge-gold { background: #FFF3CD; color: #856404; }
.badge-staff { background: rgba(30,136,229,0.12); color: #1e88e5; }
.badge-store_manager { background: #fff3cd; color: #856404; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: 7px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: all .15s; text-decoration: none; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn-primary { background: var(--blue); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--blue-dk); }
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn-ghost:hover:not(:disabled) { background: var(--bg); }
.btn-danger { background: #fee2e2; color: var(--red); }
.btn-danger:hover:not(:disabled) { background: #fecaca; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.input { width: 100%; min-width: 0; padding: 9px 12px; border: 1.5px solid var(--border); border-radius: 7px; font-size: 14px; outline: none; transition: border-color .15s; background: #fff; }
.input:focus { border-color: var(--blue); }
</style>