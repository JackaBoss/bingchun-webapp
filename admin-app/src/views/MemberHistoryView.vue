<template>
  <div class="cmd-page">

    <!-- ── HEADER ──────────────────────────────────────────────────── -->
    <div class="cmd-header">
      <button class="back-btn" @click="$router.back()">← Members</button>

      <div v-if="member" class="member-ident">
        <div class="member-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
        <div>
          <div class="member-name">{{ member.name }}</div>
          <div class="member-sub">{{ member.phone }} · <span :class="`tier-${member.tier}`">{{ member.tier }}</span></div>
        </div>
        <router-link :to="`/members/${member.id}/edit`" class="edit-link">Edit Profile →</router-link>
      </div>
    </div>

    <div v-if="loading" class="cmd-loading">Loading…</div>
    <div v-else-if="error" class="cmd-error">{{ error }}</div>

    <template v-else>

      <!-- ── KPI STRIP ─────────────────────────────────────────────── -->
      <div class="kpi-strip">
        <div class="kpi">
          <div class="kpi-value">{{ stats.total_visits || 0 }}</div>
          <div class="kpi-label">Total Visits</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-value">RM{{ parseFloat(stats.total_spend || 0).toFixed(2) }}</div>
          <div class="kpi-label">Lifetime Spend</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-value">RM{{ parseFloat(stats.avg_bill || 0).toFixed(2) }}</div>
          <div class="kpi-label">Avg Bill</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-value accent">{{ member.points }}</div>
          <div class="kpi-label">Points Balance</div>
        </div>
        <div class="kpi-divider"></div>
        <div class="kpi">
          <div class="kpi-value">{{ stats.last_visit ? fmtDate(stats.last_visit) : '—' }}</div>
          <div class="kpi-label">Last Visit</div>
        </div>
      </div>

      <!-- ── MAIN GRID ─────────────────────────────────────────────── -->
      <div class="cmd-grid">

        <!-- LEFT: Top 5 Items ─────────────────────────────────────── -->
        <div class="panel panel-dark">
          <div class="panel-header">
            <span class="panel-icon">🏆</span>
            <span class="panel-title">TOP 5 ITEMS</span>
          </div>

          <div v-if="!ranking.length" class="panel-empty">
            No item data yet.<br>Add items when crediting walk-in points.
          </div>

          <div v-else class="top5-list">
            <div v-for="(item, idx) in ranking" :key="idx" class="top5-row">

              <!-- Rank medal -->
              <div class="medal" :class="`medal-${idx+1}`">
                <span v-if="idx === 0">🥇</span>
                <span v-else-if="idx === 1">🥈</span>
                <span v-else-if="idx === 2">🥉</span>
                <span v-else class="medal-num">{{ idx + 1 }}</span>
              </div>

              <!-- Bar + info -->
              <div class="top5-info">
                <div class="top5-name">{{ item.item_name }}</div>
                <div class="top5-bar-wrap">
                  <div class="top5-bar" :style="{ width: barWidth(item.total_qty) + '%' }"></div>
                </div>
                <div class="top5-sub">
                  {{ item.order_count }} visit{{ item.order_count !== 1 ? 's' : '' }} &nbsp;·&nbsp;
                  last {{ fmtDate(item.last_ordered) }}
                </div>
              </div>

              <!-- Qty + spend -->
              <div class="top5-stats">
                <div class="top5-qty">×{{ item.total_qty }}</div>
                <div class="top5-spend">RM{{ parseFloat(item.total_spend).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Visit Timeline ────────────────────────────────── -->
        <div class="panel panel-light">
          <div class="panel-header">
            <span class="panel-icon">📋</span>
            <span class="panel-title">VISIT HISTORY</span>
            <span class="panel-count">{{ sales.length }} visit{{ sales.length !== 1 ? 's' : '' }}</span>
          </div>

          <div v-if="!sales.length" class="panel-empty">No visits recorded yet.</div>

          <div v-else class="timeline">
            <div v-for="sale in sales" :key="sale.id" class="tl-item">

              <!-- Timeline dot + line -->
              <div class="tl-gutter">
                <div class="tl-dot"></div>
                <div class="tl-line"></div>
              </div>

              <!-- Content -->
              <div class="tl-card" :class="{ open: expandedId === sale.id }" @click="toggle(sale.id)">
                <div class="tl-top">
                  <div class="tl-left">
                    <div class="tl-orderno">{{ sale.walkin_order_no }}</div>
                    <div class="tl-date">{{ fmtDatetime(sale.created_at) }}</div>
                  </div>
                  <div class="tl-right">
                    <div class="tl-amount">RM{{ parseFloat(sale.bill_amount).toFixed(2) }}</div>
                    <div class="tl-pts">+{{ sale.points_earned }} pts</div>
                  </div>
                  <div class="tl-chevron">{{ expandedId === sale.id ? '▲' : '▼' }}</div>
                </div>

                <div v-if="expandedId === sale.id" class="tl-detail">
                  <div v-if="sale.items?.length" class="tl-items">
                    <div v-for="(it, i) in sale.items" :key="i" class="tl-item-row">
                      <span class="tl-item-q">×{{ it.quantity }}</span>
                      <span class="tl-item-n">{{ it.item_name }}</span>
                      <span class="tl-item-p">RM{{ (it.unit_price * it.quantity).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div v-else class="tl-no-items">No items recorded for this visit</div>
                  <div v-if="sale.staff_note" class="tl-note">📝 {{ sale.staff_note }}</div>
                  <div v-if="sale.staff_name" class="tl-note">👤 Credited by {{ sale.staff_name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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

const maxQty = computed(() => Math.max(...ranking.value.map(r => r.total_qty), 1))
const barWidth = (qty) => Math.round((qty / maxQty.value) * 100)

onMounted(async () => {
  try {
    const [historyRes, rankingRes] = await Promise.all([
      api.get(`/admin/members/${memberId}/history`),
      api.get(`/admin/members/${memberId}/item-ranking`),
    ])
    member.value  = historyRes.member
    sales.value   = historyRes.sales
    stats.value   = rankingRes.stats   || {}
    ranking.value = rankingRes.ranking || []
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to load'
  } finally {
    loading.value = false
  }
})

function toggle(id) { expandedId.value = expandedId.value === id ? null : id }

function fmtDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDatetime(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-MY', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur'
  })
}
</script>

<style scoped>
/* Page shell */
.cmd-page    { min-height: 100vh; background: #0f1117; color: #e8eaf0; padding: 24px; font-family: 'DM Mono', 'Fira Code', monospace; }
.cmd-loading { padding: 80px; text-align: center; color: #666; }
.cmd-error   { background: #2d1111; border: 1px solid #7f1d1d; color: #fca5a5; padding: 14px 18px; border-radius: 8px; }

/* Header */
.cmd-header  { display: flex; align-items: center; gap: 24px; margin-bottom: 24px; }
.back-btn    { background: none; border: 1px solid #2a2d3a; color: #8891aa; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: all .15s; }
.back-btn:hover { border-color: #4f83cc; color: #a8c4f0; }
.member-ident { display: flex; align-items: center; gap: 14px; flex: 1; }
.member-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #4f83cc, #2d5db5); color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(79,131,204,.3); }
.member-name { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: .3px; }
.member-sub  { font-size: 12px; color: #667; margin-top: 3px; }
.tier-bronze { color: #cd7f32; }
.tier-silver { color: #aaa; }
.tier-gold   { color: #ffd700; }
.edit-link   { margin-left: auto; font-size: 12px; color: #4f83cc; text-decoration: none; border: 1px solid #2a3a55; padding: 6px 12px; border-radius: 6px; transition: all .15s; }
.edit-link:hover { background: #1a2a3d; }

/* KPI strip */
.kpi-strip   { display: flex; align-items: center; background: #161921; border: 1px solid #1e2130; border-radius: 12px; padding: 20px 28px; margin-bottom: 20px; gap: 0; }
.kpi         { flex: 1; text-align: center; }
.kpi-value   { font-size: 20px; font-weight: 700; color: #c8d6ea; letter-spacing: .5px; }
.kpi-value.accent { color: #4fc3f7; }
.kpi-label   { font-size: 10px; color: #445; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; }
.kpi-divider { width: 1px; background: #1e2130; align-self: stretch; margin: 0 8px; }

/* Main grid */
.cmd-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width: 800px) { .cmd-grid { grid-template-columns: 1fr; } .kpi-strip { flex-wrap: wrap; gap: 16px; } }

/* Panels */
.panel       { border-radius: 12px; overflow: hidden; }
.panel-dark  { background: #161921; border: 1px solid #1e2130; }
.panel-light { background: #13161e; border: 1px solid #1e2130; }
.panel-header { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-bottom: 1px solid #1e2130; }
.panel-icon  { font-size: 16px; }
.panel-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #556; flex: 1; }
.panel-count { font-size: 11px; color: #445; }
.panel-empty { padding: 40px 20px; text-align: center; color: #334; font-size: 13px; line-height: 1.7; }

/* Top 5 */
.top5-list   { padding: 12px; display: flex; flex-direction: column; gap: 4px; }
.top5-row    { display: flex; align-items: center; gap: 12px; padding: 12px 10px; border-radius: 8px; transition: background .1s; }
.top5-row:hover { background: #1a1e28; }
.medal       { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.medal-num   { font-size: 13px; font-weight: 700; color: #445; }
.top5-info   { flex: 1; min-width: 0; }
.top5-name   { font-size: 13px; font-weight: 600; color: #c8d6ea; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
.top5-bar-wrap { height: 4px; background: #1e2130; border-radius: 2px; overflow: hidden; margin-bottom: 5px; }
.top5-bar    { height: 100%; background: linear-gradient(90deg, #4f83cc, #4fc3f7); border-radius: 2px; transition: width .5s ease; }
.top5-sub    { font-size: 10px; color: #445; letter-spacing: .3px; }
.top5-stats  { text-align: right; flex-shrink: 0; }
.top5-qty    { font-size: 18px; font-weight: 700; color: #4fc3f7; line-height: 1; }
.top5-spend  { font-size: 11px; color: #445; margin-top: 2px; }

/* Timeline */
.timeline    { padding: 16px 16px 4px; display: flex; flex-direction: column; max-height: 600px; overflow-y: auto; }
.tl-item     { display: flex; gap: 10px; }
.tl-gutter   { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 16px; padding-top: 6px; }
.tl-dot      { width: 10px; height: 10px; border-radius: 50%; background: #4f83cc; box-shadow: 0 0 0 3px rgba(79,131,204,.2); flex-shrink: 0; }
.tl-line     { width: 2px; flex: 1; background: #1e2130; margin-top: 4px; }
.tl-item:last-child .tl-line { display: none; }
.tl-card     { flex: 1; background: #1a1e28; border: 1px solid #1e2130; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; cursor: pointer; transition: border-color .15s; }
.tl-card:hover, .tl-card.open { border-color: #2a3a55; }
.tl-top      { display: flex; align-items: flex-start; gap: 8px; }
.tl-left     { flex: 1; }
.tl-orderno  { font-size: 13px; font-weight: 700; color: #c8d6ea; letter-spacing: .3px; }
.tl-date     { font-size: 11px; color: #445; margin-top: 2px; }
.tl-right    { text-align: right; }
.tl-amount   { font-size: 14px; font-weight: 700; color: #e8eaf0; }
.tl-pts      { font-size: 11px; color: #4fc3f7; font-weight: 600; margin-top: 1px; }
.tl-chevron  { font-size: 10px; color: #334; align-self: center; }
.tl-detail   { margin-top: 10px; padding-top: 10px; border-top: 1px solid #1e2130; }
.tl-items    { display: flex; flex-direction: column; gap: 5px; }
.tl-item-row { display: flex; gap: 8px; font-size: 12px; }
.tl-item-q   { color: #4f83cc; font-weight: 700; min-width: 24px; }
.tl-item-n   { flex: 1; color: #a8b4c8; }
.tl-item-p   { color: #667; }
.tl-no-items { font-size: 12px; color: #334; padding: 4px 0; }
.tl-note     { font-size: 11px; color: #556; margin-top: 5px; }

/* Scrollbar */
.timeline::-webkit-scrollbar { width: 4px; }
.timeline::-webkit-scrollbar-track { background: transparent; }
.timeline::-webkit-scrollbar-thumb { background: #1e2130; border-radius: 2px; }
</style>