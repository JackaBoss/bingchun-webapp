<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <span class="login-icon">🧋</span>
        <h1>Bing Chun Malaysia</h1>
        <p>Admin Panel</p>
      </div>
      <div class="login-form">
        <div class="field">
          <label>Phone Number</label>
          <input v-model="phone" type="tel" placeholder="01X-XXXXXXX" class="input" @keyup.enter="login" />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="••••••••" class="input" @keyup.enter="login" />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button class="btn btn-primary login-btn" @click="login" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const auth = useAuthStore()

const phone = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const ADMIN_ROLES = ['staff', 'store_manager']

async function login() {
  if (!phone.value || !password.value) return
  error.value = ''
  loading.value = true
  try {
    const data = await api.post('/auth/login', { phone: phone.value, password: password.value })
    if (!ADMIN_ROLES.includes(data.user.role)) {
      error.value = 'Access denied. Staff accounts only.'
      return
    }
    auth.setSession(data)
    // Managers go to dashboard, staff go to orders
    router.push(data.user.role === 'store_manager' ? '/' : '/orders')
  } catch (e) {
    error.value = e.response?.data?.error || 'Invalid credentials'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page { flex: 1; min-height: 100vh; width: 100%; background: #1a1a2e; display: flex; align-items: center; justify-content: center; padding: 24px; }
.login-card { background: #fff; border-radius: 16px; padding: 40px 36px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.login-brand { text-align: center; margin-bottom: 32px; }
.login-icon { font-size: 48px; display: block; margin-bottom: 10px; }
.login-brand h1 { font-size: 22px; font-weight: 800; color: var(--text); }
.login-brand p { font-size: 13px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
.login-form { display: flex; flex-direction: column; gap: 16px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.login-btn { width: 100%; padding: 12px; font-size: 15px; margin-top: 4px; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.error-msg { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 7px; font-size: 13px; }
</style>