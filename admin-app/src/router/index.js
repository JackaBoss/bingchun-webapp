import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },

  // Manager only
  { path: '/', name: 'Dashboard', component: () => import('@/views/DashboardView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/members', name: 'Members', component: () => import('@/views/MembersView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/members/:id', name: 'MemberHistory', component: () => import('@/views/MemberHistoryView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/members/:id/edit', name: 'MemberEdit', component: () => import('@/views/MemberEditView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/vouchers', name: 'Vouchers', component: () => import('@/views/VouchersView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/reports', name: 'SalesReport', component: () => import('@/views/SalesReportView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/staff', name: 'Staff', component: () => import('@/views/StaffView.vue'), meta: { requiresAuth: true, requiresManager: true } },
  { path: '/outlets', name: 'Outlets', component: () => import('@/views/OutletsView.vue'), meta: { requiresAuth: true, requiresManager: true } },

  // Staff + Manager
  { path: '/orders', name: 'Orders', component: () => import('@/views/OrdersView.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:id', name: 'OrderDetail', component: () => import('@/views/OrderDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/menu', name: 'Menu', component: () => import('@/views/MenuView.vue'), meta: { requiresAuth: true } },
  { path: '/counter', name: 'Counter', component: () => import('@/views/CounterView.vue'), meta: { requiresAuth: true } },
  { path: '/walkin-sales', name: 'WalkinSales', component: () => import('@/views/WalkinSalesView.vue'), meta: { requiresAuth: true, requiresManager: true } },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return { name: 'Login' }
  if (to.meta.requiresManager && !auth.isManager) return { name: 'Orders' }
  if (to.meta.public && auth.isLoggedIn) return auth.isManager ? { name: 'Dashboard' } : { name: 'Orders' }
})

export default router