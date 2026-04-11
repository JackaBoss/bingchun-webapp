<template>
  <div class="counter-wrap">
    <div class="counter-card">
      <h1 class="title">🧋 Credit Points</h1>

      <!-- STEP 1: Phone lookup -->
      <div v-if="step === 'lookup'">
        <label class="field-label">Member Phone Number</label>
        <div class="input-row">
          <input
            v-model="phone"
            type="tel"
            placeholder="01X-XXXXXXX"
            class="big-input"
            @keyup.enter="lookup"
            autofocus
          />
          <button class="btn-primary" @click="lookup" :disabled="loading">
            {{ loading ? '...' : 'Search' }}
          </button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </div>

      <!-- STEP 2: Member found, enter amount -->
      <div v-if="step === 'credit'">
        <div class="member-card">
          <div class="member-name">{{ member.name }}</div>
          <div class="member-meta">{{ member.phone }} · {{ member.tier }}</div>
          <div class="member-pts">{{ member.current_points }} pts</div>
        </div>

        <label class="field-label">Bill Amount (RM)</label>
        <input
          v-model="billAmount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          class="big-input"
          @keyup.enter="credit"
        />

        <div class="earn-preview" v-if="billAmount > 0">
          + {{ Math.floor(billAmount) }} pts will be credited
        </div>

        <div class="btn-row">
          <button class="btn-secondary" @click="reset">← Back</button>
          <button class="btn-primary" @click="credit" :disabled="loading || !billAmount">
            {{ loading ? 'Crediting...' : 'Credit Points' }}
          </button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </div>

      <!-- STEP 3: Success -->
      <div v-if="step === 'done'" class="success-card">
        <div class="success-icon">✅</div>
        <div class="success-name">{{ result.member.name }}</div>
        <div class="success-pts">+{{ result.points_earned }} pts</div>
        <div class="success-balance">New balance: {{ result.new_balance }} pts</div>
        <button class="btn-primary wide" @click="reset">Next Customer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/services/api'

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
.counter-wrap {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.counter-card {
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 28px;
  text-align: center;
  color: #1a1a1a;
}
.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
}
.input-row {
  display: flex;
  gap: 10px;
}
.big-input {
  flex: 1;
  width: 100%;
  padding: 16px;
  font-size: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  outline: none;
  transition: border 0.2s;
}
.big-input:focus { border-color: #4CAF50; }
.btn-primary {
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover:not(:disabled) { background: #388E3C; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary.wide { width: 100%; margin-top: 16px; padding: 20px; font-size: 18px; }
.btn-secondary {
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 10px;
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
.btn-row { display: flex; gap: 10px; margin-top: 20px; }
.member-card {
  background: #f9f9f9;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: center;
}
.member-name { font-size: 22px; font-weight: 700; }
.member-meta { font-size: 14px; color: #888; margin-top: 4px; }
.member-pts { font-size: 28px; font-weight: 800; color: #4CAF50; margin-top: 8px; }
.earn-preview {
  margin-top: 12px;
  padding: 12px;
  background: #E8F5E9;
  border-radius: 8px;
  color: #2E7D32;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}
.success-card { text-align: center; padding: 20px 0; }
.success-icon { font-size: 64px; margin-bottom: 16px; }
.success-name { font-size: 24px; font-weight: 700; }
.success-pts { font-size: 48px; font-weight: 800; color: #4CAF50; margin: 8px 0; }
.success-balance { font-size: 18px; color: #666; }
.error-msg { color: #e53935; font-size: 14px; margin-top: 10px; }
</style>