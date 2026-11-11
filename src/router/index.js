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
const StoreNotFoundView = () => import('../views/StoreNotFoundView.vue');
import { loadStoreDirectory, findDirectoryStore, hasStoreDirectory } from '../utils/storeResolver.js';
import { useEngravingStore } from '../store/engravingStore.js';

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
    path: '/store-not-found',
    name: 'store-not-found',
    component: StoreNotFoundView,
    meta: { isMobileFlow: true }
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
// Customer form routes without a store slug -> their /engrave/:storeId equivalent
const LEGACY_FORM_ROUTES = {
  'landing': 'engrave-store',
  'step-1': 'engrave-store-step-1',
  'step-2': 'engrave-store-step-2',
  'step-3': 'engrave-store-step-3',
  'step-4': 'engrave-store-step-4',
  'step-5': 'engrave-store-step-5'
};

// Staff pages that are scoped to one store via /<page>/:storeId
const STORE_SCOPED_STAFF_PAGES = {
  'engraver-dashboard': '/engraver',
  'customer-dashboard': '/dashboard'
};

/** Resolve a slug to its store CODE using the live directory (null if unknown). */
async function resolveStoreCode(slug) {
  if (!slug) return null;
  await loadStoreDirectory();
  const store = findDirectoryStore(slug);
  if (store) return store.code;
  // Directory unavailable (offline / API down): don't block, keep the slug as-is
  return hasStoreDirectory() ? null : String(slug);
}

router.beforeEach(async (to) => {
  const isAuthenticated = typeof localStorage !== 'undefined' && localStorage.getItem('stanley_staff_authenticated') === 'true';
  const role = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_role') : null;

  // Protect staff and admin pages
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }

    // Enforce Super Admin role on admin management pages
    if (to.meta.requiresSuperAdmin && role !== 'super_admin') {
      return { path: '/engraver' };
    }
  }

  // Redirect logged in staff away from /login page to their default dashboard
  if (to.path === '/login' && isAuthenticated) {
    return role === 'super_admin' ? '/admin' : '/engraver';
  }

  // 1. Customer form: the slug must be a real store, written as its CODE
  if (typeof to.name === 'string' && to.name.startsWith('engrave-store')) {
    const slug = String(to.params.storeId || '');
    const code = await resolveStoreCode(slug);
    if (!code) {
      return { name: 'store-not-found', query: { store: slug } };
    }
    if (code !== slug) {
      return { name: to.name, params: { ...to.params, storeId: code }, query: to.query, hash: to.hash, replace: true };
    }
    return true;
  }

  // 2. Form opened without a store slug: continue in the store already chosen, else ask for the QR
  if (LEGACY_FORM_ROUTES[to.name]) {
    let chosen = '';
    try { chosen = useEngravingStore().selectedStoreId; } catch (e) {}
    const code = chosen ? await resolveStoreCode(chosen) : null;
    if (code) {
      return { name: LEGACY_FORM_ROUTES[to.name], params: { storeId: code }, query: to.query, replace: true };
    }
    return { name: 'store-not-found' };
  }

  // 3. Store staff only ever work in their own store: /engraver/<own code>, /dashboard/<own code>
  const staffBase = STORE_SCOPED_STAFF_PAGES[to.name];
  if (staffBase && isAuthenticated) {
    const requested = to.params.storeId ? String(to.params.storeId) : '';
    if (role !== 'super_admin') {
      const ownRaw = localStorage.getItem('stanley_user_store') || '';
      const ownCode = (await resolveStoreCode(ownRaw)) || ownRaw;
      if (ownCode && ownCode !== ownRaw) {
        try { localStorage.setItem('stanley_user_store', ownCode); } catch (e) {}
      }
      if (ownCode && requested !== ownCode) {
        return { path: `${staffBase}/${encodeURIComponent(ownCode)}`, query: to.query, replace: true };
      }
    } else if (requested) {
      const code = await resolveStoreCode(requested);
      if (code && code !== requested) {
        return { path: `${staffBase}/${encodeURIComponent(code)}`, query: to.query, replace: true };
      }
    }
  }

  return true;
});

export default router;
