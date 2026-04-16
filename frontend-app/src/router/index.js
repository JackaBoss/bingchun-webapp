import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useOutletStore } from '@/stores/outlet'

const routes = [
  { path: '/login',       name: 'Login',       component: () => import('@/views/LoginView.vue'),       meta: { public: true } },
  { path: '/select-store',name: 'SelectStore', component: () => import('@/views/StoreSelectView.vue'), meta: { requiresAuth: true } },
  { path: '/',            name: 'Menu',        component: () => import('@/views/MenuView.vue'),         meta: { requiresAuth: true, requiresOutlet: true } },
  { path: '/cart',        name: 'Cart',        component: () => import('@/views/CartView.vue'),         meta: { requiresAuth: true, requiresOutlet: true } },
  { path: '/orders',      name: 'Orders',      component: () => import('@/views/OrdersView.vue'),       meta: { requiresAuth: true, requiresOutlet: true } },
  { path: '/orders/:id',  name: 'OrderDetail', component: () => import('@/views/OrderDetailView.vue'), meta: { requiresAuth: true, requiresOutlet: true } },
  { path: '/profile',     name: 'Profile',     component: () => import('@/views/ProfileView.vue'),      meta: { requiresAuth: true, requiresOutlet: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth   = useAuthStore()
  const outlet = useOutletStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn)       return { name: 'Login' }
  if (to.meta.public && auth.isLoggedIn)              return outlet.hasSelected ? { name: 'Menu' } : { name: 'SelectStore' }
  if (to.meta.requiresOutlet && !outlet.hasSelected)  return { name: 'SelectStore' }
})

export default router