<template>
  <div class="page">
    <div class="page-header" style="display:flex;align-items:center;gap:16px">
      <button class="btn btn-ghost" @click="$router.back()">← Back</button>
      <div>
        <h1 class="page-title" style="margin:0">{{ member?.name || 'Member History' }}</h1>
        <p class="page-sub" style="margin:0">{{ member?.phone }}</p>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">{{ stats.total_visits || 0 }}</div>
          <div class="stat-lbl">Total Visits</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">RM{{ parseFloat(stats.total_spend || 0).toFixed(2) }}</div>
          <div class="stat-lbl">Total Spend</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">RM{{ parseFloat(stats.avg_bill || 0).toFixed(2) }}</div>
          <div class="stat-lbl">Avg Bill</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ member.points }}</div>
          <div class="stat-lbl">Points</div>
        </div>
      </div>

      <div class="two-col">
        <div class="card">
          <h3 class="section-title">🏆 Favourite Items</h3>
          <div v-if="!ranking.length" class="no-data">No item data yet — add items when crediting points.</div>
          <div v-else class="ranking-list">
            <div v-for="(item, idx) in ranking" :key="idx" class="rank-row">
              <div class="rank-num" :class="['r1','r2','r3'][idx] || 'rn'">{{ idx + 1 }}</div>
              <div class="rank-info">
                <div class="rank-name">{{ item.item_name }}</div>
                <div class="rank-sub">{{ item.order_count }} visit(s) · last {{ fmtDate(item.last_ordered) }}</div>
              </div>
              <div class="rank-right">
                <div class="rank-qty">×{{ item.total_qty }}</div>
                <div class="rank-spend">RM{{ parseFloat(item.total_spend).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="section-title">📋 Visit History</h3>
          <div v-if="!sales.length" class="no-data">No visits recorded yet.</div>
          <div v-else class="history-list">
            <div v-for="sale in sales" :key="sale.id" class="history-row"
              :class="{ expanded: expandedId === sale.id }" @click="toggle(sale.id)">
              <div class="h-top">
                <div style="flex:1">
                  <div class="h-orderno">{{ sale.walkin_order_no }}</div>
                  <div class="h-date">{{ fmtDatetime(sale.created_at) }}</div>
                </div>
                <div style="text-align:right">
                  <div class="h-amount">RM{{ parseFloat(sale.bill_amount).toFixed(2) }}</div>
                  <div class="h-pts green">+{{ sale.points_earned }} pts</div>
                </div>
                <div class="h-chevron">{{ expandedId === sale.id ? '▲' : '▼' }}</div>
              </div>
              <div v-if="expandedId === sale.id" class="h-detail">
                <div v-if="sale.items && sale.items.length" class="h-items">
                  <div v-for="(it, i) in sale.items" :key="i" class="h-item">
                    <span>×{{ it.quantity }} {{ it.item_name }}</span>
                    <span>RM{{ (it.unit_price * it.quantity).toFixed(2) }}</span>
                  </div>
                </div>
                <div v-else class="no-data" style="padding:8px 0;font-size:12px">No items recorded for this visit</div>
                <div v-if="sale.staff_note" class="h-note">Note: {{ sale.staff_note }}</div>
                <div v-if="sale.staff_name" class="h-note">Credited by: {{ sale.staff_name }}</div>
              </div>
            </div>
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

const route      = useRoute()
const memberId   = route.params.id
const loading    = ref(true)
const error      = ref('')
const member     = ref(null)
const stats      = ref({})
const ranking    = ref([])
const sales      = ref([])
const expandedId = ref(null)

onMounted(async () => {
  try {
    const [historyRes, rankingRes] = await Promise.all([
      api.get(`/admin/members/${memberId}/history`),
      api.get(`/admin/members/${memberId}/item-ranking`),
    ])
    member.value  = historyRes.member
    sales.value   = historyRes.sales
    stats.value   = rankingRes.stats  || {}
    ranking.value = rankingRes.ranking || []
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to load'
  } finally {
    loading.value = false
  }
})

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}
function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDatetime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kuala_Lumpur',
  })
}
</script>

<style scoped>
.page-sub    { color: var(--muted); font-size: 14px; }
.loading     { padding: 40px; text-align: center; color: var(--muted); }
.error-msg   { background: #fee2e2; color: #991b1b; padding: 12px 16px; border-radius: 8px; }
.no-data     { color: var(--muted); font-size: 13px; padding: 16px 0; text-align: center; }
.stats-row   { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
.stat-card   { background: #fff; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
.stat-num    { font-size: 22px; font-weight: 800; color: var(--blue); }
.stat-lbl    { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-top: 4px; }
.two-col     { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width:700px) { .two-col { grid-template-columns: 1fr; } .stats-row { grid-template-columns: repeat(2,1fr); } }
.section-title { font-size: 15px; font-weight: 700; margin-bottom: 16px; }
.ranking-list  { display: flex; flex-direction: column; gap: 8px; }
.rank-row    { display: flex; align-items: center; gap: 12px; padding: 10px; background: #f7f9ff; border-radius: 10px; }
.rank-num    { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
.r1 { background: #ffd700; color: #7a5800; }
.r2 { background: #e0e0e0; color: #555; }
.r3 { background: #cd7f32; color: #fff; }
.rn { background: #e0e8ff; color: var(--blue); }
.rank-info   { flex: 1; }
.rank-name   { font-size: 14px; font-weight: 600; }
.rank-sub    { font-size: 11px; color: var(--muted); margin-top: 2px; }
.rank-right  { text-align: right; }
.rank-qty    { font-size: 15px; font-weight: 800; color: var(--blue); }
.rank-spend  { font-size: 11px; color: var(--muted); }
.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-row  { border: 1.5px solid #e0e8ff; border-radius: 10px; padding: 12px 14px; cursor: pointer; transition: border-color .15s; }
.history-row:hover { border-color: var(--blue); }
.h-top       { display: flex; align-items: flex-start; gap: 10px; }
.h-orderno   { font-size: 14px; font-weight: 700; }
.h-date      { font-size: 12px; color: var(--muted); margin-top: 2px; }
.h-amount    { font-size: 15px; font-weight: 700; }
.h-pts       { font-size: 12px; font-weight: 600; }
.green       { color: var(--green, #16a34a); }
.h-chevron   { color: var(--muted); font-size: 11px; align-self: center; margin-left: 4px; }
.h-detail    { margin-top: 10px; padding-top: 10px; border-top: 1px solid #f0f4ff; }
.h-items     { display: flex; flex-direction: column; gap: 4px; }
.h-item      { display: flex; justify-content: space-between; font-size: 13px; }
.h-note      { font-size: 12px; color: var(--muted); margin-top: 6px; }
</style>