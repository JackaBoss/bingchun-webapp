<template>
  <div class="auth-page">
    <div class="auth-logo">
      <img src="/logo.png" alt="Bing Chun" class="logo-img" />
      <h1>冰纯茶饮</h1>
      <p>Bing Chun Cha Yin</p>
    </div>

    <!-- Toggle tabs — hidden during OTP step -->
    <div class="tab-row" v-if="mode !== 'otp'">
      <button :class="['tab', { active: mode === 'login' }]"    @click="mode = 'login'">Login</button>
      <button :class="['tab', { active: mode === 'register' }]" @click="mode = 'register'">Register</button>
    </div>

    <!-- Login form -->
    <form v-if="mode === 'login'" class="auth-form" @submit.prevent="doLogin">
      <div class="field">
        <label>Phone number</label>
        <input v-model="phone" type="tel" placeholder="01X-XXXXXXX" required autocomplete="tel" />
      </div>
      <div class="field">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="••••••••" required autocomplete="current-password" />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Login' }}
      </button>
    </form>

    <!-- Register form -->
    <form v-else-if="mode === 'register'" class="auth-form" @submit.prevent="doRegister">
      <div class="field">
        <label>Full name</label>
        <input v-model="name" type="text" placeholder="Your name" required />
      </div>
      <div class="field">
        <label>Phone number</label>
        <input v-model="phone" type="tel" placeholder="01X-XXXXXXX" required autocomplete="tel" />
      </div>
      <div class="field">
        <label>Email <span style="color:#e53e3e">*</span></label>
        <input v-model="email" type="email" placeholder="you@email.com" required autocomplete="email" />
        <span class="field-hint">A verification code will be sent to this email.</span>
      </div>
      <div class="field">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="Min 8 characters" required minlength="8" autocomplete="new-password" />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Sending code…' : 'Continue' }}
      </button>
    </form>

    <!-- OTP verification -->
    <div v-else-if="mode === 'otp'" class="auth-form">
      <div class="otp-header">
        <div class="otp-icon">📧</div>
        <h2>Check your email</h2>
        <p>We sent a 6-digit code to <strong>{{ emailHint }}</strong></p>
      </div>
      <div class="field">
        <label>Verification code</label>
        <input v-model="otp" type="text" inputmode="numeric" pattern="[0-9]*"
          placeholder="000000" maxlength="6" class="otp-input"
          @keyup.enter="doVerify" autofocus />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button class="btn btn-primary" @click="doVerify" :disabled="loading || otp.length < 6">
        {{ loading ? 'Verifying…' : 'Verify & Create Account' }}
      </button>
      <div class="resend-row">
        <span>Didn't receive it?</span>
        <button class="btn-link" :disabled="resendCooldown > 0" @click="doResend">
          {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code' }}
        </button>
      </div>
      <button class="btn-link back-link" @click="mode = 'register'">← Back</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const auth   = useAuthStore()

const mode     = ref('login')
const phone    = ref('')
const password = ref('')
const name     = ref('')
const email    = ref('')
const otp      = ref('')
const error    = ref('')
const loading  = ref(false)
const emailHint    = ref('')
const resendCooldown = ref(0)
let cooldownTimer = null

function startCooldown() {
  resendCooldown.value = 60
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(cooldownTimer))

async function doLogin() {
  error.value = ''; loading.value = true
  try {
    await auth.login(phone.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.error || 'Login failed. Please try again.'
  } finally { loading.value = false }
}

async function doRegister() {
  error.value = ''; loading.value = true
  try {
    const res = await api.post('/auth/register', {
      phone: phone.value, name: name.value,
      password: password.value, email: email.value,
    })
    emailHint.value = res.email_hint
    otp.value = ''
    mode.value = 'otp'
    startCooldown()
  } catch (err) {
    error.value = err.response?.data?.error || err.error || 'Registration failed.'
  } finally { loading.value = false }
}

async function doVerify() {
  if (otp.value.length < 6) return
  error.value = ''; loading.value = true
  try {
    const data = await api.post('/auth/verify-otp', { phone: phone.value, otp: otp.value })
    auth._saveSession(data)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || 'Invalid code. Please try again.'
  } finally { loading.value = false }
}

async function doResend() {
  if (resendCooldown.value > 0) return
  try {
    await api.post('/auth/resend-otp', { phone: phone.value })
    startCooldown()
    error.value = ''
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to resend code.'
  }
}
</script>

<style scoped>
.auth-page   { min-height: 100vh; padding: 40px 24px 32px; display: flex; flex-direction: column; background: var(--white); }
.auth-logo   { text-align: center; margin-bottom: 32px; }
.logo-img    { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
.auth-logo h1 { font-size: 22px; font-weight: 700; color: var(--blue); }
.auth-logo p  { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.tab-row     { display: flex; background: var(--bg); border-radius: var(--radius-sm); padding: 4px; margin-bottom: 28px; }
.tab         { flex: 1; padding: 10px; border: none; background: transparent; border-radius: 6px; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; }
.tab.active  { background: var(--white); color: var(--blue); box-shadow: var(--shadow); }
.auth-form   { display: flex; flex-direction: column; gap: 16px; }
.field       { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
.field-hint  { font-size: 12px; color: var(--text-muted); }
.error-msg   { color: #e53e3e; font-size: 13px; padding: 8px 12px; background: #fff5f5; border-radius: var(--radius-sm); border-left: 3px solid #e53e3e; }
.otp-header  { text-align: center; margin-bottom: 8px; }
.otp-icon    { font-size: 48px; margin-bottom: 8px; }
.otp-header h2 { font-size: 20px; font-weight: 700; }
.otp-header p  { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
.otp-input   { font-size: 28px; font-weight: 800; letter-spacing: 10px; text-align: center; padding: 14px; }
.resend-row  { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: var(--text-muted); }
.btn-link    { background: none; border: none; color: var(--blue); font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; }
.btn-link:disabled { color: var(--text-muted); cursor: default; }
.back-link   { text-align: center; color: var(--text-muted); font-weight: 400; }
</style>