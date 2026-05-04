<template>
  <div class="order-detail-page">
    <div class="page-header">
      <button class="back-btn" @click="router.push('/orders')">←</button>
      <h2>Order Detail</h2>
      <div class="poll-indicator" :class="{ active: isPolling }" title="Live updates on">
        <span class="poll-dot" />
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="n in 5" :key="n"></div>
    </div>

    <template v-else-if="order">
      <!-- Status banner -->
      <div :class="['status-banner', `status-${order.status}`]">
        <span class="status-icon">{{ statusIcon }}</span>
        <div class="status-text">
          <p class="status-label">{{ statusLabel }}</p>
          <p class="order-no">{{ order.order_no }}</p>
        </div>
        <div v-if="isPolling" class="live-badge">LIVE</div>
      </div>

      <!-- Items -->
      <div class="card section-card">
        <p class="section-label">Items ordered</p>
        <div v-for="item in order.items" :key="item.id" class="order-item-row">
          <div class="order-item-info">
            <p class="order-item-name">{{ item.item_name }} × {{ item.quantity }}</p>
            <p class="order-item-opts" v-if="item.options && item.options.length">
              {{ item.options.map(o => o.label).join(', ') }}
            </p>
            <p class="order-item-notes" v-if="item.notes">📝 {{ item.notes }}</p>
          </div>
          <span class="order-item-price">RM {{ (item.unit_price * item.quantity).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Summary -->
      <div class="card section-card">
        <p class="section-label">Payment summary</p>
        <div class="summary-row"><span>Subtotal</span><span>RM {{ parseFloat(order.subtotal).toFixed(2) }}</span></div>
        <div class="summary-row" v-if="order.discount > 0">
          <span>Points discount</span><span style="color:#2e7d32">−RM {{ parseFloat(order.discount).toFixed(2) }}</span>
        </div>
        <div class="summary-row total"><span>Total paid</span><span>RM {{ parseFloat(order.total).toFixed(2) }}</span></div>
        <div class="summary-row" v-if="order.points_earned > 0">
          <span>Points earned</span><span style="color:var(--blue)">+{{ order.points_earned }} ⭐</span>
        </div>
        <div class="summary-row" v-if="order.points_redeemed > 0">
          <span>Points used</span><span>{{ order.points_redeemed }} pts</span>
        </div>
      </div>

      <!-- Info -->
      <div class="card section-card">
        <p class="section-label">Order info</p>
        <div class="info-row"><span>Outlet</span><span>{{ order.outlet_name }}</span></div>
        <div class="info-row"><span>Placed at</span><span>{{ formatDate(order.created_at) }}</span></div>
        <div class="info-row" v-if="order.notes"><span>Notes</span><span>{{ order.notes }}</span></div>
      </div>

      <div class="bottom-actions">
        <button class="btn btn-primary" @click="reorder" :disabled="reordering">
          {{ reordering ? 'Adding to cart…' : '🔁 Reorder' }}
        </button>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-title">Order not found</p>
      <button class="btn btn-primary" style="margin-top:24px" @click="router.push('/orders')">
        Back to orders
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'
import { useToast } from '@/composables/useToast'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const cart = useCartStore()

const order = ref(null)
const loading = ref(true)
const reordering = ref(false)

// Statuses where order is still active — keep polling
const ACTIVE_STATUSES = ['pending', 'paid', 'preparing']
const POLL_INTERVAL = 60_000
let pollTimer = null

const isPolling = computed(() =>
  order.value && ACTIVE_STATUSES.includes(order.value.status)
)

const statusMap = {
  pending:   { label: 'Waiting for payment', icon: '⏳' },
  paid:      { label: 'Payment confirmed', icon: '✅' },
  preparing: { label: 'Preparing your order', icon: '👨‍🍳' },
  ready:     { label: 'Ready for pickup!', icon: '🎉' },
  completed: { label: 'Completed', icon: '✓' },
  cancelled: { label: 'Cancelled', icon: '✕' },
}

const statusLabel = computed(() => statusMap[order.value?.status]?.label || order.value?.status)
const statusIcon  = computed(() => statusMap[order.value?.status]?.icon  || '📋')

const statusToast = {
  paid:      { message: '✅ Payment confirmed!', type: 'success' },
  preparing: { message: '👨‍🍳 Your order is being prepared', type: 'info' },
  ready:     { message: '🎉 Your order is ready for pickup!', type: 'success' },
  completed: { message: 'Order completed. Thank you!', type: 'success' },
  cancelled: { message: 'Order was cancelled.', type: 'error' },
}

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

async function fetchOrder(showToastOnChange = false) {
  try {
    const fresh = await api.get(`/orders/${route.params.id}`)
    if (showToastOnChange && order.value && fresh.status !== order.value.status) {
      const t = statusToast[fresh.status]
      if (t) toast.show(t)
    }
    order.value = fresh
    if (!ACTIVE_STATUSES.includes(fresh.status)) stopPolling()
  } catch (e) {
    console.error(e)
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => fetchOrder(true), POLL_INTERVAL)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function reorder() {
  if (!order.value?.items?.length) return
  reordering.value = true

  cart.clear()
  cart.setOutlet(order.value.outlet_id)

  for (const item of order.value.items) {
    cart.addItem({
      menu_item_id: item.menu_item_id,
      name: item.item_name,
      unit_price: item.unit_price,
      option_ids: item.options?.map(o => o.option_id) || [],
      options_label: item.options?.map(o => o.label).join(', ') || '',
      notes: item.notes || '',
    })
    // If qty > 1, set it directly (item was just added at idx length-1)
    if (item.quantity > 1) {
      cart.updateQty(cart.items.length - 1, item.quantity)
    }
  }

  toast.show({ message: `${order.value.items.length} item(s) added to cart`, type: 'success' })
  reordering.value = false
  router.push('/cart')
}

onMounted(async () => {
  await fetchOrder(false)
  loading.value = false
  if (isPolling.value) startPolling()
})

onUnmounted(() => stopPolling())
</script>

<style scoped>
.order-detail-page {
  background: var(--bg);
  min-height: 100vh;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
}

.back-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
.page-header h2 { font-size: 18px; font-weight: 700; flex: 1; }

.poll-indicator { display: flex; align-items: center; }
.poll-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.3s;
}
.poll-indicator.active .poll-dot {
  background: #27AE60;
  box-shadow: 0 0 0 3px rgba(39,174,96,0.2);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(39,174,96,0.2); }
  50%       { box-shadow: 0 0 0 6px rgba(39,174,96,0.05); }
}

.loading-state { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 60px; border-radius: var(--radius); background: #f0f0f0; }

.status-banner {
  margin: 12px 16px;
  padding: 16px;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  gap: 14px;
}
.status-banner.status-pending   { background: #fff8e1; }
.status-banner.status-paid      { background: #e8f5e9; }
.status-banner.status-preparing { background: #e3f2fd; }
.status-banner.status-ready     { background: #e8f5e9; }
.status-banner.status-completed { background: var(--bg); }
.status-banner.status-cancelled { background: #ffebee; }

.status-icon { font-size: 32px; flex-shrink: 0; }
.status-text { flex: 1; }
.status-label { font-size: 16px; font-weight: 700; }
.order-no { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.live-badge {
  font-size: 10px;
  font-weight: 800;
  background: #27AE60;
  color: #fff;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: 0.5px;
  animation: pulse-badge 2s infinite;
}
@keyframes pulse-badge {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.7; }
}

.section-card { margin: 12px 16px; }
.section-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}
.order-item-row:last-child { border-bottom: none; }
.order-item-info { flex: 1; }
.order-item-name { font-size: 14px; font-weight: 600; }
.order-item-opts { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.order-item-notes { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.order-item-price { font-size: 14px; font-weight: 700; }

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}
.summary-row.total {
  border-top: 1px solid var(--border);
  margin-top: 6px;
  padding-top: 10px;
  font-size: 16px;
  font-weight: 700;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}
.info-row span:first-child { color: var(--text-muted); }

.bottom-actions { padding: 0 16px; margin-top: 8px; }
.bottom-actions .btn { width: 100%; padding: 14px; }

.empty-state { text-align: center; padding: 60px 24px; }
.empty-icon { font-size: 56px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 700; }
</style>