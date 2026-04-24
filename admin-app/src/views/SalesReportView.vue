<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Sales Report</h1>
      <p class="page-sub">Revenue and order breakdown by date range</p>
    </div>

    <!-- Filters -->
    <div class="card filter-bar">
      <div class="filter-group">
        <label class="filter-label">From</label>
        <input v-model="from" type="date" class="input" />
      </div>
      <div class="filter-group">
        <label class="filter-label">To</label>
        <input v-model="to" type="date" class="input" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Outlet</label>
        <select v-model="outletFilter" class="input">
          <option value="">All</option>
          <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
        </select>
      </div>
      <div class="filter-actions">
        <button class="btn btn-primary" @click="load" :disabled="loading">
          {{ loading ? 'Loading…' : 'Run Report' }}
        </button>
        <button class="btn btn-ghost" @click="exportCSV" :disabled="!data || loading">
          ⬇ CSV
        </button>
      </div>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <template v-if="data">
      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="card stat-card">
          <div class="stat-label">Net Sales</div>
          <div class="stat-val green">RM {{ fmt(data.summary.net_sales) }}</div>
          <div class="stat-sub">Gross RM {{ fmt(data.summary.gross_sales) }} · Disc RM {{ fmt(data.summary.total_discounts) }}</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Orders</div>
          <div class="stat-val">{{ data.summary.order_count }}</div>
          <div class="stat-sub">{{ data.summary.unique_customers }} unique customers</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Avg Order</div>
          <div class="stat-val">RM {{ data.summary.order_count ? fmt(data.summary.net_sales / data.summary.order_count) : '0.00' }}</div>
          <div class="stat-sub">&nbsp;</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Points</div>
          <div class="stat-val">{{ data.summary.points_issued }}</div>
          <div class="stat-sub">Issued · {{ data.summary.points_redeemed }} redeemed</div>
        </div>
      </div>

      <!-- Daily breakdown -->
      <div class="card section-card">
        <p class="section-label">Daily Breakdown</p>
        <table class="report-table">
          <thead><tr><th>Date</th><th>Outlet</th><th>Orders</th><th>Revenue</th></tr></thead>
          <tbody>
            <tr v-for="row in data.daily" :key="row.date + row.outlet">
              <td>{{ row.date }}</td>
              <td>{{ row.outlet }}</td>
              <td>{{ row.orders }}</td>
              <td>RM {{ fmt(row.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Top items -->
      <div class="card section-card">
        <p class="section-label">Top Items</p>
        <table class="report-table">
          <thead><tr><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            <tr v-for="item in data.topItems" :key="item.item_name">
              <td>{{ item.item_name }}</td>
              <td>{{ item.qty_sold }}</td>
              <td>RM {{ fmt(item.revenue) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Orders detail -->
      <div class="card section-card">
        <p class="section-label">All Orders ({{ data.orders.length }})</p>
        <div class="table-scroll">
          <table class="report-table">
            <thead>
              <tr><th>Order No</th><th>Date</th><th>Time</th><th>Outlet</th><th>Customer</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr v-for="o in data.orders" :key="o.order_no">
                <td class="mono">{{ o.order_no }}</td>
                <td>{{ o.date }}</td>
                <td>{{ o.time }}</td>
                <td>{{ o.outlet }}</td>
                <td>{{ o.customer }}</td>
                <td>RM {{ fmt(o.total) }}</td>
                <td><span :class="['status-badge', o.status]">{{ o.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="empty-state">
      Select a date range and click Run Report.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const today = new Date().toISOString().slice(0, 10)
const firstOfMonth = today.slice(0, 8) + '01'

const from         = ref(firstOfMonth)
const to           = ref(today)
const outletFilter = ref('')
const outlets      = ref([])
const data         = ref(null)
const loading      = ref(false)
const error        = ref('')

onMounted(async () => {
  try { outlets.value = await api.get('/outlets') } catch (_) {}
})

async function load() {
  loading.value = true; error.value = ''; data.value = null
  try {
    const params = { from: from.value, to: to.value }
    if (outletFilter.value) params.outlet_id = outletFilter.value
    data.value = await api.get('/admin/reports/sales', params)
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to load report'
  } finally { loading.value = false }
}

async function exportCSV() {
  const params = new URLSearchParams({ from: from.value, to: to.value, format: 'csv' })
  if (outletFilter.value) params.set('outlet_id', outletFilter.value)
  const token = localStorage.getItem('accessToken')
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/admin/reports/sales?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `sales_${from.value}_${to.value}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function fmt(v) { return parseFloat(v || 0).toFixed(2) }
</script>

<style scoped>
.filter-bar     { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 16px; }
.filter-group   { display: flex; flex-direction: column; gap: 4px; }
.filter-label   { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.filter-actions { display: flex; gap: 8px; align-items: flex-end; margin-left: auto; }
.summary-grid   { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card      { padding: 16px; }
.stat-label     { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; margin-bottom: 6px; }
.stat-val       { font-size: 26px; font-weight: 800; line-height: 1; }
.stat-val.green { color: var(--green); }
.stat-sub       { font-size: 12px; color: var(--muted); margin-top: 4px; }
.section-card   { margin-bottom: 16px; }
.section-label  { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; margin-bottom: 12px; }
.table-scroll   { overflow-x: auto; }
.report-table   { width: 100%; border-collapse: collapse; font-size: 13px; }
.report-table th { text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid var(--border); }
.report-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); }
.report-table tr:last-child td { border-bottom: none; }
.mono           { font-family: monospace; font-size: 12px; }
.empty-state    { text-align: center; padding: 48px; color: var(--muted); }
.error-msg      { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; margin-bottom: 12px; }
.status-badge   { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 600; background: #f0f0f0; color: #555; }
.status-badge.completed { background: #d1fae5; color: #065f46; }
.status-badge.paid      { background: #dbeafe; color: #1e40af; }
.status-badge.preparing { background: #fef3c7; color: #92400e; }
.status-badge.ready     { background: #ede9fe; color: #5b21b6; }
</style>