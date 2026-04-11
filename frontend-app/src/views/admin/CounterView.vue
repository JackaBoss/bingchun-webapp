<template>
  <div class="counter-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.push('/admin')">← Back</button>
      <div class="header-title">
        <span class="header-icon">🧋</span>
        <span>Walk-in Points</span>
      </div>
      <div style="width:64px" />
    </div>

    <div class="card-wrap">
      <transition name="fade" mode="out-in">

        <!-- STEP 1: Phone lookup -->
        <div v-if="step === 'lookup'" key="lookup">
          <p class="step-label">STEP 1 OF 2</p>
          <h2 class="step-title">Find Member</h2>
          <p class="step-sub">Enter the customer's phone number to look up their account.</p>
          <div class="field-group">
            <label class="field-label">Phone Number</label>
            <div class="input-row">
              <input
                v-model="phone"
                type="tel"
                placeholder="e.g. 0123456789"
                class="main-input"
                @keyup.enter="lookup"
                autofocus
              />
              <button class="btn-primary" @click="lookup" :disabled="loading || !phone.trim()">
                <span v-if="loading" class="spinner" />
                <span v-else>Search</span>
              </button>
            </div>
          </div>
          <div v-if="error" class="alert error">{{ error }}</div>
        </div>

        <!-- STEP 2: Credit points -->
        <div v-else-if="step === 'credit'" key="credit">
          <p class="step-label">STEP 2 OF 2</p>
          <h2 class="step-title">Credit Points</h2>

          <div class="member-pill">
            <div class="member-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
            <div class="member-info">
              <div class="member-name">{{ member.name }}</div>
              <div class="member-meta">{{ member.phone }}</div>
            </div>
            <div class="member-pts-badge">
              <div class="pts-num">{{ member.current_points }}</div>
              <div class="pts-lbl">pts</div>
            </div>
          </div>

          <div class="tier-row">
            <span class="tier-chip" :class="member.tier?.toLowerCase()">{{ member.tier }}</span>
          </div>

          <div class="field-group" style="margin-top:28px">
            <label class="field-label">Bill Amount (RM)</label>
            <input
              v-model="billAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              class="main-input amount-input"
              @keyup.enter="credit"
            />
          </div>

          <div v-if="billAmount > 0" class="earn-preview">
            <span class="earn-icon">⭐</span>
            <span>Customer will earn <strong>{{ Math.floor(billAmount) }} pts</strong></span>
          </div>

          <div v-if="error" class="alert error">{{ error }}</div>

          <div class="btn-row">
            <button class="btn-secondary" @click="reset">← Back</button>
            <button class="btn-primary" @click="credit" :disabled="loading || !billAmount || billAmount <= 0">
              <span v-if="loading" class="spinner" />
              <span v-else>Credit Points</span>
            </button>
          </div>
        </div>

        <!-- STEP 3: Success -->
        <div v-else-if="step === 'done'" key="done" class="success-wrap">
          <div class="success-ring">
            <span class="success-check">✓</span>
          </div>
          <h2 class="success-title">Points Credited!</h2>
          <p class="success-name">{{ result.member.name }}</p>
          <div class="success-stats">
            <div class="success-stat">
              <div class="ss-num green">+{{ result.points_earned }}</div>
              <div class="ss-lbl">Points Earned</div>
            </div>
            <div class="success-divider" />
            <div class="success-stat">
              <div class="ss-num">{{ result.new_balance }}</div>
              <div class="ss-lbl">New Balance</div>
            </div>
          </div>
          <button class="btn-primary wide" @click="reset">Next Customer →</button>
        </div>

      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const step = ref('lookup')
const phone = ref('')
const billAmount = ref('')
const member = ref(null)
const result = ref(null)
const loading = ref(false)
const error = ref('')

async function lookup() {
  if (!phone.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    const data = await api.get('/api/admin/member-lookup', { phone: phone.value.trim() })
    member.value = data
    step.value = 'credit'
  } catch (e) {
    error.value = e.response?.data?.error || 'Member not found'
  } finally {
    loading.value = false
  }
}

async function credit() {
  if (!billAmount.value || billAmount.value <= 0) return
  error.value = ''
  loading.value = true
  try {
    const data = await api.post('/api/admin/credit-points', {
      phone: phone.value.trim(),
      bill_amount: parseFloat(billAmount.value),
    })
    result.value = data
    step.value = 'done'
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to credit points'
  } finally {
    loading.value = false
  }
}

function reset() {
  step.value = 'lookup'
  phone.value = ''
  billAmount.value = ''
  member.value = null
  result.value = null
  error.value = ''
}
</script>

<style scoped>
.counter-page {
  min-height: 100vh;
  background: #F4F6F8;
  font-family: 'Segoe UI', sans-serif;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #E8ECF0;
  position: sticky;
  top: 0;
  z-index: 10;
}
.back-btn {
  background: none;
  border: none;
  font-size: 15px;
  color: #5B8AF0;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
}
.back-btn:hover { background: #F0F4FF; }
.header-title {
  font-size: 17px;
  font-weight: 700;
  color: #1A1A2E;
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-icon { font-size: 20px; }
.card-wrap {
  max-width: 480px;
  margin: 32px auto;
  background: white;
  border-radius: 20px;
  padding: 36px 32px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.07);
}
.step-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #5B8AF0;
  margin: 0 0 8px;
}
.step-title {
  font-size: 26px;
  font-weight: 800;
  color: #1A1A2E;
  margin: 0 0 8px;
}
.step-sub {
  font-size: 14px;
  color: #8892A4;
  margin: 0 0 28px;
}
.field-group { margin-bottom: 16px; }
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #5A6478;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.input-row { display: flex; gap: 10px; }
.main-input {
  flex: 1;
  min-width: 0;
  padding: 15px 18px;
  font-size: 18px;
  border: 2px solid #E8ECF0;
  border-radius: 12px;
  outline: none;
  color: #1A1A2E;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.main-input:focus { border-color: #5B8AF0; }
.amount-input { font-size: 24px; font-weight: 700; }
.btn-primary {
  background: #5B8AF0;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 15px 24px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;
}
.btn-primary:hover:not(:disabled) { background: #4070E0; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.btn-primary.wide { width: 100%; margin-top: 24px; padding: 18px; font-size: 17px; }
.btn-secondary {
  background: #F4F6F8;
  color: #5A6478;
  border: none;
  border-radius: 12px;
  padding: 15px 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-secondary:hover { background: #E8ECF0; }
.btn-row { display: flex; gap: 10px; margin-top: 24px; }
.spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.member-pill {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #F7F9FF;
  border: 1.5px solid #E0E8FF;
  border-radius: 16px;
  padding: 18px 20px;
}
.member-avatar {
  width: 46px; height: 46px;
  background: #5B8AF0;
  color: white;
  font-size: 20px;
  font-weight: 800;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.member-info { flex: 1; }
.member-name { font-size: 17px; font-weight: 700; color: #1A1A2E; }
.member-meta { font-size: 13px; color: #8892A4; margin-top: 2px; }
.member-pts-badge { text-align: center; }
.pts-num { font-size: 26px; font-weight: 800; color: #5B8AF0; line-height: 1; }
.pts-lbl { font-size: 11px; color: #8892A4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.tier-row { margin-top: 10px; }
.tier-chip {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #E8ECF0;
  color: #5A6478;
}
.tier-chip.gold { background: #FFF3CD; color: #856404; }
.tier-chip.silver { background: #E8EEF5; color: #546078; }
.tier-chip.bronze { background: #FDE8D8; color: #8A4A20; }
.tier-chip.platinum { background: #EEE8FF; color: #5B3EA0; }
.earn-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #F0F7FF;
  border: 1.5px solid #C8DEFF;
  border-radius: 12px;
  padding: 14px 18px;
  font-size: 15px;
  color: #2D5DB5;
  margin-top: 14px;
}
.earn-icon { font-size: 18px; }
.alert {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  margin-top: 14px;
}
.alert.error { background: #FEF0F0; color: #C0392B; border: 1px solid #FADADD; }
.success-wrap { text-align: center; padding: 12px 0; }
.success-ring {
  width: 90px; height: 90px;
  border-radius: 50%;
  background: #EBF5EB;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.success-check { font-size: 42px; color: #27AE60; line-height: 1; }
@keyframes popIn {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.success-title { font-size: 28px; font-weight: 800; color: #1A1A2E; margin: 0 0 6px; }
.success-name { font-size: 16px; color: #8892A4; margin: 0 0 28px; }
.success-stats {
  display: flex;
  align-items: center;
  background: #F7F9FF;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 8px;
}
.success-stat { flex: 1; }
.ss-num { font-size: 36px; font-weight: 800; color: #1A1A2E; }
.ss-num.green { color: #27AE60; }
.ss-lbl { font-size: 12px; color: #8892A4; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
.success-divider { width: 1px; background: #E0E8FF; align-self: stretch; margin: 0 16px; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-enter-from { opacity: 0; transform: translateX(20px); }
.fade-leave-to { opacity: 0; transform: translateX(-20px); }
</style>