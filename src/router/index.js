import { createRouter, createWebHistory } from 'vue-router';
const LoginView = () => import('../views/LoginView.vue');
const LandingView = () => import('../views/LandingView.vue');
const Step1View = () => import('../views/Step1View.vue');
const Step2View = () => import('../views/Step2View.vue');
const Step3View = () => import('../views/Step3View.vue');
const Step4View = () => import('../views/Step4View.vue');
const Step5View = () => import('../views/Step5View.vue');
const QueueTicketView = () => import('../views/QueueTicketView.vue');
const EngraverDashboardView = () => import('../views/EngraverDashboardView.vue');
const CustomerDashboardView = () => import('../views/CustomerDashboardView.vue');
const SuperAdminDashboardView = () => import('../views/SuperAdminDashboardView.vue');
const StoreListView = () => import('../views/StoreListView.vue');
const SettingsView = () => import('../views/SettingsView.vue');

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { fullWidth: true }
  },
  {
    path: '/',
    name: 'landing',
    component: LandingView,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId',
    name: 'engrave-store',
    component: LandingView,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId/step-1',
    name: 'engrave-store-step-1',
    component: Step1View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId/step-2',
    name: 'engrave-store-step-2',
    component: Step2View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId/step-3',
    name: 'engrave-store-step-3',
    component: Step3View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId/step-4',
    name: 'engrave-store-step-4',
    component: Step4View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engrave/:storeId/step-5',
    name: 'engrave-store-step-5',
    component: Step5View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/step-1',
    name: 'step-1',
    component: Step1View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/step-2',
    name: 'step-2',
    component: Step2View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/step-3',
    name: 'step-3',
    component: Step3View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/step-4',
    name: 'step-4',
    component: Step4View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/step-5',
    name: 'step-5',
    component: Step5View,
    meta: { isMobileFlow: true }
  },
  {
    path: '/queue/:orderId',
    alias: ['/queue/:storeId/:orderId', '/ticket/:orderId', '/ticket/:storeId/:orderId', '/q/:orderId', '/q/:storeId/:orderId'],
    name: 'queue-ticket',
    component: QueueTicketView,
    meta: { isMobileFlow: true }
  },
  {
    path: '/engraver',
    alias: ['/engraver/:storeId', '/engraver-dashboard'],
    name: 'engraver-dashboard',
    component: EngraverDashboardView,
    meta: { fullWidth: true, requiresAuth: true }
  },
  {
    path: '/dashboard',
    alias: ['/dashboard/:storeId', '/customers'],
    name: 'customer-dashboard',
    component: CustomerDashboardView,
    meta: { fullWidth: true, requiresAuth: true }
  },
  {
    path: '/admin',
    alias: ['/main-dashboard', '/super-admin', '/analytics'],
    name: 'super-admin-dashboard',
    component: SuperAdminDashboardView,
    meta: { fullWidth: true, requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/stores',
    alias: ['/store-list', '/admin/stores', '/admin/store-list'],
    name: 'store-list',
    component: StoreListView,
    meta: { fullWidth: true, requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/settings/:tab?',
    alias: ['/settings', '/setting', '/setting/:tab?', '/admin/settings', '/admin/settings/:tab?'],
    name: 'settings',
    component: SettingsView,
    meta: { fullWidth: true, requiresAuth: true, requiresSuperAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

// Navigation Guard: Enforce PIN Authentication & Role Access
router.beforeEach((to, from, next) => {
  const isAuthenticated = typeof localStorage !== 'undefined' && localStorage.getItem('stanley_staff_authenticated') === 'true';
  const role = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_role') : null;

  // Protect staff and admin pages
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }

    // Enforce Super Admin role on admin management pages
    if (to.meta.requiresSuperAdmin && role !== 'super_admin') {
      return next({ path: '/engraver' });
    }
  }

  // Redirect logged in staff away from /login page to their default dashboard
  if (to.path === '/login' && isAuthenticated) {
    if (role === 'super_admin') {
      return next('/admin');
    }
    return next('/engraver');
  }

  next();
});

export default router;
