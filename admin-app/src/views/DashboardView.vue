<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-sub">{{ today }} · Amerin Mall, Seri Kembangan</p>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card">
          <p class="stat-label">Today's Revenue</p>
          <p class="stat-value">RM {{ data.today.revenue.toFixed(2) }}</p>
          <p class="stat-sub">{{ data.today.order_count }} orders</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Pending Orders</p>
          <p class="stat-value" :style="data.pending_orders > 0 ? 'color:var(--amber)' : ''">{{ data.pending_orders }}</p>
          <p class="stat-sub">awaiting action</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total Members</p>
          <p class="stat-value">{{ data.total_users }}</p>
          <p class="stat-sub">registered accounts</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Avg Order Value</p>
          <p class="stat-value">RM {{ avgOrder }}</p>
          <p class="stat-sub">today</p>
        </div>
      </div>

      <div class="card">
        <div class="section-header">
          <h2 class="section-title">Recent Orders</h2>
          <router-link to="/orders" class="btn btn-ghost">View all</router-link>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in data.recent_orders" :key="order.id">
                <td><span class="order-no">{{ order.order_no }}</span></td>
                <td>
                  <div class="customer-name">{{ order.customer_name }}</div>
                  <div class="customer-phone">{{ order.customer_phone }}</div>
                </td>
                <td>{{ order.item_count ?? '—' }}</td>
                <td><strong>RM {{ parseFloat(order.total).toFixed(2) }}</strong></td>
                <td><span :class="['badge', `badge-${order.status}`]">{{ order.status }}</span></td>
                <td class="time-col">{{ formatTime(order.created_at) }}</td>
                <td>
                  <router-link :to="`/orders/${order.id}`" class="btn btn-ghost" style="padding:5px 10px;font-size:12px">View</router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const data    = ref({ today: { revenue: 0, order_count: 0 }, pending_orders: 0, total_users: 0, recent_orders: [] })
const loading = ref(true)

const today = new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const avgOrder = computed(() => {
  const { revenue, order_count } = data.value.today
  if (!order_count) return '0.00'
  return (revenue / order_count).toFixed(2)
})

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try {
    const res = await api.get('/admin/dashboard')
    res.today.revenue = parseFloat(res.today.revenue)
    data.value = res
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.loading { padding: 40px; text-align: center; color: var(--muted); }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-title  { font-size: 16px; font-weight: 700; }
.order-no       { font-weight: 700; font-size: 13px; }
.customer-name  { font-weight: 600; font-size: 13px; }
.customer-phone { font-size: 12px; color: var(--muted); margin-top: 1px; }
.time-col       { color: var(--muted); font-size: 12px; }
</style>
