<template>
  <nav class="bottom-nav">
    <button
      v-for="tab in tabs" :key="tab.name"
      :class="['nav-tab', { active: route.name === tab.routeName }]"
      @click="router.push(tab.path)"
    >
      <span class="nav-icon">{{ tab.icon }}</span>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()

const tabs = [
  { name: 'menu',    routeName: 'Menu',    path: '/',        icon: '🧋', label: 'Menu'    },
  { name: 'profile', routeName: 'Profile', path: '/profile', icon: '👤', label: 'Profile' },
]
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 64px;
  background: var(--white);
  border-top: 1px solid var(--border);
  display: flex;
  z-index: 100;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
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
}
.nav-icon  { font-size: 20px; line-height: 1; }
.nav-label { font-size: 11px; font-weight: 600; color: var(--text-muted); }
.nav-tab.active .nav-label { color: var(--blue); }
.nav-tab.active .nav-icon  { transform: translateY(-2px); }
</style>