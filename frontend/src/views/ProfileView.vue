<template>
  <div class="profile-page">

    <!-- Header card -->
    <div class="profile-header">
      <div class="avatar">{{ initials }}</div>
      <div class="profile-info">
        <h2>{{ auth.user?.name }}</h2>
        <p>{{ auth.user?.phone }}</p>
      </div>
      <div :class="['tier-badge', `tier-${auth.tier}`]">{{ auth.tier }}</div>
    </div>

    <!-- Points card -->
    <div class="points-card card">
      <div class="points-main">
        <div>
          <p class="points-label">Your points</p>
          <p class="points-value">{{ auth.points }} <span>pts</span></p>
        </div>
        <div class="points-right">
          <p class="points-rm">≈ RM {{ (auth.points * 0.01).toFixed(2) }}</p>
          <p class="points-tip">redeemable value</p>
        </div>
      </div>
      <!-- Tier progress -->
      <div class="tier-progress" v-if="auth.tier !== 'gold'">
        <div class="tier-progress-header">
          <span>{{ auth.tier }} → {{ nextTier }}</span>
          <span>{{ auth.points }} / {{ tierThreshold }} pts</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
      </div>
      <div class="tier-progress" v-else>
        <p style="font-size:13px;color:#ffd700;font-weight:600;">🏆 You're a Gold member!</p>
      </div>
    </div>

    <!-- Points history -->
    <div class="card section-card" v-if="pointsData">
      <p class="section-label">Points history</p>
      <div v-if="pointsData.transactions.length === 0" class="empty-tx">No transactions yet</div>
      <div v-for="tx in pointsData.transactions" :key="tx.id" class="tx-row">
        <div class="tx-info">
          <p class="tx-type">{{ txLabel(tx.type) }}</p>
          <p class="tx-ref" v-if="tx.order_no">{{ tx.order_no }}</p>
          <p class="tx-date">{{ formatDate(tx.created_at) }}</p>
        </div>
        <span :class="['tx-amount', tx.amount > 0 ? 'earn' : 'spend']">
          {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }} pts
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="card section-card actions-card">
      <button class="action-row" @click="router.push('/orders')">
        <span>📋 My orders</span><span>›</span>
      </button>
      <button class="action-row logout" @click="doLogout">
        <span>🚪 Log out</span><span>›</span>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router     = useRouter()
const auth       = useAuthStore()
const pointsData = ref(null)

const initials = computed(() => {
  const n = auth.user?.name || ''
  return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
})

const tierMap = { bronze: { next: 'Silver', threshold: 500 }, silver: { next: 'Gold', threshold: 2000 } }
const nextTier      = computed(() => tierMap[auth.tier]?.next || '')
const tierThreshold = computed(() => tierMap[auth.tier]?.threshold || 0)
const progressPct   = computed(() => Math.min(100, Math.round((auth.points / tierThreshold.value) * 100)))

function txLabel(type) {
  return { earn: '⭐ Earned', redeem: '💳 Redeemed', expire: '⏰ Expired', adjust: '✏️ Adjusted' }[type] || type
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function doLogout() {
  await auth.logout()
  router.push('/login')
}

onMounted(async () => {
  try {
    pointsData.value = await api.get('/points')
    // sync points into store
    if (pointsData.value) {
      auth.user.points = pointsData.value.balance
    }
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.profile-page { background: var(--bg); min-height: 100vh; padding-bottom: 80px; }

.profile-header {
  background: var(--blue); color: #fff;
  padding: 28px 20px 24px;
  display: flex; align-items: center; gap: 14px;
}
.avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,0.25);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700;
}
.profile-info { flex: 1; }
.profile-info h2 { font-size: 18px; font-weight: 700; }
.profile-info p  { font-size: 13px; opacity: 0.8; margin-top: 2px; }
.tier-badge {
  padding: 4px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 700; text-transform: uppercase;
}
.tier-bronze { background: #cd7f32; color: #fff; }
.tier-silver { background: #c0c0c0; color: #333; }
.tier-gold   { background: #ffd700; color: #333; }

.points-card { margin: 16px 16px 0; }
.points-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.points-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.points-value { font-size: 36px; font-weight: 800; color: var(--blue); line-height: 1; margin-top: 4px; }
.points-value span { font-size: 16px; font-weight: 600; }
.points-right { text-align: right; }
.points-rm  { font-size: 18px; font-weight: 700; color: var(--text); }
.points-tip { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.tier-progress-header { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; }
.progress-bar { height: 6px; background: var(--bg); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--blue); border-radius: 3px; transition: width .4s; }

.section-card { margin: 12px 16px; }
.section-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
.empty-tx { font-size: 14px; color: var(--text-muted); text-align: center; padding: 12px 0; }

.tx-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--border); }
.tx-row:last-child { border-bottom: none; }
.tx-type { font-size: 14px; font-weight: 600; }
.tx-ref  { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.tx-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.tx-amount { font-size: 15px; font-weight: 700; }
.tx-amount.earn  { color: #2e7d32; }
.tx-amount.spend { color: var(--blue); }

.actions-card { }
.action-row {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding: 14px 0; background: none; border: none;
  border-bottom: 1px solid var(--border); font-size: 15px;
  cursor: pointer; color: var(--text);
}
.action-row:last-child { border-bottom: none; }
.action-row.logout { color: #e53e3e; }
</style>
