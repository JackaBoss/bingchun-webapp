import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Import views
import LoginView from '@/views/LoginView.vue'
import MenuView from '@/views/MenuView.vue'
import CartView from '@/views/CartView.vue'
import OrdersView from '@/views/OrdersView.vue'
import OrderDetailView from '@/views/OrderDetailView.vue'
import ProfileView from '@/views/ProfileView.vue'
import ForceLogoutView from '@/views/ForceLogoutView.vue'  // ADD THIS

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/force-logout',  // ADD THIS ROUTE
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
    path: '/cart',
    name: 'Cart',
    component: CartView,
    meta: { requiresAuth: true }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: OrdersView,
    meta: { requiresAuth: true }
  },
  {
    path: '/orders/:id',
    name: 'OrderDetail',
    component: OrderDetailView,
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
    redirect: '/menu'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Guard to check authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth

  // If route requires auth and user not authenticated
  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  // If user authenticated but trying to go to login
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/menu')
    return
  }

  next()
})

export default router

// FUNCTION TO TRIGGER FORCE LOGOUT FROM ANYWHERE
export const triggerForceLogout = (router) => {
  const authStore = useAuthStore()
  authStore.forceLogout()
  router.push('/force-logout')
}