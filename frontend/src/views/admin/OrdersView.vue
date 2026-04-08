<template>
  <div class="admin-page">
    <div class="admin-header">
      <button class="back-btn" @click="router.push('/admin')">&larr;</button>
      <h2>Orders</h2>
    </div>

    <div class="filter-bar">
      <button v-for="s in statuses" :key="s" :class="['filter-btn', { active: filter === s }]" @click="filter = s; loadOrders()">
        {{ s || 'All' }}
      </button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="orders-list">
      <div v-if="orders.length === 0" class="empty">No orders found</div>
      <div v-for="order in orders" :key="order.id" class="order-row" @click="router.push(`/admin/orders/${order.id}`)">
        <div class="order-left">
          <span class="order-no">{{ order.order_no }}</span>
          <span class="customer">{{ order.customer_name }}</span>
          <span class="time">{{ formatTime(order.created_at) }}</span>
        </div>
        <div class="order-right">
          <span :class="['status', `s-${order.status}`]">{{ order.status }}</span>
          <span class="total">RM {{ parseFloat(order.total).toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const orders = ref([])
const loading = ref(true)
const filter = ref('')
const statuses = ['', 'pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled']

function formatTime(dt) {
  return new Date(dt).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

async function loadOrders() {
  loading.value = true
  try {
    const params = {}
    if (filter.value) params.status = filter.value
    orders.value = await api.get('/admin/orders', params)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(loadOrders)
</script>

<style scoped>
.admin-page { background: var(--bg); min-height: 100vh; }
.admin-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: #1a1a2e; color: #fff; }
.back-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.admin-header h2 { font-size: 18px; }

.filter-bar { display: flex; gap: 6px; padding: 12px 16px; overflow-x: auto; }
.filter-bar::-webkit-scrollbar { display: none; }
.filter-btn { white-space: nowrap; padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 20px; background: var(--white); font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; text-transform: capitalize; }
.filter-btn.active { background: #1a1a2e; border-color: #1a1a2e; color: #fff; }

.loading { text-align: center; padding: 40px; color: var(--text-muted); }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }

.orders-list { padding: 0 16px 16px; }
.order-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--white); border-radius: 10px; margin-bottom: 8px; cursor: pointer; box-shadow: var(--shadow); }
.order-left { display: flex; flex-direction: column; gap: 3px; }
.order-no { font-size: 14px; font-weight: 700; }
.customer { font-size: 13px; color: var(--text); }
.time { font-size: 11px; color: var(--text-muted); }
.order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.total { font-size: 15px; font-weight: 700; }
.status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 8px; }
.s-pending { background: #fff8e1; color: #856404; }
.s-paid { background: #e8f5e9; color: #2e7d32; }
.s-preparing { background: #e3f2fd; color: #1e88e5; }
.s-ready { background: #e8f5e9; color: #2e7d32; }
.s-completed { background: #f1f1f1; color: #666; }
.s-cancelled { background: #ffebee; color: #c62828; }
</style>
