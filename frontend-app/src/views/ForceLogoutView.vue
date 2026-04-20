<template>
  <div class="force-logout-container">
    <div class="logout-card">
      <div class="icon">🔐</div>
      <h1>Session Ended</h1>
      <p class="reason">Security Update: Your session has been invalidated for your protection.</p>
      <p class="message">
        We detected unusual activity on our platform and have logged out all users as a precautionary measure.
        Please log in again with your phone number.
      </p>
      <div class="countdown">
        Redirecting to login in <strong>{{ countdown }}</strong> seconds...
      </div>
      <button @click="goToLogin" class="btn-login">
        Login Now
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const countdown = ref(5)

onMounted(() => {
  // Clear auth immediately
  authStore.forceLogout()

  // Countdown timer
  const interval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(interval)
      goToLogin()
    }
  }, 1000)
})

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.force-logout-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.logout-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.icon {
  font-size: 64px;
  margin-bottom: 20px;
}

h1 {
  color: #2d3748;
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
}

.reason {
  color: #dc2626;
  font-weight: 600;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.message {
  color: #4b5563;
  line-height: 1.6;
  margin: 0 0 25px 0;
  font-size: 14px;
}

.countdown {
  background: #f3f4f6;
  padding: 15px;
  border-radius: 8px;
  color: #374151;
  margin-bottom: 25px;
  font-size: 14px;
}

.countdown strong {
  color: #667eea;
  font-weight: 700;
}

.btn-login {
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-login:active {
  transform: scale(0.98);
}

.btn-login:hover {
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}
</style>