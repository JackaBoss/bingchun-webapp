<template>
  <div class="auth-page">
    <div class="auth-logo">
      <img src="/logo.png" alt="Bing Chun" class="logo-img" />
      <h1>冰纯茶饮</h1>
      <p>Bing Chun Cha Yin</p>
    </div>

    <!-- Toggle tabs -->
    <div class="tab-row">
      <button :class="['tab', { active: mode === 'login' }]" @click="mode = 'login'">Login</button>
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
    <form v-else class="auth-form" @submit.prevent="doRegister">
      <div class="field">
        <label>Full name</label>
        <input v-model="name" type="text" placeholder="Your name" required />
      </div>
      <div class="field">
        <label>Phone number</label>
        <input v-model="phone" type="tel" placeholder="01X-XXXXXXX" required autocomplete="tel" />
      </div>
      <div class="field">
        <label>Email (optional)</label>
        <input v-model="email" type="email" placeholder="you@email.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Password</label>
        <input v-model="password" type="password" placeholder="Min 8 characters" required minlength="8" autocomplete="new-password" />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
      <button class="btn btn-primary" type="submit" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

const mode     = ref('login')
const phone    = ref('')
const password = ref('')
const name     = ref('')
const email    = ref('')
const error    = ref('')
const loading  = ref(false)

async function doLogin() {
  error.value   = ''
  loading.value = true
  try {
    await auth.login(phone.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.error || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  error.value   = ''
  loading.value = true
  try {
    await auth.register(phone.value, name.value, password.value, email.value)
    router.push('/')
  } catch (err) {
    error.value = err.error || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 40px 24px 32px;
  display: flex;
  flex-direction: column;
  background: var(--white);
}

.auth-logo {
  text-align: center;
  margin-bottom: 32px;
}
.logo-img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
.auth-logo h1 { font-size: 22px; font-weight: 700; color: var(--blue); }
.auth-logo p  { font-size: 13px; color: var(--text-muted); margin-top: 2px; }

.tab-row {
  display: flex;
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 4px;
  margin-bottom: 28px;
}
.tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all .15s;
}
.tab.active {
  background: var(--white);
  color: var(--blue);
  box-shadow: var(--shadow);
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-muted); }

.error-msg {
  color: #e53e3e;
  font-size: 13px;
  padding: 8px 12px;
  background: #fff5f5;
  border-radius: var(--radius-sm);
  border-left: 3px solid #e53e3e;
}
</style>
