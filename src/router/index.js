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
    name: 'engraver-dashboard',
    component: EngraverDashboardView,
    meta: { fullWidth: true }
  },
  {
    path: '/dashboard',
    alias: '/customers',
    name: 'customer-dashboard',
    component: CustomerDashboardView,
    meta: { fullWidth: true }
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

export default router;
