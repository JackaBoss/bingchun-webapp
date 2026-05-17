<template>
  <nav class="bottom-nav">
    <button
      v-for="tab in tabs"
      :key="tab.name"
      :class="['nav-tab', { active: route.name === tab.routeName }]"
      @click="router.push(tab.path)"
    >
      <span class="nav-icon">{{ tab.icon }}</span>
      <span class="nav-label">{{ tab.label }}</span>
    </button>

    <!-- Language toggle -->
    <div class="lang-divider"></div>
    <div class="lang-group">
      <button
        v-for="l in langs"
        :key="l.code"
        :class="['lang-btn', { active: lang === l.code }]"
        @click="setLang(l.code)"
      >{{ l.label }}</button>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useLang } from '@/composables/useLang'

const router = useRouter()
const route  = useRoute()
const { lang, t, setLang } = useLang()

const langs = [
  { code: 'en', label: 'EN' },
  { code: 'bm', label: 'BM' },
  { code: 'zh', label: '中文' },
]

const tabs = computed(() => [
  { name: 'menu',    routeName: 'Menu',    path: '/',        icon: '🧋', label: t.value('nav_menu')    },
  { name: 'profile', routeName: 'Profile', path: '/profile', icon: '👤', label: t.value('nav_profile') },
])
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 64px;
  background: var(--white);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  z-index: 100;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
  padding: 0 4px;
}
.nav-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 0;
  transition: all 0.15s;
  height: 100%;
}
.nav-icon { font-size: 20px; line-height: 1; }
.nav-label { font-size: 11px; font-weight: 600; color: var(--text-muted); }
.nav-tab.active .nav-label { color: var(--blue); }
.nav-tab.active .nav-icon { transform: translateY(-2px); }

/* ── Lang toggle ── */
.lang-divider {
  width: 1px;
  height: 32px;
  background: var(--border);
  flex-shrink: 0;
  margin: 0 4px;
}
.lang-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 4px;
  flex-shrink: 0;
}
.lang-btn {
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all .15s;
  line-height: 1.4;
  letter-spacing: .3px;
}
.lang-btn:hover { background: #e8f0fe; color: var(--blue); border-color: var(--blue); }
.lang-btn.active { background: var(--blue); border-color: var(--blue); color: #fff; }
</style>