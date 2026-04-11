<template>
  <div class="orders-page">
    <div class="page-header">
      <h2>My Orders</h2>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="n in 4" :key="n"></div>
    </div>

    <div v-else-if="orders.length === 0" class="empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-title">No orders yet</p>
      <p class="empty-sub">Your order history will appear here</p>
      <button class="btn btn-primary" style="margin-top:24px" @click="router.push('/')">Start ordering</button>
    </div>

    <div v-else class="orders-list">
      <div
        v-for="order in orders" :key="order.id"
        class="order-card"
        @click="router.push(`/orders/${order.id}`)"
      >
        <div class="order-card-top">
          <span class="order-no">{{ order.order_no }}</span>
          <span :class="['status-badge', `s-${order.status}`]">{{ order.status }}</span>
        </div>
        <p class="order-outlet">📍 {{ order.outlet_name }}</p>
        <div class="order-card-bottom">
          <span class="order-date">{{ formatDate(order.created_at) }}</span>
          <span class="order-total">RM {{ parseFloat(order.total).toFixed(2) }}</span>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BottomNav from '@/components/BottomNav.vue'
import api from '@/services/api'

const router = useRouter()
const orders  = ref([])
const loading = ref(true)

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  try {
    orders.value = await api.get('/orders', { limit: 20 })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.orders-page { background: var(--bg); min-height: 100vh; padding-bottom: 80px; }
.page-header { padding: 20px 16px 12px; background: var(--white); border-bottom: 1px solid var(--border); }
.page-header h2 { font-size: 20px; font-weight: 700; }

.loading-state { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 80px; border-radius: var(--radius); background: #f0f0f0; }

.empty-state { text-align: center; padding: 60px 24px; }
.empty-icon  { font-size: 56px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 700; }
.empty-sub   { font-size: 14px; color: var(--text-muted); margin-top: 6px; }

.orders-list { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.order-card {
  background: var(--white); border-radius: var(--radius);
  padding: 14px 16px; box-shadow: var(--shadow); cursor: pointer;
  transition: transform .15s;
}
.order-card:active { transform: scale(0.99); }

.order-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.order-no       { font-size: 14px; font-weight: 700; }

.status-badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 10px;
}
.s-pending    { background: #fff8e1; color: #856404; }
.s-paid       { background: #e8f5e9; color: #2e7d32; }
.s-preparing  { background: #e3f2fd; color: var(--blue); }
.s-ready      { background: #e8f5e9; color: #2e7d32; }
.s-completed  { background: var(--bg); color: var(--text-muted); }
.s-cancelled  { background: #ffebee; color: #c62828; }

.order-outlet { font-size: 13px; color: var(--text-muted); margin-bottom: 10px; }
.order-card-bottom { display: flex; justify-content: space-between; align-items: center; }
.order-date  { font-size: 12px; color: var(--text-muted); }
.order-total { font-size: 16px; font-weight: 700; color: var(--text); }
</style>