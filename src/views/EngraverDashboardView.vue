<template>
  <div class="engraver-screen">
    <!-- Top Dashboard Header (Figma 17:699) -->
    <header class="dashboard-header">
      <div class="header-inner">
        <div class="header-titles">
          <img 
            :src="logoBlack" 
            alt="Stanley 1913" 
            class="stanley-logo" 
          />
          <h1 class="station-heading">ENGRAVING STATION</h1>
          <div class="header-divider"></div>
          <p class="store-location">{{ currentStoreLocation }}</p>
        </div>

        <!-- Header Actions (Figma 89:2713) -->
        <div class="header-actions">
          <button class="logout-btn" @click="handleLogout" title="Sign out of station">
            Logout
          </button>
          <router-link :to="dashboardRoute" class="see-dashboard-btn">
            <img src="/src/assets/icons/chart.svg" alt="Analytics" class="chart-icon" />
            <span>Dashboard</span>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Workspace (Figma 17:636) -->
    <main class="dashboard-body">
      <div class="machines-and-queue-grid">
        
        <!-- ZONE C: ACTIVE MACHINE CARDS (Left/Center area) -->
        <section class="machines-grid">
          <div 
            v-for="machine in queueStore.machines" 
            :key="machine.id"
            class="machine-card"
            :class="{ 'is-deactivated': machine.isActive === false }"
          >
            <!-- Card Header -->
            <div class="card-header">
              <div class="badge-and-status">
                <span class="machine-badge">{{ machine.name }}</span>
                <span 
                  class="status-label"
                  :class="{ 
                    'is-engraving': machine.status === 'engraving',
                    'is-deactivated': machine.isActive === false
                  }"
                >
                  {{ machine.isActive === false ? 'OFFLINE' : (machine.status === 'engraving' ? 'NOW ENGRAVING' : (hasOrder(machine) ? 'READY TO ENGRAVE' : 'STATION IDLE')) }}
                </span>
              </div>

              <!-- Count-Up Stopwatch Timer (Figma 58:330) -->
              <div class="stopwatch-timer" :class="{ 'is-active': machine.status === 'engraving' }">
                <img src="/src/assets/icons/clock.svg" alt="Clock" class="clock-icon" />
                <span class="timer-digits">{{ formatTimer(machine.timerSeconds) }}</span>
              </div>
            </div>

            <!-- Card Body / Content Split -->
            <div class="card-body">
              <!-- Product Image & Live Orientation Engraving Visualizer -->
              <div class="product-visualizer-container">
                <div class="product-image-wrap">
                  <img 
                    :src="getItemImage(getCurrentItem(machine))" 
                    :alt="getCurrentItem(machine)?.model || 'Stanley Tumbler'" 
                    class="product-tumbler-img" 
                  />
                  
                  <!-- Dynamic Live Engraving Text Overlay -->
                  <div 
                    v-if="getCurrentItem(machine)" 
                    class="engraving-text-overlay"
                    :class="[
                      getItemFontClass(getCurrentItem(machine)),
                      { 'is-vertical': getCurrentItem(machine).position === 'Vertical' }
                    ]"
                    :style="getItemPlacementStyle(getCurrentItem(machine))"
                  >
                    {{ getCurrentItem(machine).text }}
                  </div>
                </div>

                <!-- Multi-Item Carousel Controls (if order contains 2+ cups) -->
                <div 
                  v-if="getOrderItems(machine).length > 1" 
                  class="multi-item-carousel-controls"
                >
                  <button 
                    class="carousel-nav-btn prev"
                    :disabled="machine.currentItemIndex <= 0"
                    @click="queueStore.setMachineItemIndex(machine.id, machine.currentItemIndex - 1)"
                    aria-label="Previous cup"
                  >
                    ‹
                  </button>
                  <span class="item-pagination">
                    Cup {{ machine.currentItemIndex + 1 }} of {{ getOrderItems(machine).length }}
                  </span>
                  <button 
                    class="carousel-nav-btn next"
                    :disabled="machine.currentItemIndex >= getOrderItems(machine).length - 1"
                    @click="queueStore.setMachineItemIndex(machine.id, machine.currentItemIndex + 1)"
                    aria-label="Next cup"
                  >
                    ›
                  </button>
                </div>
              </div>

              <!-- Customer & Specs Details -->
              <div class="card-content-pane">
                <template v-if="getAssignedOrder(machine)">
                  <div class="specs-details">
                    <div class="ticket-customer-row">
                      <span class="ticket-id">#{{ getAssignedOrder(machine).system_queue_number || getAssignedOrder(machine).short_code }}</span>
                      <span class="customer-name">{{ getAssignedOrder(machine).customer_name }}</span>
                    </div>
                    <p class="product-name-line">
                      {{ getCurrentItem(machine)?.model || 'The IceFlow™ Flip Straw Tumbler' }}
                    </p>
                    <p class="product-size-pos-line">
                      {{ getCurrentItem(machine)?.size || '40oz' }} - <strong class="pos-text-bold">{{ getCurrentItem(machine)?.position || 'Horizontal' }}</strong>
                    </p>
                  </div>

                  <!-- Font Style and Engraving Text (Tap-to-Copy Dev Requirement) -->
                  <div 
                    class="font-engraving-box"
                    @click="copyToClipboard(getCurrentItem(machine)?.text, machine.id)"
                    title="Tap to copy text string to iPad clipboard"
                  >
                    <div class="spec-col">
                      <span class="spec-label">Font Style</span>
                      <span class="spec-value">{{ getCurrentItem(machine)?.font || 'Helvetica Bold' }}</span>
                    </div>
                    <div class="box-divider"></div>
                    <div class="spec-col copyable-col">
                      <div class="label-copy-row">
                        <span class="spec-label">Engrave</span>
                        <span v-if="copiedMachineId === machine.id" class="copied-badge fade-in">✓ Copied!</span>
                      </div>
                      <span 
                        class="spec-value engrave-string"
                        :class="getItemFontClass(getCurrentItem(machine))"
                      >
                        “{{ getCurrentItem(machine)?.text || 'STANLEY' }}”
                      </span>
                    </div>
                  </div>

                  <!-- Big Action CTA Button -->
                  <div class="action-btn-wrap">
                    <!-- State 1: START ENGRAVING (Solid Black) -->
                    <button 
                      v-if="machine.status !== 'engraving'"
                      class="machine-cta-btn start-engraving-btn"
                      @click="handleStartEngraving(machine)"
                    >
                      START ENGRAVING
                    </button>

                    <!-- State 2: DONE. NOTIFY CUSTOMER (Stanley Green) -->
                    <button 
                      v-else
                      class="machine-cta-btn done-notify-btn"
                      @click="handleDoneNotify(machine)"
                    >
                      DONE. NOTIFY CUSTOMER
                    </button>
                  </div>
                </template>

                <template v-else>
                  <!-- Empty Idle Machine State -->
                  <div class="empty-machine-state">
                    <p class="idle-title">Station Ready</p>
                    <p class="idle-desc">
                      Waiting for upcoming orders from the intake queue.
                    </p>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </section>

        <!-- RIGHT SIDEBAR: ZONE A (Manual Intake) & ZONE B (Upcoming List) -->
        <aside class="queue-sidebar">
          
          <!-- ZONE A: MANUAL INTAKE (Figma 58:508) -->
          <div class="add-to-queue-card">
            <h2 class="sidebar-heading">ADD TO QUEUE</h2>
            
            <form @submit.prevent="handleIntakeLookup" class="intake-form">
              <div class="intake-input-wrap" :class="{ 'has-error': intakeError }">
                <input 
                  type="text" 
                  v-model="intakeCode" 
                  maxlength="6"
                  placeholder="Enter 3-digit Code (e.g. C4X)" 
                  class="intake-input uppercase-input"
                  autocomplete="off"
                  autocorrect="off"
                  @input="intakeCode = intakeCode.toUpperCase()"
                />
              </div>

              <!-- Inline feedback message -->
              <p v-if="intakeFeedback" class="intake-feedback fade-in" :class="{ 'is-error': intakeError }">
                {{ intakeFeedback }}
              </p>

              <button 
                type="submit" 
                class="intake-confirm-btn"
                :disabled="!intakeCode.trim()"
              >
                Confirm
              </button>
            </form>
          </div>

          <!-- ZONE B: UPCOMING LIST (Figma 31:1637) -->
          <div class="upcoming-list-card">
            <div class="upcoming-header">
              <h2 class="sidebar-heading">
                UPCOMING LIST ( {{ upcomingListOrders.length }} )
              </h2>
            </div>

            <div class="upcoming-scrollable-container">
              <div 
                v-if="upcomingListOrders.length === 0" 
                class="upcoming-empty"
              >
                <p>No upcoming orders in queue.</p>
                <span>New customer drop-offs will appear here automatically.</span>
              </div>

              <div 
                v-for="order in upcomingListOrders" 
                :key="order.order_id"
                class="upcoming-item-card fade-in"
                @click="loadOrderToWorkspace(order.order_id)"
                title="Tap to load into active machine workspace"
              >
                <div class="upcoming-item-header">
                  <span class="upcoming-cust-name">{{ order.customer_name }}</span>
                  <span class="upcoming-ticket-tag">#{{ order.system_queue_number || order.short_code }}</span>
                </div>

                <div class="upcoming-items-list">
                  <div 
                    v-for="(it, idx) in order.items" 
                    :key="idx"
                    class="upcoming-item-spec-wrap"
                  >
                    <p class="upcoming-product-name">
                      {{ it.model || 'Stanley Tumbler' }}
                    </p>
                    <p class="upcoming-product-variant">
                      {{ it.size }} - <strong class="pos-text-bold">{{ it.position }}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

      </div>
    </main>

    <!-- INTAKE ORDER CONFIRMATION POP-UP (Figma 81:2459) -->
    <Teleport to="body">
      <div v-if="showIntakeModal && pendingIntakeOrder" class="popup-backdrop" @click="showIntakeModal = false">
        <div class="confirmation-popup-card fade-in" @click.stop>
          
          <!-- Large Unique Code Headline & Instructions (Figma 81:2454) -->
          <div class="popup-header-block">
            <h1 class="popup-code-title">#{{ pendingIntakeOrder.intake_code || pendingIntakeOrder.short_code }}</h1>
            <p class="popup-instruction-text">
              Please confirm the order data below with the Customer<br />
              <strong class="cust-highlight-name">{{ pendingIntakeOrder.customer_name }}</strong> before continue.
            </p>
          </div>

          <!-- Grey Summary Box (Figma 83:2461) -->
          <div class="popup-summary-box">
            
            <!-- 3 Metadata Columns (Figma 83:2465) -->
            <div class="summary-meta-row">
              <div class="meta-item">
                <span class="meta-item-label">Customer Name</span>
                <span class="meta-item-value">{{ pendingIntakeOrder.customer_name }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">WhatsApp Number:</span>
                <span class="meta-item-value">{{ pendingIntakeOrder.phone }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-item-label">Engraving</span>
                <span class="meta-item-value">{{ pendingIntakeOrder.items?.length || 1 }} Cup{{ (pendingIntakeOrder.items?.length || 1) > 1 ? 's' : '' }}</span>
              </div>
            </div>

            <!-- List of Cups to Engrave (Figma 83:2570) -->
            <div class="popup-items-stack">
              <div 
                v-for="(item, idx) in (pendingIntakeOrder.items || [])" 
                :key="idx"
                class="popup-item-row"
              >
                <div class="popup-item-left-wrap">
                  <img 
                    :src="getItemImage(item)" 
                    :alt="item.model || 'Stanley Tumbler'" 
                    class="popup-item-thumb" 
                  />
                  <div class="item-info-col">
                    <p class="item-title-spec">
                      {{ item.model || 'The IceFlow™ Flip Straw Tumbler' }} {{ item.size || '30oz' }}
                    </p>
                    <div class="item-text-font-line">
                      <span class="item-custom-word" :class="item.fontClass">
                        {{ item.text }}
                      </span>
                      <span class="item-font-family-tag">
                        {{ item.font }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Orientation Pill Badge (Figma 83:2553) -->
                <div class="orientation-black-pill">
                  {{ item.position || 'Horizontal' }}
                </div>
              </div>
            </div>

          </div>

          <!-- Action CTA Buttons (Figma 83:2581) -->
          <div class="popup-action-buttons">
            <button class="btn-confirm-queue-cta" @click="handleConfirmIntakeModal">
              CONFIRM & ADD TO QUEUE (#{{ nextAssignedQueueNumber }})
            </button>
            <button class="btn-cancel-queue-cta" @click="showIntakeModal = false">
              CANCEL
            </button>
          </div>

        </div>
      </div>
    </Teleport>

    <!-- SEE DASHBOARD ANALYTICS & WHATSAPP MODAL -->
    <Teleport to="body">
      <div v-if="showAnalyticsModal" class="analytics-modal-backdrop" @click="showAnalyticsModal = false">
        <div class="analytics-modal-card fade-in" @click.stop>
          <div class="analytics-modal-header">
            <div class="title-wrap">
              <img src="/src/assets/icons/chart.svg" alt="Chart" class="modal-chart-icon" />
              <h3>Engraving Station Operations Dashboard</h3>
            </div>
            <button class="close-btn" @click="showAnalyticsModal = false">✕</button>
          </div>

          <div class="analytics-stats-grid">
            <div class="stat-pill-card">
              <span class="stat-label">COMPLETED TODAY</span>
              <span class="stat-value">{{ analyticsSummary.totalCompleted }} cups</span>
            </div>
            <div class="stat-pill-card">
              <span class="stat-label">AVG TIME / CUP</span>
              <span class="stat-value">{{ analyticsSummary.avgDurationFormatted }}</span>
            </div>
            <div class="stat-pill-card">
              <span class="stat-label">FASTEST ENGRAVE</span>
              <span class="stat-value">{{ analyticsSummary.fastestDurationFormatted }}</span>
            </div>
            <div class="stat-pill-card">
              <span class="stat-label">ACTIVE IN QUEUE</span>
              <span class="stat-value">{{ queueStore.getActiveQueueCount() }} orders</span>
            </div>
          </div>

          <!-- Live WhatsApp Notification Dispatch Log -->
          <div class="whatsapp-logs-section">
            <h4 class="logs-heading">Recent WhatsApp Automated Notifications (POST /whatsapp/send)</h4>
            <div class="logs-list">
              <div v-if="whatsappLogs.length === 0" class="no-logs">
                No notification webhooks dispatched yet this shift.
              </div>
              <div v-for="log in whatsappLogs.slice(0, 5)" :key="log.id" class="log-row">
                <div class="log-top">
                  <span class="log-phone">{{ log.recipientPhone }} ({{ log.recipientName }})</span>
                  <span class="log-badge">✓ {{ log.status.toUpperCase() }}</span>
                </div>
                <p class="log-msg">{{ log.message }}</p>
                <span class="log-time">{{ new Date(log.timestamp).toLocaleTimeString() }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-close-btn" @click="showAnalyticsModal = false">
              Close Dashboard
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import logoBlack from '../assets/images/logo-black.png';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQueueStore } from '../store/queueStore.js';
import { getAnalyticsSummary, getWhatsAppLogs } from '../utils/analyticsService.js';
import { getCanonicalStore } from '../utils/storeResolver.js';
import { CUP_MODELS, getCatalogCupModels, fetchCatalogCupModels } from '../store/engravingStore.js';

const router = useRouter();
const route = useRoute();
const queueStore = useQueueStore();

const currentStoreLocation = computed(() => {
  const storeIdParam = route.params.storeId;
  const userStore = storeIdParam || localStorage.getItem('stanley_user_store');
  const canonical = getCanonicalStore(userStore);
  if (canonical && canonical.name) {
    const s = canonical.name.toUpperCase();
    return s.startsWith('STANLEY') ? s : `STANLEY ${s}`;
  }
  if (userStore && userStore.trim()) {
    const s = userStore.trim().toUpperCase();
    return s.startsWith('STANLEY') ? s : `STANLEY ${s}`;
  }
  return 'STANLEY PONDOK INDAH MALL';
});

const dashboardRoute = computed(() => {
  const userStore = route.params.storeId || localStorage.getItem('stanley_user_store');
  const canonical = getCanonicalStore(userStore);
  const code = canonical ? canonical.code : userStore;
  return code ? `/dashboard/${encodeURIComponent(code)}` : '/dashboard';
});

function handleLogout() {
  try {
    const token = localStorage.getItem('stanley_staff_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('stanley_staff_token');
    localStorage.removeItem('stanley_staff_authenticated');
    localStorage.removeItem('stanley_staff_user');
    localStorage.removeItem('stanley_user_role');
    localStorage.removeItem('stanley_is_developer');
  } catch (e) {}
  router.push('/login');
}

const intakeCode = ref('');
const intakeFeedback = ref('');
const intakeError = ref(false);
const copiedMachineId = ref(null);
const showAnalyticsModal = ref(false);

// Intake Modal State
const showIntakeModal = ref(false);
const pendingIntakeOrder = ref(null);
const nextAssignedQueueNumber = ref('');

let timerInterval = null;

onMounted(async () => {
  queueStore.refreshFromStorage();
  await fetchCatalogCupModels();

  // 1-second count-up stopwatch timer for active laser machines
  timerInterval = setInterval(() => {
    queueStore.tickTimers();
  }, 1000);

  // Auto-sync across browser tabs (localStorage event listener)
  window.addEventListener('storage', handleStorageUpdate);
  window.addEventListener('stanley_products_updated', () => {
    fetchCatalogCupModels();
  });
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  window.removeEventListener('storage', handleStorageUpdate);
  window.removeEventListener('stanley_products_updated', () => {});
});

function handleStorageUpdate() {
  queueStore.refreshFromStorage();
}

function getItemImage(item) {
  if (!item) return '/src/assets/images/product-step1.png';
  if (item.placementImage) return item.placementImage;
  if (item.image) return item.image;

  // Lookup in catalog by model name / shortName
  const catalog = getCatalogCupModels();
  const found = catalog.find(m => 
    (item.model && (m.name === item.model || m.id === item.model || m.name.toLowerCase().includes(item.model.toLowerCase()) || item.model.toLowerCase().includes(m.name.toLowerCase()))) ||
    (item.shortName && (m.shortName === item.shortName || m.name.toLowerCase().includes(item.shortName.toLowerCase())))
  );

  if (found) {
    return found.placementImage || found.image || '/src/assets/images/product-step1.png';
  }

  // Fallback to default CUP_MODELS
  const fallback = CUP_MODELS.find(m => 
    (item.model && (m.name.toLowerCase().includes(item.model.toLowerCase()) || item.model.toLowerCase().includes(m.name.toLowerCase()))) ||
    (item.shortName && m.shortName.toLowerCase().includes(item.shortName.toLowerCase()))
  );

  if (fallback) {
    return fallback.placementImage || fallback.image || '/src/assets/images/product-step1.png';
  }

  return '/src/assets/images/product-step1.png';
}

function getItemPlacementStyle(item) {
  if (!item) return {};
  const isVert = item.position === 'Vertical';
  
  let top = item.textTop !== undefined ? item.textTop : 48;
  let left = item.textLeft !== undefined ? item.textLeft : 50;
  let size = item.textSize !== undefined ? item.textSize : 14;

  const catalog = getCatalogCupModels();
  const matched = catalog.find(m => 
    (item.model && (m.name === item.model || m.id === item.model)) ||
    (item.shortName && m.shortName === item.shortName)
  );
  if (matched) {
    if (matched.textTop !== undefined && item.textTop === undefined) top = matched.textTop;
    if (matched.textLeft !== undefined && item.textLeft === undefined) left = matched.textLeft;
    if (matched.textSize !== undefined && item.textSize === undefined) size = matched.textSize;
  }

  return {
    top: `${top}%`,
    left: `${left}%`,
    fontSize: size ? `${size}px` : undefined,
    transform: isVert ? 'translate(-50%, -50%) rotate(-90deg)' : 'translate(-50%, -50%)'
  };
}

const activeStoreId = computed(() => {
  return route.params.storeId || localStorage.getItem('stanley_user_store') || 'EG-021';
});

const upcomingListOrders = computed(() => {
  return typeof queueStore.upcomingListOrders === 'function'
    ? queueStore.upcomingListOrders(activeStoreId.value)
    : queueStore.upcomingListOrders;
});
const analyticsSummary = computed(() => getAnalyticsSummary());
const whatsappLogs = computed(() => getWhatsAppLogs());

function hasOrder(machine) {
  return Boolean(machine.currentOrderId);
}

function getAssignedOrder(machine) {
  return queueStore.getAssignedOrder(machine);
}

function getOrderItems(machine) {
  const order = getAssignedOrder(machine);
  return order?.items || [];
}

function getCurrentItem(machine) {
  const items = getOrderItems(machine);
  const index = machine.currentItemIndex || 0;
  return items[index] || items[0] || null;
}

function getFormattedSpec(machine) {
  const item = getCurrentItem(machine);
  if (!item) return '';
  const model = item.model || 'The IceFlow™ Flip Straw Tumbler';
  const size = item.size || '40oz';
  const pos = item.position || 'Horizontal';
  return `${model} ${size} | ${pos}`;
}

// Adaptive condition: Check if either machine has a longer spec string that wraps onto 2 lines
const hasTwoLineSpec = computed(() => {
  const m1Spec = getFormattedSpec(queueStore.machines[0]);
  const m2Spec = getFormattedSpec(queueStore.machines[1]);
  return m1Spec.length > 42 || m2Spec.length > 42;
});

function getItemFontClass(item) {
  if (!item) return 'font-engraving-lato';
  if (item.fontClass) return item.fontClass;
  const f = (item.font || '').toLowerCase();
  if (f.includes('caveat')) return 'font-engraving-caveat';
  if (f.includes('lobster')) return 'font-engraving-lobster';
  if (f.includes('pinyon')) return 'font-engraving-pinyon';
  if (f.includes('abeezee')) return 'font-engraving-abeezee';
  return 'font-engraving-lato';
}

function formatTimer(totalSeconds) {
  const mins = Math.floor((totalSeconds || 0) / 60).toString().padStart(2, '0');
  const secs = ((totalSeconds || 0) % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

/**
 * Tap-to-Copy Engraving Text String to iPad Clipboard
 */
async function copyToClipboard(text, machineId) {
  if (!text) return;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }
    copiedMachineId.value = machineId;
    setTimeout(() => {
      if (copiedMachineId.value === machineId) {
        copiedMachineId.value = null;
      }
    }, 2000);
  } catch (err) {
    console.warn('Clipboard write failed:', err);
  }
}

/**
 * Zone A: Lookup Order by 3-digit Alphanumeric Code and open Details Modal
 */
async function handleIntakeLookup() {
  if (!intakeCode.value.trim()) return;
  const clean = intakeCode.value.trim().toUpperCase();
  const res = await queueStore.lookupIntakeOrder(clean, activeStoreId.value);
  
  if (res.success) {
    pendingIntakeOrder.value = res.order;
    nextAssignedQueueNumber.value = res.nextQueueNumber;
    showIntakeModal.value = true;
    intakeFeedback.value = '';
    intakeError.value = false;
  } else {
    intakeFeedback.value = res.message;
    intakeError.value = true;
  }
}

/**
 * Confirm Intake from Modal: translates to system queue #0021
 */
async function handleConfirmIntakeModal() {
  if (!pendingIntakeOrder.value) return;
  const res = await queueStore.confirmOrderIntake(pendingIntakeOrder.value.order_id, activeStoreId.value);
  
  if (res.success) {
    showIntakeModal.value = false;
    intakeCode.value = '';
    intakeFeedback.value = res.message;
    intakeError.value = false;
    pendingIntakeOrder.value = null;

    setTimeout(() => {
      intakeFeedback.value = '';
    }, 4000);
  }
}


/**
 * Load Upcoming Order into Workspace Station
 */
function loadOrderToWorkspace(orderId) {
  queueStore.assignOrderToMachine(orderId);
}

/**
 * State 1 -> State 2: START ENGRAVING
 */
function handleStartEngraving(machine) {
  queueStore.startMachine(machine.id);
}

/**
 * State 2 -> State 3: DONE. NOTIFY CUSTOMER
 */
function handleDoneNotify(machine) {
  queueStore.completeMachine(machine.id);
}
</script>

<style scoped>
.engraver-screen {
  position: relative;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  color: #111827;
  font-family: var(--font-brand);
  overflow: hidden;
}

/* Header (Figma 17:699) */
.dashboard-header {
  height: 64px;
  padding: 0 clamp(16px, 2vw, 24px);
  background-color: #FFFFFF;
  width: 100%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.header-inner {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-titles {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  height: 28px;
}

.stanley-logo {
  height: 24px;
  width: auto;
  object-fit: contain;
  display: block;
}

.station-heading {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
  margin: 0;
  text-transform: uppercase;
  line-height: 1;
  padding-bottom: 2px;
  display: flex;
  align-items: flex-end;
}

.header-divider {
  width: 1px;
  height: 16px;
  background-color: #D1D5DB;
  margin-bottom: 2px;
}

.store-location {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
  text-transform: uppercase;
  line-height: 1;
  padding-bottom: 2px;
  display: flex;
  align-items: flex-end;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.logout-btn {
  background-color: #FFFFFF;
  color: #000000;
  border: 1px solid #000000;
  height: 40px;
  width: 148px;
  padding: 0 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.logout-btn:hover {
  background-color: #F9FAFB;
}

.logout-btn:active {
  transform: scale(0.99);
}

.see-dashboard-btn {
  background-color: #000000;
  color: #FFFFFF;
  border: 1px solid #000000;
  height: 40px;
  width: 148px;
  padding: 0 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: -0.01em;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.see-dashboard-btn:hover {
  opacity: 0.88;
}

.see-dashboard-btn:active {
  transform: scale(0.99);
}

.chart-icon {
  width: 16px;
  height: 16px;
  filter: invert(1);
}

/* Main Layout Grid */
.dashboard-body {
  padding: clamp(16px, 2vw, 24px);
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.machines-and-queue-grid {
  display: flex;
  gap: clamp(16px, 1.8vw, 24px);
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  height: 100%;
}

/* ZONE C: MACHINE CARDS */
.machines-grid {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 1.8vw, 24px);
}

.machine-card {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: clamp(12px, 1.4vw, 16px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 0;
  height: 100%;
  transition: opacity 0.25s ease, filter 0.25s ease;
}

.machine-card.is-deactivated {
  cursor: not-allowed;
}

.machine-card.is-deactivated .card-header {
  opacity: 1;
}

.machine-card.is-deactivated .card-body {
  opacity: 0.35;
  pointer-events: none;
  user-select: none;
  filter: grayscale(0.5);
  transition: opacity 0.25s ease, filter 0.25s ease;
}

.status-label.is-deactivated {
  color: #111827;
  opacity: 1;
  font-weight: 700;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-bottom: 12px;
  border-bottom: 1px solid #F3F4F6;
}

.badge-and-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.machine-badge {
  background-color: #F8F9FA;
  border: 1px solid #E5E7EB;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #111827;
}

.status-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #9CA3AF;
}

.status-label.is-engraving {
  color: #111827;
}

.stopwatch-timer {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6B7280;
  font-weight: 500;
}

.stopwatch-timer.is-active {
  color: #111827;
  font-weight: 700;
}

.clock-icon {
  width: 14px;
  height: 14px;
}

.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  margin-top: 4px;
}

/* Product Visualizer Container - Responsive & Proportional Fill */
.product-visualizer-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  padding: 8px 0;
  overflow: hidden;
}

.product-image-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.product-tumbler-img {
  width: auto;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
  margin: 0 auto;
  filter: drop-shadow(0 10px 24px rgba(0, 0, 0, 0.12));
  transition: transform 0.2s ease;
}

/* Dynamic Live Engraving Text Overlay */
.engraving-text-overlay {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(14px, 1.8vw, 18px);
  font-weight: 600;
  color: #FFFFFF;
  letter-spacing: 1px;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
  transition: transform 0.2s ease;
}

.engraving-text-overlay.is-vertical {
  transform: translate(-50%, -50%) rotate(-90deg);
}

/* Multi-Item Carousel Controls */
.multi-item-carousel-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 6px;
}

.carousel-btn {
  background: #F3F4F6;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #111827;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.carousel-btn:hover {
  background-color: #E5E7EB;
}

.item-pagination {
  font-size: 12px;
  font-weight: 500;
  color: #4B5563;
}

/* Card Content Pane */
.card-content-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
  flex-shrink: 0;
}

.specs-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
}

.ticket-customer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  height: 20px;
  margin-bottom: 2px;
  flex-shrink: 0;
}

.product-name-line {
  font-size: 13px;
  line-height: 1.25;
  color: #6B7280;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-size-pos-line {
  font-size: 13px;
  line-height: 1.25;
  color: #6B7280;
  margin: 0;
}

.pos-text-bold {
  font-weight: 700;
  color: #111827;
}

/* Font and Engraving Box (Figma 58:489) */
.font-engraving-box {
  background-color: #F5F5F5;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.1s ease;
  position: relative;
  margin-bottom: 2px;
}

.font-engraving-box:hover {
  background-color: #EBEBEB;
}

.font-engraving-box:active {
  transform: scale(0.99);
}

.spec-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.spec-label {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
}

.spec-value {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
}

.engrave-string {
  font-size: 16px;
  line-height: 1.2;
  display: inline-block;
}

.box-divider {
  width: 1px;
  height: 34px;
  background-color: #E5E7EB;
}

.label-copy-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.copied-badge {
  font-size: 11px;
  background-color: #111827;
  color: #FFFFFF;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

/* Action CTA Buttons */
.action-btn-wrap {
  width: 100%;
  padding-top: 4px;
}

.machine-cta-btn {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, opacity 0.2s ease;
}

.machine-cta-btn:active {
  transform: scale(0.99);
}

/* State 1: Solid Black */
.start-engraving-btn {
  background-color: #000000;
  color: #FFFFFF;
}

/* State 2: Stanley Green (Figma 58:382 #304d2b) */
.done-notify-btn {
  background-color: #304D2B;
  color: #FFFFFF;
}

.empty-machine-state {
  text-align: center;
  padding: 32px 16px;
}

.idle-title {
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.idle-desc {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
}

/* RIGHT SIDEBAR (Zone A + Zone B) */
.queue-sidebar {
  width: clamp(290px, 26vw, 350px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  height: 100%;
}

/* ZONE A: MANUAL INTAKE (Figma 58:508) */
.add-to-queue-card {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex-shrink: 0;
}

.sidebar-heading {
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0;
  color: #111827;
}

.intake-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.intake-input-wrap {
  width: 100%;
}

.intake-input {
  width: 100%;
  height: 50px;
  background-color: #FBFBFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-family: inherit;
  color: #111827;
  outline: none;
}

.uppercase-input {
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.intake-input:focus {
  border-color: #111827;
  background-color: #FFFFFF;
}

.intake-input::placeholder {
  color: #9CA3AF;
  font-size: 11px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: normal;
}

.intake-feedback {
  font-size: 12px;
  color: #304D2B;
  margin: 0;
  font-weight: 500;
}

.intake-feedback.is-error {
  color: #DC2626;
}

.intake-confirm-btn {
  width: 100%;
  height: 46px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.intake-confirm-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.intake-confirm-btn:disabled {
  background-color: #D2D2D2;
  cursor: not-allowed;
}

/* ZONE B: UPCOMING LIST (Figma 31:1637) */
.upcoming-list-card {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.upcoming-header {
  flex-shrink: 0;
  width: 100%;
  padding-bottom: 12px;
  border: none;
}

.upcoming-scrollable-container {
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: 2px 4px 8px 2px;
  border: none;
}

.upcoming-empty {
  text-align: center;
  padding: 32px 16px;
  color: #9CA3AF;
  font-size: 13px;
}

.upcoming-item-card {
  background-color: #F5F5F5;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
}

.upcoming-item-card:hover {
  background-color: #EFEFEF;
  border-color: #111827;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.upcoming-item-card:active {
  transform: scale(0.99);
}

.upcoming-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.upcoming-cust-name {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.upcoming-ticket-tag {
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.upcoming-items-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.upcoming-item-spec-wrap {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.upcoming-product-name {
  font-size: 12px;
  line-height: 1.25;
  color: #6B7280;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-product-variant {
  font-size: 12px;
  line-height: 1.25;
  color: #6B7280;
  margin: 0;
}

/* INTAKE ORDER CONFIRMATION POP-UP (Figma 81:2459) */
.popup-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.confirmation-popup-card {
  background-color: #FFFFFF;
  border-radius: 8px;
  width: 100%;
  max-width: 580px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
}

.popup-header-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.popup-code-title {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.8px;
  line-height: 1;
  color: #000000;
  margin: 0;
}

.popup-instruction-text {
  font-size: 16px;
  color: #000000;
  letter-spacing: -0.48px;
  line-height: 1.35;
  margin: 0;
}

.cust-highlight-name {
  font-weight: 700;
}

/* Grey Summary Box (Figma 83:2461) */
.popup-summary-box {
  background-color: #F5F5F5;
  border-radius: 8px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  padding-bottom: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-item-label {
  font-size: 12px;
  color: #6B7280;
}

.meta-item-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.popup-items-stack {
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
}

.popup-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.popup-item-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.popup-item-row:first-child {
  padding-top: 0;
}

.popup-item-left-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.popup-item-thumb {
  width: 40px;
  height: 50px;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.08));
  flex-shrink: 0;
}

.item-info-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item-title-spec {
  font-size: 14px;
  color: #6B7280;
  margin: 0;
}

.item-text-font-line {
  display: flex;
  align-items: center;
  gap: 24px;
}

.item-custom-word {
  font-size: 20px;
  color: #111827;
  line-height: 1;
}

.item-font-family-tag {
  font-size: 14px;
  color: #6B7280;
}

.orientation-black-pill {
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  min-width: 100px;
  text-align: center;
  font-weight: 400;
}

/* Action CTA Buttons (Figma 83:2581) */
.popup-action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.btn-confirm-queue-cta {
  width: 100%;
  height: 56px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: opacity 0.2s ease, transform 0.1s ease;
}

.btn-confirm-queue-cta:hover {
  opacity: 0.88;
}

.btn-confirm-queue-cta:active {
  transform: scale(0.99);
}

.btn-cancel-queue-cta {
  width: 100%;
  height: 56px;
  background-color: #FFFFFF;
  color: #000000;
  border: 1px solid #000000;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: background-color 0.15s ease;
}

.btn-cancel-queue-cta:hover {
  background-color: #F9FAFB;
}

.btn-cancel-queue-cta:active {
  transform: scale(0.99);
}

/* ANALYTICS & WHATSAPP MODAL */
.analytics-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.analytics-modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 680px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.analytics-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-chart-icon {
  width: 20px;
  height: 20px;
}

.analytics-modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.analytics-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-pill-card {
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 10px;
  font-weight: 700;
  color: #6B7280;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
}

.whatsapp-logs-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.logs-heading {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
  margin: 0;
}

.logs-list {
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-row {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-phone {
  font-size: 12px;
  font-weight: 700;
}

.log-badge {
  font-size: 10px;
  font-weight: 700;
  color: #304D2B;
}

.log-msg {
  font-size: 12px;
  color: #4B5563;
  margin: 0;
}

.log-time {
  font-size: 10px;
  color: #9CA3AF;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.modal-close-btn {
  background-color: #111827;
  color: #FFFFFF;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Comprehensive Responsive Rules for iPads, Tablets & Desktops */
@media (max-width: 960px) and (orientation: portrait) {
  .engraver-screen {
    height: auto;
    min-height: 100dvh;
    overflow-y: auto;
  }
  .dashboard-body {
    overflow: visible;
  }
  .machines-and-queue-grid {
    flex-direction: column;
    height: auto;
  }
  .machines-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  .machine-card {
    min-height: 500px;
    height: auto;
  }
  .queue-sidebar {
    width: 100%;
    height: auto;
  }
  .upcoming-scrollable-container {
    max-height: 480px;
  }
}

/* Compact Landscape Viewports (iPad 10.2", 10.9", 11", 1024x768, 1280x800) */
@media (max-height: 820px) and (min-width: 860px) {
  .dashboard-header {
    height: 56px;
    padding: 10px 18px;
  }
  .dashboard-body {
    padding: 10px 16px;
  }
  .machines-and-queue-grid {
    gap: 14px;
  }
  .machines-grid {
    gap: 14px;
  }
  .machine-card {
    padding: 12px;
  }
  .product-visualizer-container {
    flex: 1;
    min-height: 0;
    padding: 4px 0;
  }
  .card-content-pane {
    gap: 8px;
    padding-top: 6px;
  }
  .font-engraving-box {
    padding: 8px 10px;
  }
  .machine-cta-btn {
    height: 42px;
    font-size: 13px;
  }
  .queue-sidebar {
    gap: 12px;
  }
  .add-to-queue-card {
    padding: 12px 14px;
    gap: 8px;
  }
  .intake-input {
    height: 40px;
  }
  .intake-confirm-btn {
    height: 38px;
  }
  .upcoming-list-card {
    padding: 12px 14px;
  }
  .upcoming-item-card {
    padding: 10px 12px;
    gap: 4px;
  }
}
</style>
