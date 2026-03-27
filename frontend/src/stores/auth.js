import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user         = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const accessToken  = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)

  // Getters
  const isLoggedIn = computed(() => !!user.value)
  const points     = computed(() => user.value?.points ?? 0)
  const tier       = computed(() => user.value?.tier ?? 'bronze')

  // Actions
  function _saveSession(data) {
    user.value         = data.user
    accessToken.value  = data.accessToken
    refreshToken.value = data.refreshToken
    localStorage.setItem('user',         JSON.stringify(data.user))
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
  }

  async function login(phone, password) {
    const data = await api.post('/auth/login', { phone, password })
    _saveSession(data)
    return data
  }

  async function register(phone, name, password, email) {
    const data = await api.post('/auth/register', { phone, name, password, email })
    _saveSession(data)
    return data
  }

  async function logout() {
    try {
      await api.post('/auth/logout', { refreshToken: refreshToken.value })
    } catch {}
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async function refreshMe() {
    const data = await api.get('/auth/me')
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  return { user, accessToken, refreshToken, isLoggedIn, points, tier,
           login, register, logout, refreshMe }
})
