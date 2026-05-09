import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const ADMIN_ROLES = ['staff', 'store_manager']

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('admin_user') || 'null'))
  const token = ref(localStorage.getItem('admin_token') || null)

  const isLoggedIn = computed(() => !!user.value && ADMIN_ROLES.includes(user.value.role))
  const isManager = computed(() => user.value?.role === 'store_manager')

  const roleLabel = computed(() => {
    if (user.value?.role === 'store_manager') return 'Store Manager'
    if (user.value?.role === 'staff') return 'Staff'
    return ''
  })

  function setSession(data) {
    user.value = data.user
    token.value = data.accessToken
    localStorage.setItem('admin_user', JSON.stringify(data.user))
    localStorage.setItem('admin_token', data.accessToken)
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('admin_user')
    localStorage.removeItem('admin_token')
  }

  return { user, token, isLoggedIn, isManager, roleLabel, setSession, logout }
})