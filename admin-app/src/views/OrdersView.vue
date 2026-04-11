<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Orders</h1>
      <p class="page-sub">Manage and update order statuses</p>
    </div>

    <!-- Filters -->
    <div class="filters card" style="margin-bottom:20px">
      <div class="filter-row">
        <select v-model="statusFilter" class="input" style="width:160px">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input v-model="search" type="text" placeholder="Search order no or customer..." class="input" style="flex:1" />
      </div>
    </div>

    <div class="card">
      <div v-if="loading" class="empty">Loading...</div>
      <div v-else-if="filtered.length === 0" class="empty">No orders found.</div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order No</th>
              <th>Customer</th>
              <th>Outlet</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filtered" :key="order.id">
              <td><span class="order-no">{{ order.order_no }}</span></td>
              <td>
                <div class="fw600">{{ order.customer_name }}</div>
                <div class="text-muted">{{ order.customer_phone }}</div>
              </td>
              <td class="text-muted">{{ order.outlet_name }}</td>
              <td><strong>RM {{ parseFloat(order.total).toFixed(2) }}</strong></td>
              <td><span :class="['badge', `badge-${order.status}`]">{{ order.status }}</span></td>
              <td class="text-muted">{{ formatDate(order.created_at) }}</td>
              <td>
                <router-link :to="`/orders/${order.id}`" class="btn btn-ghost" style="padding:5px 10px;font-size:12px">View</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'

const orders       = ref([])
const loading      = ref(true)
const statusFilter = ref('')
const search       = ref('')

const filtered = computed(() => {
  let list = orders.value
  if (statusFilter.value) list = list.filter(o => o.status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(o =>
      o.order_no?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.includes(q)
    )
  }
  return list
})

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  try { orders.value = await api.get('/admin/orders', { limit: 100 }) }
  catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.filter-row  { display: flex; gap: 12px; align-items: center; }
.empty       { padding: 40px; text-align: center; color: var(--muted); }
.order-no    { font-weight: 700; }
.fw600       { font-weight: 600; font-size: 13px; }
.text-muted  { font-size: 12px; color: var(--muted); }
</style>
