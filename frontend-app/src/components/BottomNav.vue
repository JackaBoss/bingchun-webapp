<template>
  <nav class="bottom-nav">
    <router-link to="/"        class="nav-item" active-class="active">
      <span class="icon">🧋</span>
      <span>Menu</span>
    </router-link>
    <router-link to="/cart"    class="nav-item" active-class="active">
      <span class="icon">🛒</span>
      <span v-if="cart.count > 0" class="badge">{{ cart.count }}</span>
      <span>Cart</span>
    </router-link>
    <router-link to="/orders"  class="nav-item" active-class="active">
      <span class="icon">📋</span>
      <span>Orders</span>
    </router-link>
    <router-link to="/profile" class="nav-item" active-class="active">
      <span class="icon">👤</span>
      <span>Profile</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useCartStore } from '@/stores/cart'
const cart = useCartStore()
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  height: var(--nav-height);
  background: var(--white);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  padding: 6px 0;
  position: relative;
  transition: color .15s;
}

.nav-item.active { color: var(--blue); }

.icon { font-size: 20px; line-height: 1; }

.badge {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(4px);
  background: #e53e3e;
  color: white;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
</style>
