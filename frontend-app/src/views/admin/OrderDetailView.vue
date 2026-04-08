<template>
  <div class="admin-page">
    <div class="admin-header">
      <button class="back-btn" @click="router.push('/admin/orders')">&larr;</button>
      <h2>Order Detail</h2>
      <button class="print-btn" @click="printReceipt">Print</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else-if="order">
      <div :class="['status-banner', `sb-${order.status}`]">
        <span class="status-text">{{ order.status.toUpperCase() }}</span>
        <span class="order-no">{{ order.order_no }}</span>
      </div>

      <div class="info-card">
        <p><strong>Customer:</strong> {{ order.customer_name }}</p>
        <p><strong>Phone:</strong> {{ order.customer_phone }}</p>
        <p><strong>Outlet:</strong> {{ order.outlet_name }}</p>
        <p><strong>Time:</strong> {{ formatTime(order.created_at) }}</p>
      </div>

      <div class="items-card">
        <h3>Items</h3>
        <div v-for="item in order.items" :key="item.id" class="item-row">
          <div class="item-left">
            <span class="item-qty">{{ item.quantity }}x</span>
            <div>
              <p class="item-name">{{ item.item_name }}</p>
              <p class="item-opts" v-if="item.options.length">{{ item.options.map(o => o.label).join(', ') }}</p>
              <p class="item-notes" v-if="item.notes">Note: {{ item.notes }}</p>
            </div>
          </div>
          <span class="item-price">RM {{ (item.unit_price * item.quantity).toFixed(2) }}</span>
        </div>
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><span>RM {{ parseFloat(order.subtotal).toFixed(2) }}</span></div>
          <div class="total-row" v-if="parseFloat(order.discount) > 0">
            <span>Points discount</span><span style="color:#2e7d32">-RM {{ parseFloat(order.discount).toFixed(2) }}</span>
          </div>
          <div class="total-row big"><span>Total</span><span>RM {{ parseFloat(order.total).toFixed(2) }}</span></div>
        </div>
      </div>

      <div class="status-card">
        <h3>Update Status</h3>
        <div class="status-grid">
          <button v-for="s in statusFlow" :key="s"
                  :class="['status-btn', `sb-${s}`, { current: order.status === s }]"
                  :disabled="order.status === s"
                  @click="updateStatus(s)">
            {{ s }}
          </button>
        </div>
      </div>
    </template>

    <!-- Hidden print area -->
    <div id="print-area" style="display:none"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const route  = useRoute()
const order  = ref(null)
const loading = ref(true)
const statusFlow = ['pending', 'paid', 'preparing', 'ready', 'completed', 'cancelled']

function formatTime(dt) {
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function updateStatus(status) {
  if (!confirm(`Change status to "${status}"?`)) return
  try {
    const updated = await api.patch(`/admin/orders/${order.value.id}/status`, { status })
    order.value.status = updated.status
  } catch (e) {
    alert(e.error || 'Failed to update')
  }
}

async function printReceipt() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/admin/orders/${order.value.id}/receipt`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }
    )
    const text = await response.text()

    // Open print window
    const win = window.open('', '_blank', 'width=300,height=600')
    win.document.write(`<pre style="font-family:monospace;font-size:12px;width:58mm;margin:0 auto;">${text}</pre>`)
    win.document.close()
    win.print()
  } catch (e) {
    alert('Failed to load receipt')
  }
}

onMounted(async () => {
  try {
    order.value = await api.get(`/admin/orders/${route.params.id}`)
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.admin-page { background: var(--bg); min-height: 100vh; padding-bottom: 24px; }
.admin-header { display: flex; align-items: center; gap: 12px; padding: 16px; background: #1a1a2e; color: #fff; }
.back-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
.admin-header h2 { font-size: 18px; flex: 1; }
.print-btn { background: #fff; color: #1a1a2e; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.loading { text-align: center; padding: 40px; color: var(--text-muted); }

.status-banner { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
.sb-pending { background: #fff8e1; }
.sb-paid { background: #e8f5e9; }
.sb-preparing { background: #e3f2fd; }
.sb-ready { background: #e8f5e9; }
.sb-completed { background: #f1f1f1; }
.sb-cancelled { background: #ffebee; }
.status-text { font-size: 16px; font-weight: 700; text-transform: uppercase; }
.order-no { font-size: 13px; color: var(--text-muted); }

.info-card, .items-card, .status-card { background: var(--white); margin: 10px 16px; border-radius: 12px; padding: 16px; box-shadow: var(--shadow); }
.info-card p { font-size: 14px; margin-bottom: 6px; }
.info-card strong { color: var(--text-muted); font-weight: 600; display: inline-block; width: 80px; }

.items-card h3, .status-card h3 { font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
.item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--border); }
.item-row:last-of-type { border-bottom: none; }
.item-left { display: flex; gap: 10px; }
.item-qty { font-size: 14px; font-weight: 700; color: var(--blue); min-width: 24px; }
.item-name { font-size: 14px; font-weight: 600; }
.item-opts { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.item-notes { font-size: 12px; color: var(--text-muted); margin-top: 2px; font-style: italic; }
.item-price { font-size: 14px; font-weight: 700; white-space: nowrap; }

.totals { margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border); }
.total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
.total-row.big { font-size: 16px; font-weight: 700; margin-top: 4px; padding-top: 8px; border-top: 1px solid var(--border); }

.status-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.status-btn { padding: 10px; border: 1.5px solid var(--border); border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-transform: capitalize; background: var(--white); }
.status-btn.current { border-width: 2px; opacity: .5; cursor: default; }
.status-btn:not(.current):hover { opacity: .8; }
</style>
