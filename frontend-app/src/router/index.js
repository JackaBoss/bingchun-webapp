import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

import LoginView      from '@/views/LoginView.vue'
import MenuView       from '@/views/MenuView.vue'
import ProfileView    from '@/views/ProfileView.vue'
import ForceLogoutView from '@/views/ForceLogoutView.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/force-logout',
    name: 'ForceLogout',
    component: ForceLogoutView,
    meta: { requiresAuth: false }
  },
  {
    path: '/menu',
    name: 'Menu',
    component: MenuView,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView,
    meta: { requiresAuth: true }
  },
  {
    path: '/',
    redirect: '/profile'
  },
  // Catch-all: send unknown routes to profile (or login if unauthenticated)
  {
    path: '/:pathMatch(.*)*',
    redirect: '/profile'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next('/login')
    return
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    next('/profile')
    return
  }

  next()
})

export default router

export const triggerForceLogout = (router) => {
  const auth = useAuthStore()
  auth.forceLogout()
  router.push('/force-logout')
}