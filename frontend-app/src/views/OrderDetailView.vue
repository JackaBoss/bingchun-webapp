<template>
  <div class="order-detail-page">
    <div class="page-header">
      <button class="back-btn" @click="router.push('/orders')">←</button>
      <h2>Order Detail</h2>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="skeleton" v-for="n in 5" :key="n"></div>
    </div>

    <template v-else-if="order">
      <!-- Status banner -->
      <div :class="['status-banner', `status-${order.status}`]">
        <span class="status-icon">{{ statusIcon }}</span>
        <div>
          <p class="status-label">{{ statusLabel }}</p>
          <p class="order-no">{{ order.order_no }}</p>
        </div>
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
        <button class="btn btn-primary" @click="router.push('/')">Order again</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const route  = useRoute()

const order   = ref(null)
const loading = ref(true)

const statusMap = {
  pending:    { label: 'Waiting for payment',  icon: '⏳' },
  paid:       { label: 'Payment confirmed',     icon: '✅' },
  preparing:  { label: 'Preparing your order', icon: '👨‍🍳' },
  ready:      { label: 'Ready for pickup!',    icon: '🎉' },
  completed:  { label: 'Completed',            icon: '✓'  },
  cancelled:  { label: 'Cancelled',            icon: '✕'  },
}

const statusLabel = computed(() => statusMap[order.value?.status]?.label || order.value?.status)
const statusIcon  = computed(() => statusMap[order.value?.status]?.icon || '📋')

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

onMounted(async () => {
  try {
    order.value = await api.get(`/orders/${route.params.id}`)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.order-detail-page { background: var(--bg); min-height: 100vh; padding-bottom: 80px; }
.page-header {
  display: flex; align-items: center; gap: 12px;
  padding: 16px; background: var(--white);
  border-bottom: 1px solid var(--border);
}
.back-btn { background: none; border: none; font-size: 20px; cursor: pointer; }
.page-header h2 { font-size: 18px; font-weight: 700; }

.loading-state { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.skeleton { height: 60px; border-radius: var(--radius); background: #f0f0f0; }

.status-banner {
  margin: 12px 16px; padding: 16px;
  border-radius: var(--radius); display: flex; align-items: center; gap: 14px;
}
.status-banner.status-pending   { background: #fff8e1; }
.status-banner.status-paid      { background: #e8f5e9; }
.status-banner.status-preparing { background: #e3f2fd; }
.status-banner.status-ready     { background: #e8f5e9; }
.status-banner.status-completed { background: var(--bg); }
.status-banner.status-cancelled { background: #ffebee; }
.status-icon  { font-size: 32px; }
.status-label { font-size: 16px; font-weight: 700; }
.order-no     { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.section-card { margin: 12px 16px; }
.section-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }

.order-item-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid var(--border); }
.order-item-row:last-child { border-bottom: none; }
.order-item-info { flex: 1; }
.order-item-name  { font-size: 14px; font-weight: 600; }
.order-item-opts  { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.order-item-notes { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.order-item-price { font-size: 14px; font-weight: 700; }

.summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.summary-row.total { border-top: 1px solid var(--border); margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 700; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
.info-row span:first-child { color: var(--text-muted); }

.bottom-actions { padding: 0 16px; margin-top: 8px; }
</style>
