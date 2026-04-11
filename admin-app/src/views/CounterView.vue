<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Walk-in Points</h1>
      <p class="page-sub">Credit points for in-store purchases</p>
    </div>

    <div class="counter-wrap">
      <div class="card counter-card">

        <!-- Step 1: Lookup -->
        <template v-if="step === 'lookup'">
          <p class="step-label">STEP 1 OF 2</p>
          <h2 class="step-title">Find Member</h2>
          <p class="step-sub">Enter the customer's phone number.</p>
          <div class="field">
            <label class="field-label">Phone Number</label>
            <div class="input-row">
              <input
                v-model="phone"
                type="tel"
                placeholder="e.g. 0123456789"
                class="input"
                style="flex:1;font-size:16px;padding:12px"
                @keyup.enter="lookup"
                autofocus
              />
              <button class="btn btn-primary" @click="lookup" :disabled="loading || !phone.trim()" style="padding:12px 24px">
                {{ loading ? '...' : 'Search' }}
              </button>
            </div>
          </div>
          <div v-if="error" class="error-msg">{{ error }}</div>
        </template>

        <!-- Step 2: Credit -->
        <template v-else-if="step === 'credit'">
          <p class="step-label">STEP 2 OF 2</p>
          <h2 class="step-title">Credit Points</h2>

          <div class="member-pill">
            <div class="m-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
            <div class="m-info">
              <div class="m-name">{{ member.name }}</div>
              <div class="m-phone">{{ member.phone }}</div>
            </div>
            <div class="m-pts">
              <div class="pts-num">{{ member.current_points }}</div>
              <div class="pts-lbl">pts</div>
            </div>
          </div>

          <div class="field" style="margin-top:24px">
            <label class="field-label">Bill Amount (RM)</label>
            <input
              v-model="billAmount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              class="input"
              style="font-size:24px;font-weight:700;padding:14px"
              @keyup.enter="credit"
            />
          </div>

          <div v-if="billAmount > 0" class="earn-preview">
            ⭐ Customer will earn <strong>{{ Math.floor(billAmount) }} pts</strong>
          </div>

          <div v-if="error" class="error-msg">{{ error }}</div>

          <div class="btn-row">
            <button class="btn btn-ghost" @click="reset">← Back</button>
            <button class="btn btn-primary" @click="credit" :disabled="loading || !billAmount || billAmount <= 0" style="flex:1;padding:12px">
              {{ loading ? 'Crediting...' : 'Credit Points' }}
            </button>
          </div>
        </template>

        <!-- Step 3: Success -->
        <template v-else>
          <div class="success">
            <div class="success-ring">✓</div>
            <h2>Points Credited!</h2>
            <p class="success-name">{{ result.member.name }}</p>
            <div class="success-stats">
              <div class="ss"><div class="ss-num green">+{{ result.points_earned }}</div><div class="ss-lbl">Earned</div></div>
              <div class="ss-div"></div>
              <div class="ss"><div class="ss-num">{{ result.new_balance }}</div><div class="ss-lbl">New Balance</div></div>
            </div>
            <button class="btn btn-primary" @click="reset" style="width:100%;padding:14px;margin-top:8px">Next Customer →</button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api'

const step       = ref('lookup')
const phone      = ref('')
const billAmount = ref('')
const member     = ref(null)
const result     = ref(null)
const loading    = ref(false)
const error      = ref('')

async function lookup() {
  if (!phone.value.trim()) return
  error.value = ''
  loading.value = true
  try {
    member.value = await api.get('/admin/member-lookup', { phone: phone.value.trim() })
    step.value = 'credit'
  } catch (e) {
    error.value = e.response?.data?.error || 'Member not found'
  } finally { loading.value = false }
}

async function credit() {
  if (!billAmount.value || billAmount.value <= 0) return
  error.value = ''
  loading.value = true
  try {
    result.value = await api.post('/admin/credit-points', {
      phone: phone.value.trim(),
      bill_amount: parseFloat(billAmount.value),
    })
    step.value = 'done'
  } catch (e) {
    error.value = e.response?.data?.error || 'Failed to credit points'
  } finally { loading.value = false }
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
.counter-wrap  { display: flex; justify-content: center; }
.counter-card  { width: 100%; max-width: 520px; }
.step-label    { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: var(--blue); margin-bottom: 6px; }
.step-title    { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.step-sub      { font-size: 14px; color: var(--muted); margin-bottom: 24px; }
.field         { margin-bottom: 14px; }
.field-label   { display: block; font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 7px; }
.input-row     { display: flex; gap: 10px; }
.member-pill   { display: flex; align-items: center; gap: 14px; background: #f7f9ff; border: 1.5px solid #e0e8ff; border-radius: 12px; padding: 16px; }
.m-avatar      { width: 42px; height: 42px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.m-info        { flex: 1; }
.m-name        { font-size: 16px; font-weight: 700; }
.m-phone       { font-size: 13px; color: var(--muted); margin-top: 2px; }
.m-pts         { text-align: center; }
.pts-num       { font-size: 24px; font-weight: 800; color: var(--blue); line-height: 1; }
.pts-lbl       { font-size: 11px; color: var(--muted); font-weight: 600; }
.earn-preview  { background: #f0f7ff; border: 1.5px solid #c8deff; border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #2d5db5; margin-top: 12px; }
.btn-row       { display: flex; gap: 10px; margin-top: 20px; }
.error-msg     { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; margin-top: 12px; }
.success       { text-align: center; padding: 16px 0; }
.success-ring  { width: 80px; height: 80px; border-radius: 50%; background: #d1fae5; color: #065f46; font-size: 36px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.success h2    { font-size: 24px; font-weight: 800; }
.success-name  { font-size: 15px; color: var(--muted); margin: 4px 0 24px; }
.success-stats { display: flex; align-items: center; background: #f7f9ff; border-radius: 12px; padding: 18px; margin-bottom: 8px; }
.ss            { flex: 1; }
.ss-num        { font-size: 32px; font-weight: 800; }
.ss-num.green  { color: var(--green); }
.ss-lbl        { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px; }
.ss-div        { width: 1px; background: #e0e8ff; align-self: stretch; margin: 0 16px; }
</style>
