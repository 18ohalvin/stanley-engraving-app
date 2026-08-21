import { createRouter, createWebHistory } from 'vue-router';
import LandingView from '../views/LandingView.vue';
import Step1View from '../views/Step1View.vue';
import Step2View from '../views/Step2View.vue';
import Step3View from '../views/Step3View.vue';
import Step4View from '../views/Step4View.vue';
import Step5View from '../views/Step5View.vue';
import QueueTicketView from '../views/QueueTicketView.vue';
import EngraverDashboardView from '../views/EngraverDashboardView.vue';
import CustomerDashboardView from '../views/CustomerDashboardView.vue';
import SuperAdminDashboardView from '../views/SuperAdminDashboardView.vue';
import StoreListView from '../views/StoreListView.vue';
import SettingsView from '../views/SettingsView.vue';
import LoginView from '../views/LoginView.vue';

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
    meta: { fullWidth: true }
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
    path: '/settings',
    alias: ['/admin/settings', '/setting'],
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
router.beforeEach(async (to, from, next) => {
  const isAuthenticated = typeof localStorage !== 'undefined' && localStorage.getItem('stanley_staff_authenticated') === 'true';
  const role = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_role') : null;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;

  // Protect staff and admin pages
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }

    // Verify session token with Express backend if token exists
    if (token) {
      try {
        const res = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          // Token invalid or expired
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('stanley_staff_authenticated');
            localStorage.removeItem('stanley_staff_token');
            localStorage.removeItem('stanley_user_role');
            localStorage.removeItem('stanley_is_developer');
          }
          return next({ path: '/login', query: { redirect: to.fullPath } });
        }
      } catch (e) {
        // Network offline fallback permits local stored session
      }
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
