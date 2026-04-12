<template>
  <div class="page">
    <div class="page-header">
      <button class="btn btn-ghost" @click="$router.back()">← Back</button>
    </div>

    <div v-if="loading" class="loading">Loading order…</div>
    <div v-else-if="!order" class="loading">Order not found.</div>

    <template v-else>
      <!-- Header row -->
      <div class="order-header">
        <div>
          <h1 class="order-no">{{ order.order_no }}</h1>
          <p class="order-meta">{{ fmtDatetime(order.created_at) }} · {{ order.outlet_name }}</p>
        </div>
        <div class="status-block">
          <span :class="['status-badge', `status-${order.status}`]">{{ order.status }}</span>
        </div>
      </div>

      <div class="grid-2">
        <!-- Left: items + totals -->
        <div class="card">
          <h3 class="card-title">Order Items</h3>
          <div class="items-list">
            <div v-for="item in order.items" :key="item.id" class="item-row">
              <div class="item-main">
                <span class="item-qty">×{{ item.quantity }}</span>
                <span class="item-name">{{ item.item_name }}</span>
                <span class="item-price">RM{{ (item.unit_price * item.quantity).toFixed(2) }}</span>
              </div>
              <div v-if="item.options?.length" class="item-opts">
                {{ item.options.map(o => o.label).join(' · ') }}
              </div>
              <div v-if="item.notes" class="item-note">Note: {{ item.notes }}</div>
            </div>
          </div>
          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>RM{{ parseFloat(order.subtotal).toFixed(2) }}</span></div>
            <div v-if="parseFloat(order.discount) > 0" class="total-row discount">
              <span>Points Discount</span><span>−RM{{ parseFloat(order.discount).toFixed(2) }}</span>
            </div>
            <div class="total-row grand"><span>Total</span><span>RM{{ parseFloat(order.total).toFixed(2) }}</span></div>
            <div class="total-row muted"><span>Payment</span><span>{{ order.payment_method }}</span></div>
            <div v-if="order.points_earned > 0" class="total-row pts">
              <span>Points earned</span><span>+{{ order.points_earned }} pts</span>
            </div>
            <div v-if="order.points_redeemed > 0" class="total-row pts">
              <span>Points redeemed</span><span>−{{ order.points_redeemed }} pts</span>
            </div>
          </div>
        </div>

        <!-- Right: customer + status update -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <!-- Customer card -->
          <div class="card">
            <h3 class="card-title">Customer</h3>
            <div class="customer-info">
              <div class="c-avatar">{{ order.customer_name?.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="c-name">{{ order.customer_name }}</div>
                <div class="c-phone">{{ order.customer_phone }}</div>
              </div>
            </div>
          </div>

          <!-- Status update card -->
          <div class="card status-card">
            <h3 class="card-title">Update Order Status</h3>
            <div class="status-grid">
              <button
                v-for="s in statuses" :key="s.value"
                :class="['status-btn', `sbtn-${s.value}`, { active: selectedStatus === s.value, current: order.status === s.value }]"
                @click="selectedStatus = s.value"
              >
                <span class="sbtn-icon">{{ s.icon }}</span>
                <span class="sbtn-label">{{ s.label }}</span>
                <span v-if="order.status === s.value" class="sbtn-current">current</span>
              </button>
            </div>
            <div v-if="updateError" class="error-msg" style="margin-top:12px">{{ updateError }}</div>
            <button
              class="btn btn-primary"
              style="width:100%;margin-top:16px;padding:13px;font-size:14px"
              :disabled="!selectedStatus || selectedStatus === order.status || updating"
              @click="updateStatus"
            >
              {{ updating ? 'Updating…' : selectedStatus && selectedStatus !== order.status ? `Set to ${selectedStatus.toUpperCase()}` : 'Select a new status' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'

const route  = useRoute()
const order  = ref(null)
const loading = ref(true)
const updating = ref(false)
const updateError = ref('')
const selectedStatus = ref('')

const statuses = [
  { value: 'pending',   label: 'Pending',   icon: '🕐' },
  { value: 'paid',      label: 'Paid',      icon: '💳' },
  { value: 'preparing', label: 'Preparing', icon: '🧋' },
  { value: 'ready',     label: 'Ready',     icon: '✅' },
  { value: 'completed', label: 'Completed', icon: '🎉' },
  { value: 'cancelled', label: 'Cancelled', icon: '❌' },
]

onMounted(async () => {
  try {
    order.value = await api.get(`/admin/orders/${route.params.id}`)
    selectedStatus.value = order.value.status
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function updateStatus() {
  if (!selectedStatus.value || selectedStatus.value === order.value.status) return
  updating.value = true
  updateError.value = ''
  try {
    const updated = await api.patch(`/admin/orders/${route.params.id}/status`, { status: selectedStatus.value })
    order.value.status = updated.status
  } catch (e) {
    updateError.value = e.response?.data?.error || 'Failed to update status'
  } finally {
    updating.value = false
  }
}

function fmtDatetime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur'
  })
}
</script>

<style scoped>
.loading      { padding: 60px; text-align: center; color: var(--muted); }
.order-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.order-no     { font-size: 22px; font-weight: 800; margin: 0; }
.order-meta   { font-size: 13px; color: var(--muted); margin: 4px 0 0; }
.status-block { display: flex; align-items: center; }

.status-badge { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
.status-pending   { background:#fef3c7; color:#92400e; }
.status-paid      { background:#d1fae5; color:#065f46; }
.status-preparing { background:#dbeafe; color:#1e40af; }
.status-ready     { background:#e0e7ff; color:#3730a3; }
.status-completed { background:#d1fae5; color:#065f46; }
.status-cancelled { background:#fee2e2; color:#991b1b; }

.grid-2       { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:680px) { .grid-2 { grid-template-columns: 1fr; } }

.card-title   { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: var(--muted); margin-bottom: 16px; }

.items-list   { display: flex; flex-direction: column; gap: 10px; }
.item-row     { padding-bottom: 10px; border-bottom: 1px solid #f0f4ff; }
.item-row:last-child { border-bottom: none; padding-bottom: 0; }
.item-main    { display: flex; align-items: center; gap: 8px; }
.item-qty     { font-size: 13px; font-weight: 700; color: var(--blue); min-width: 24px; }
.item-name    { flex: 1; font-size: 14px; font-weight: 500; }
.item-price   { font-size: 14px; font-weight: 700; }
.item-opts    { font-size: 12px; color: var(--muted); margin-top: 3px; padding-left: 32px; }
.item-note    { font-size: 12px; color: #d97706; margin-top: 2px; padding-left: 32px; }

.totals       { border-top: 2px solid #f0f4ff; margin-top: 16px; padding-top: 12px; display: flex; flex-direction: column; gap: 7px; }
.total-row    { display: flex; justify-content: space-between; font-size: 13px; }
.total-row.discount { color: #d97706; }
.total-row.grand    { font-size: 16px; font-weight: 800; border-top: 1px solid #e0e8ff; padding-top: 8px; margin-top: 4px; }
.total-row.muted span { color: var(--muted); }
.total-row.pts span   { color: #16a34a; font-weight: 600; }

.customer-info { display: flex; align-items: center; gap: 12px; }
.c-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 16px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.c-name   { font-size: 15px; font-weight: 700; }
.c-phone  { font-size: 13px; color: var(--muted); margin-top: 2px; }

/* Status grid */
.status-card  { }
.status-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.status-btn   { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 10px; border: 2px solid #e0e8ff; background: #f7f9ff; cursor: pointer; transition: all .15s; position: relative; }
.status-btn:hover { border-color: var(--blue); background: #eef3ff; }
.status-btn.active { border-color: var(--blue); background: var(--blue); color: #fff; }
.status-btn.current { border-style: dashed; }
.sbtn-icon    { font-size: 20px; }
.sbtn-label   { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
.sbtn-current { position: absolute; top: 4px; right: 6px; font-size: 9px; color: var(--blue); font-weight: 700; }
.status-btn.active .sbtn-current { color: rgba(255,255,255,.7); }

.error-msg { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; }
</style>