<template>
  <div class="admin-page">
    <div class="admin-header">
      <h2>Admin Dashboard</h2>
      <button class="back-link" @click="router.push('/')">Back to app</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-value">RM {{ data.today.revenue.toFixed(2) }}</p>
          <p class="stat-label">Today's revenue</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ data.today.order_count }}</p>
          <p class="stat-label">Today's orders</p>
        </div>
        <div class="stat-card accent">
          <p class="stat-value">{{ data.pending_orders }}</p>
          <p class="stat-label">Pending orders</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{{ data.total_users }}</p>
          <p class="stat-label">Total members</p>
        </div>
      </div>

      <div class="admin-nav">
        <button class="admin-nav-btn" @click="router.push('/admin/orders')">
          <span class="nav-emoji">&#128203;</span> Manage Orders
        </button>
        <button class="admin-nav-btn" @click="router.push('/admin/menu')">
          <span class="nav-emoji">&#129379;</span> Manage Menu
        </button>
      </div>

      <div class="section">
        <h3>Recent Orders</h3>
        <div v-for="order in data.recent_orders" :key="order.id" class="order-row"
             @click="router.push(`/admin/orders/${order.id}`)">
          <div class="order-row-left">
            <span class="order-no">{{ order.order_no }}</span>
            <span class="customer">{{ order.customer_name }} ({{ order.customer_phone }})</span>
          </div>
          <div class="order-row-right">
            <span :class="['status', `s-${order.status}`]">{{ order.status }}</span>
            <span class="total">RM {{ parseFloat(order.total).toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const data = ref({ today: { revenue: 0, order_count: 0 }, pending_orders: 0, total_users: 0, recent_orders: [] })
const loading = ref(true)

onMounted(async () => {
  try {
    data.value = await api.get('/admin/dashboard')
    data.value.today.revenue = parseFloat(data.value.today.revenue)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-page { background: var(--bg); min-height: 100vh; padding-bottom: 24px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #1a1a2e; color: #fff; }
.admin-header h2 { font-size: 18px; }
.back-link { background: none; border: 1px solid rgba(255,255,255,.3); color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.loading { text-align: center; padding: 40px; color: var(--text-muted); }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px; }
.stat-card { background: var(--white); border-radius: 12px; padding: 16px; box-shadow: var(--shadow); }
.stat-card.accent { background: #1e88e5; color: #fff; }
.stat-card.accent .stat-label { color: rgba(255,255,255,.7); }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

.admin-nav { display: flex; gap: 10px; padding: 0 16px 16px; }
.admin-nav-btn { flex: 1; padding: 14px; background: var(--white); border: 1.5px solid var(--border); border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.nav-emoji { font-size: 18px; }

.section { padding: 0 16px; }
.section h3 { font-size: 14px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 10px; }

.order-row { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--white); border-radius: 10px; margin-bottom: 8px; cursor: pointer; box-shadow: var(--shadow); }
.order-row-left { display: flex; flex-direction: column; gap: 4px; }
.order-no { font-size: 14px; font-weight: 700; }
.customer { font-size: 12px; color: var(--text-muted); }
.order-row-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.total { font-size: 15px; font-weight: 700; }
.status { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 8px; }
.s-pending { background: #fff8e1; color: #856404; }
.s-paid { background: #e8f5e9; color: #2e7d32; }
.s-preparing { background: #e3f2fd; color: #1e88e5; }
.s-ready { background: #e8f5e9; color: #2e7d32; }
.s-completed { background: #f1f1f1; color: #666; }
.s-cancelled { background: #ffebee; color: #c62828; }
</style>
