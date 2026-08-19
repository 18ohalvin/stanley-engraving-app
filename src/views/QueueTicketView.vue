<template>
  <div class="step-page ticket-page">
    <main class="page-container">
      <div v-if="order" class="ticket-wrapper fade-in">
        
        <!-- STATE 1: DROP OFF YOUR CUP (Figma 12:900) -->
        <section v-if="order.status === 'pending_dropoff'" class="state-section">
          <div class="status-headline">
            <h1 class="headline-title">Drop off your cup.</h1>
            <p class="headline-subtitle">
              Show this code to our associate at the engraving station to get started.
            </p>
          </div>

          <div class="massive-code-display">
            <span class="code-number">#{{ order.intake_code || order.short_code }}</span>
          </div>

          <div class="notice-row multi-line">
            <img src="/src/assets/icons/info-black-circle.svg" alt="Info" class="info-circle-icon" />
            <p class="notice-text">
              We'll WhatsApp {{ maskedPhone }}.<br />
              Safe to close page. Check counter if missed.
            </p>
          </div>
        </section>

        <!-- STATE 2: IN THE QUEUE (Figma 21:1166) -->
        <section v-else-if="order.status === 'in_queue'" class="state-section">
          <div class="status-headline queue-headline-wrap">
            <h1 class="headline-title">Your Stanley is in the queue!</h1>
            <div class="massive-code-display queue-counter-display">
              <span class="code-number queue-counter">{{ queueAheadCount }} People ahead.</span>
            </div>
            <div v-if="order.system_queue_number" class="queue-ticket-badge-row">
              <span class="system-queue-pill">Queue #{{ order.system_queue_number }}</span>
            </div>
          </div>

          <div class="notice-row">
            <img src="/src/assets/icons/info-black-circle.svg" alt="Info" class="info-circle-icon" />
            <p class="notice-text">
              Need a help? Check counter or <strong>contact us</strong>.
            </p>
          </div>
        </section>

        <!-- STATE 3: ENGRAVING IN PROGRESS (Figma 28:1204) -->
        <section v-else-if="order.status === 'engraving_in_progress'" class="state-section">
          <div class="status-headline queue-headline-wrap">
            <h1 class="headline-title">We're laser-focused.</h1>
            <div class="massive-code-display active-engraving-box">
              <h2 class="code-number laser-text">
                <span>Engraving in</span>
                <span>Progress<span class="animated-dots"></span></span>
              </h2>
            </div>
            <div v-if="order.system_queue_number" class="queue-ticket-badge-row">
              <span class="system-queue-pill">Queue #{{ order.system_queue_number }}</span>
            </div>
          </div>

          <div class="notice-row">
            <img src="/src/assets/icons/info-black-circle.svg" alt="Info" class="info-circle-icon" />
            <p class="notice-text">
              Need a help? Check counter or <strong>contact us</strong>.
            </p>
          </div>
        </section>

        <!-- STATE 4: READY FOR PICKUP (Figma 28:1242) -->
        <section v-else-if="order.status === 'ready_for_pickup'" class="state-section ready-section">
          <div class="status-headline">
            <h1 class="headline-title">Your Cup is Ready.</h1>
            <p class="headline-subtitle">
              Head over to the Engraving Counter to pick up your Stanley. Show this screen to collect.
            </p>
          </div>

          <div class="massive-code-display ready-badge-box">
            <span class="code-number">#{{ order.system_queue_number || order.short_code }}</span>
          </div>

          <!-- Order List embedded directly on screen matching Figma 28:1242 -->
          <div class="ready-order-list-block">
            <h2 class="ready-order-list-title">Your Order List:</h2>
            
            <div class="ready-items-container">
              <div 
                v-for="(item, idx) in order.items" 
                :key="idx"
                class="ready-item-card"
              >
                <div class="ready-item-content">
                  <span class="ready-item-text" :class="item.fontClass">
                    {{ item.text }}
                  </span>
                  <span class="ready-item-meta">
                    {{ item.size }} {{ item.shortName || item.model }} • Position {{ item.position }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CANCELLED STATE -->
        <section v-else-if="order.status === 'cancelled'" class="state-section">
          <div class="status-headline">
            <h1 class="headline-title">Order Cancelled</h1>
            <p class="headline-subtitle">
              This engraving order has been cancelled.
            </p>
          </div>
          <CTAButton label="Start New Order" @click="startNewOrder" />
        </section>

        <!-- CUSTOMER DETAILS FOOTER BLOCK (Figma 12:900 & 21:1166 & 28:1204) -->
        <div v-if="order.status !== 'cancelled' && order.status !== 'ready_for_pickup'" class="customer-info-card">
          <div class="specs-table">
            <!-- Ticket ID shown in Queue and subsequent states -->
            <div v-if="order.status !== 'pending_dropoff'" class="spec-row">
              <span class="spec-label">Ticket ID :</span>
              <span class="spec-value">#{{ order.short_code }}</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Customer Name :</span>
              <span class="spec-value">{{ order.customer_name }}</span>
            </div>
            <div class="spec-row">
              <span class="spec-label">Booking Time :</span>
              <span class="spec-value">{{ order.booking_time }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="ticket-actions">
            <CTAButton
              variant="outline"
              label="View Order Details"
              @click="showDetailsModal = true"
            />
            <CTAButton
              v-if="order.status === 'pending_dropoff'"
              variant="outline"
              label="Cancel"
              @click="showCancelModal = true"
            />
          </div>
        </div>

      </div>

      <!-- Loading / Not found state -->
      <div v-else class="not-found-state">
        <p>Loading ticket status...</p>
      </div>
    </main>

    <!-- Floating Retail Demo Overlay Tool (Independent Overlay, outside design flow) -->
    <div class="dev-demo-overlay">
      <button 
        class="dev-toggle-pill"
        @click="showDevDemo = !showDevDemo"
        title="Toggle Retail Demo Controls"
      >
        <span>⚡ Demo Tool</span>
        <span class="pill-arrow">{{ showDevDemo ? '▼' : '▲' }}</span>
      </button>

      <transition name="fade-slide">
        <div v-if="showDevDemo" class="dev-demo-panel">
          <div class="dev-demo-header">
            <span class="dev-tag">Retail Status Switcher:</span>
            <button class="dev-close-btn" @click="showDevDemo = false">✕</button>
          </div>
          <div class="dev-btn-group">
            <button 
              v-for="s in ['pending_dropoff', 'in_queue', 'engraving_in_progress', 'ready_for_pickup']" 
              :key="s"
              class="dev-btn"
              :class="{ 'is-active': order && order.status === s }"
              @click="manuallySetStatus(s)"
            >
              {{ s.replace('_', ' ') }}
            </button>
          </div>
          <router-link to="/engraver" target="_blank" class="dev-link">
            Open iPad Dashboard ↗
          </router-link>
        </div>
      </transition>
    </div>

    <!-- Order Details Modal Drawer -->
    <OrderDetailsModal
      :isOpen="showDetailsModal"
      :order="order"
      @close="showDetailsModal = false"
    />

    <!-- Cancel Order Confirmation Modal (Figma 50:279) -->
    <CancelOrderModal
      :isOpen="showCancelModal"
      @close="showCancelModal = false"
      @confirm="handleConfirmCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CTAButton from '../components/CTAButton.vue';
import OrderDetailsModal from '../components/OrderDetailsModal.vue';
import CancelOrderModal from '../components/CancelOrderModal.vue';
import { useQueueStore } from '../store/queueStore';

const route = useRoute();
const router = useRouter();
const queueStore = useQueueStore();

const orderId = computed(() => route.params.orderId);
const fallbackOrder = ref(null);
const order = computed(() => {
  return queueStore.getOrderById(orderId.value) || fallbackOrder.value;
});
const showDetailsModal = ref(false);
const showCancelModal = ref(false);
const showDevDemo = ref(false);
let pollInterval = null;

const maskedPhone = computed(() => {
  if (!order.value || !order.value.phone) return '+62 812-77XX-XX70';
  const raw = order.value.phone.trim();
  const parts = raw.split(' ');
  if (parts.length >= 2) {
    const code = parts[0];
    const num = parts.slice(1).join('');
    if (num.length >= 6) {
      return `${code} ${num.slice(0, 3)}-XXXX-${num.slice(-3)}`;
    }
    return raw;
  } else if (raw.startsWith('+')) {
    if (raw.length >= 10) {
      return `${raw.slice(0, 6)}-XXXX-${raw.slice(-3)}`;
    }
  }
  return raw;
});

const queueAheadCount = computed(() => {
  if (!order.value) return 1;
  // All active orders in the queue sorted strictly by FIFO queue order
  const activeOrders = queueStore.orders
    .filter(o => o.status === 'in_queue' || o.status === 'engraving_in_progress')
    .slice()
    .sort((a, b) => {
      const timeA = new Date(a.intake_at || a.created_at || 0).getTime();
      const timeB = new Date(b.intake_at || b.created_at || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      const numA = parseInt(a.system_queue_number || a.short_code, 10) || 0;
      const numB = parseInt(b.system_queue_number || b.short_code, 10) || 0;
      return numA - numB;
    });

  const myIndex = activeOrders.findIndex(o => 
    o.order_id === order.value.order_id || 
    (o.system_queue_number && o.system_queue_number === order.value.system_queue_number) ||
    (o.short_code && o.short_code === order.value.short_code)
  );

  if (myIndex !== -1) {
    return myIndex;
  }
  return 0;
});

async function fetchOrder() {
  await queueStore.refreshFromStorage();
  const found = queueStore.getOrderById(orderId.value);
  if (found) {
    fallbackOrder.value = found;
  }
}

function manuallySetStatus(newStatus) {
  if (!order.value) return;
  queueStore.updateStatus(order.value.order_id, newStatus);
}

function handleConfirmCancel() {
  showCancelModal.value = false;
  if (!order.value) return;
  queueStore.cancelOrder(order.value.order_id);
}

function startNewOrder() {
  router.push('/');
}

let eventSource = null;

onMounted(() => {
  fetchOrder();
  
  // Real-time SSE listener for instant cross-device status push
  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('orders_updated', () => {
        fetchOrder();
      });
    } catch (e) {}
  }

  // Fast network polling sync (every 1.5s)
  pollInterval = setInterval(() => {
    fetchOrder();
  }, 1500);

  // Storage listeners for real-time cross-tab sync
  window.addEventListener('stanley_orders_updated', fetchOrder);
  window.addEventListener('storage', fetchOrder);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (eventSource) eventSource.close();
  window.removeEventListener('stanley_orders_updated', fetchOrder);
  window.removeEventListener('storage', fetchOrder);
});
</script>

<style scoped>
.step-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100%;
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
}

.page-container {
  padding: var(--top-content-padding) var(--side-margin) calc(64px + env(safe-area-inset-bottom, 0px)) var(--side-margin);
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
  gap: 24px;
}

.ticket-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
  min-height: 0;
}

.state-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.status-headline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.headline-title {
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 500;
  color: var(--color-black);
  letter-spacing: -0.4px;
  line-height: 24px;
}

.ready-title {
  color: #065f46;
}

.headline-subtitle {
  font-family: var(--font-brand);
  font-size: 16px;
  line-height: 22px;
  color: var(--color-black);
  letter-spacing: -0.48px;
}

.massive-code-display {
  display: flex;
  align-items: center;
  position: relative;
  margin: 8px 0;
}

.queue-headline-wrap {
  gap: 8px;
}

.queue-counter-display {
  margin: 0;
  padding: 0;
}

.queue-counter {
  font-size: 48px;
  line-height: 48px;
  letter-spacing: -0.96px;
}

.code-number {
  font-family: var(--font-brand);
  font-size: 48px;
  font-weight: 600;
  color: var(--color-black);
  letter-spacing: -0.96px;
  line-height: 48px;
}

.laser-text {
  font-family: var(--font-brand);
  font-size: 48px;
  font-weight: 600;
  color: var(--color-black);
  letter-spacing: -0.96px;
  line-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.laser-text span {
  display: inline-block;
  line-height: 48px;
  text-align: left;
}

.animated-dots::after {
  content: '';
  display: inline-block;
  animation: dotsCycle 1.5s infinite steps(4, jump-none);
  min-width: 1.5ch;
  text-align: left;
}

@keyframes dotsCycle {
  0% { content: ''; }
  25% { content: '.'; }
  50% { content: '..'; }
  75%, 100% { content: '...'; }
}

.active-engraving-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

.queue-ticket-badge-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
}

.system-queue-pill {
  background-color: #000000;
  color: #FFFFFF;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* Notice Row (White Card Container matching Figma 12:900 & 21:1166) */
.notice-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--color-bg-white);
  padding: 14px 16px;
  border-radius: 8px;
  width: 100%;
}

.notice-row.multi-line {
  align-items: flex-start;
}

.info-circle-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Ready for Pickup Order List (Figma 28:1242) */
.ready-order-list-block {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  margin-top: 8px;
}

.ready-order-list-title {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 500;
  color: var(--color-black);
}

.ready-items-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: calc(100dvh - 360px);
  overflow-y: auto;
  padding-right: 4px;
}

.ready-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.ready-item-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ready-item-text {
  font-size: 32px;
  line-height: 36px;
  font-weight: 600;
  letter-spacing: 1.6px;
  color: var(--color-black);
  word-break: break-word;
}

.ready-item-meta {
  font-family: var(--font-brand);
  font-size: 12px;
  line-height: 16px;
  color: var(--color-black);
}

.notice-text {
  font-family: var(--font-brand);
  font-size: 12px;
  line-height: 16px;
  color: var(--color-black);
}

.customer-info-card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: auto;
  width: 100%;
}

.specs-table {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.spec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  line-height: 18px;
}

.spec-label {
  font-family: var(--font-brand);
  color: var(--color-black);
  font-weight: 400;
}

.spec-value {
  font-family: var(--font-brand);
  font-weight: 600;
  color: var(--color-black);
  text-align: right;
}

.ticket-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Floating Retail Demo Overlay Tool (Independent Overlay) */
.dev-demo-overlay {
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}

.dev-toggle-pill {
  pointer-events: auto;
  background: #111827;
  color: #ffffff;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  opacity: 0.85;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.dev-toggle-pill:hover {
  opacity: 1;
  transform: scale(1.04);
}

.pill-arrow {
  font-size: 9px;
}

.dev-demo-panel {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 260px;
}

.dev-demo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dev-tag {
  font-weight: 600;
  color: #374151;
  font-size: 11px;
}

.dev-close-btn {
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  padding: 2px 4px;
}

.dev-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dev-btn {
  padding: 4px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  font-size: 11px;
  color: #374151;
  cursor: pointer;
  text-transform: capitalize;
  font-weight: 500;
}

.dev-btn.is-active {
  background: #000000;
  color: #ffffff;
}

.dev-link {
  color: #2563eb;
  font-size: 11px;
  text-decoration: underline;
  margin-top: 4px;
  text-align: right;
  font-weight: 500;
}

.not-found-state {
  text-align: center;
  padding: 80px 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
