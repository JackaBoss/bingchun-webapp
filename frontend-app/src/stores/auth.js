import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken'))
  const refreshToken = ref(localStorage.getItem('refreshToken'))
  const isAuthenticated = ref(!!accessToken.value)

  const setTokens = (access, refresh) => {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  const setUser = (userData) => {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    // Clear everything
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    isAuthenticated.value = false

    // Clear localStorage completely
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    localStorage.removeItem('cart')
    localStorage.removeItem('outlet')

    // Clear axios headers
    if (axios.defaults.headers.common['Authorization']) {
      delete axios.defaults.headers.common['Authorization']
    }
  }

  const forceLogout = () => {
    // Same as logout but with message
    logout()
    // Message will be shown by router/component
  }

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    setTokens,
    setUser,
    logout,
    forceLogout
  }
})