<template>
  <div class="page">
    <div class="page-header" style="display:flex;align-items:center;gap:16px">
      <button class="btn btn-ghost" @click="router.push('/orders')">← Back</button>
      <div>
        <h1 class="page-title">{{ order?.order_no }}</h1>
        <p class="page-sub">Order detail</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <template v-else-if="order">
      <div class="detail-grid">
        <!-- Left col -->
        <div class="col-left">
          <div class="card" style="margin-bottom:16px">
            <h3 class="section-title">Items</h3>
            <div class="item-list">
              <div v-for="item in order.items" :key="item.id" class="item-row">
                <div class="item-info">
                  <div class="item-name">{{ item.item_name }} × {{ item.quantity }}</div>
                  <div v-if="item.options?.length" class="item-opts">{{ item.options.map(o => o.label).join(', ') }}</div>
                  <div v-if="item.notes" class="item-opts">📝 {{ item.notes }}</div>
                </div>
                <div class="item-price">RM {{ (item.unit_price * item.quantity).toFixed(2) }}</div>
              </div>
            </div>
            <div class="summary">
              <div class="sum-row"><span>Subtotal</span><span>RM {{ parseFloat(order.subtotal).toFixed(2) }}</span></div>
              <div v-if="order.discount > 0" class="sum-row green"><span>Points discount</span><span>−RM {{ parseFloat(order.discount).toFixed(2) }}</span></div>
              <div class="sum-row total"><span>Total</span><span>RM {{ parseFloat(order.total).toFixed(2) }}</span></div>
            </div>
          </div>
        </div>

        <!-- Right col -->
        <div class="col-right">
          <div class="card" style="margin-bottom:16px">
            <h3 class="section-title">Status</h3>
            <div class="status-row">
              <span :class="['badge', `badge-${order.status}`]" style="font-size:14px;padding:6px 14px">{{ order.status }}</span>
            </div>
            <div class="status-actions">
              <button
                v-for="s in nextStatuses"
                :key="s.value"
                :class="['btn', s.cls]"
                @click="updateStatus(s.value)"
                :disabled="updating"
              >{{ s.label }}</button>
            </div>
          </div>

          <div class="card" style="margin-bottom:16px">
            <h3 class="section-title">Customer</h3>
            <div class="info-row"><span>Name</span><span>{{ order.customer_name }}</span></div>
            <div class="info-row"><span>Phone</span><span>{{ order.customer_phone }}</span></div>
            <div class="info-row"><span>Outlet</span><span>{{ order.outlet_name }}</span></div>
            <div class="info-row"><span>Placed</span><span>{{ formatDate(order.created_at) }}</span></div>
          </div>

          <div class="card" v-if="order.points_earned || order.points_redeemed">
            <h3 class="section-title">Points</h3>
            <div v-if="order.points_earned"   class="info-row green"><span>Earned</span><span>+{{ order.points_earned }} pts</span></div>
            <div v-if="order.points_redeemed" class="info-row">      <span>Redeemed</span><span>{{ order.points_redeemed }} pts</span></div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/services/api'

const router  = useRouter()
const route   = useRoute()
const order   = ref(null)
const loading = ref(true)
const updating = ref(false)

const statusFlow = {
  pending:   [{ value: 'cancelled', label: 'Cancel', cls: 'btn-danger' }],
  paid:      [{ value: 'preparing', label: 'Start Preparing', cls: 'btn-primary' }, { value: 'cancelled', label: 'Cancel', cls: 'btn-danger' }],
  preparing: [{ value: 'ready',     label: 'Mark Ready',      cls: 'btn-primary' }],
  ready:     [{ value: 'completed', label: 'Complete',         cls: 'btn-primary' }],
  completed: [],
  cancelled: [],
}

const nextStatuses = computed(() => statusFlow[order.value?.status] || [])

function formatDate(dt) {
  return new Date(dt).toLocaleString('en-MY', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function updateStatus(status) {
  updating.value = true
  try {
    await api.patch(`/admin/orders/${order.value.id}/status`, { status })
    order.value.status = status
  } catch (e) { console.error(e) }
  finally { updating.value = false }
}

onMounted(async () => {
  try { order.value = await api.get(`/admin/orders/${route.params.id}`) }
  catch (e) { console.error(e) }
  finally { loading.value = false }
})
</script>

<style scoped>
.loading    { padding: 40px; text-align: center; color: var(--muted); }
.detail-grid { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.section-title { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
.item-list   { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
.item-row    { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); }
.item-row:last-child { border-bottom: none; }
.item-name   { font-size: 14px; font-weight: 600; }
.item-opts   { font-size: 12px; color: var(--muted); margin-top: 2px; }
.item-price  { font-weight: 700; font-size: 14px; }
.summary     { border-top: 1px solid var(--border); padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
.sum-row     { display: flex; justify-content: space-between; font-size: 14px; }
.sum-row.total { font-weight: 700; font-size: 15px; padding-top: 6px; border-top: 1px solid var(--border); }
.sum-row.green span:last-child { color: var(--green); }
.status-row    { margin-bottom: 14px; }
.status-actions { display: flex; flex-direction: column; gap: 8px; }
.status-actions .btn { width: 100%; padding: 10px; }
.info-row    { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.info-row:last-child { border-bottom: none; }
.info-row span:first-child { color: var(--muted); }
.info-row.green span:last-child { color: var(--green); font-weight: 600; }
</style>
