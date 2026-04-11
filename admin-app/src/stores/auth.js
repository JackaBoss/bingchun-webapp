import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user  = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))
  const token = ref(localStorage.getItem('admin_token') || null)

  const isLoggedIn = computed(() => !!user.value && user.value.role === 'admin')

  function setSession(data) {
    user.value  = data.user
    token.value = data.accessToken
    localStorage.setItem('admin_user',  JSON.stringify(data.user))
    localStorage.setItem('admin_token', data.accessToken)
  }

  function logout() {
    user.value  = null
    token.value = null
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_token')
  }

  return { user, token, isLoggedIn, setSession, logout }
})
