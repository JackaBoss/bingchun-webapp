import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const user         = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const accessToken  = ref(localStorage.getItem('accessToken') || null)
  const refreshToken = ref(localStorage.getItem('refreshToken') || null)

  const isLoggedIn      = computed(() => !!user.value)
  const isAuthenticated = isLoggedIn          // alias for compatibility
  const points          = computed(() => user.value?.points ?? 0)
  const tier            = computed(() => user.value?.tier ?? 'bronze')

  function _saveSession(data) {
    user.value         = data.user
    accessToken.value  = data.accessToken
    refreshToken.value = data.refreshToken
    localStorage.setItem('user',         JSON.stringify(data.user))
    localStorage.setItem('accessToken',  data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
  }

  // Compatibility helpers used by older components
  function setTokens(access, refresh) {
    accessToken.value  = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken',  access)
    localStorage.setItem('refreshToken', refresh)
  }

  function setUser(userData) {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
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
    _clearLocal()
  }

  function forceLogout() {
    _clearLocal()
  }

  function _clearLocal() {
    user.value         = null
    accessToken.value  = null
    refreshToken.value = null
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('cart')
    localStorage.removeItem('outlet_id')
  }

  async function refreshMe() {
    const data = await api.get('/auth/me')
    user.value = data
    localStorage.setItem('user', JSON.stringify(data))
  }

  return {
    user, accessToken, refreshToken,
    isLoggedIn, isAuthenticated, points, tier,
    login, register, logout, forceLogout, refreshMe,
    _saveSession, setTokens, setUser,
  }
})