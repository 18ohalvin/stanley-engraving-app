<template>
  <div class="customer-dashboard-screen">
    <!-- Top Header (Figma 61:801) -->
    <header class="dashboard-header">
      <div class="header-inner">
        <div class="header-titles">
          <img 
            src="/src/assets/images/logo-black.png" 
            alt="Stanley 1913" 
            class="stanley-logo" 
          />
          <h1 class="station-heading">ENGRAVING STATION</h1>
          <div class="header-divider"></div>
          <p class="store-location">STANLEY PONDOK INDAH MALL 5</p>
        </div>

        <div class="header-actions">
          <!-- Date Picker Button (Figma 111:905) -->
          <button 
            type="button" 
            class="header-date-picker-btn"
            @click="openDatePickerModal"
            :title="'Filter by date: ' + formattedSelectedDate"
          >
            <svg class="calendar-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span class="date-picker-label">{{ formattedSelectedDate }}</span>
            <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <router-link to="/engraver" class="back-station-btn">
            <span class="back-arrow">‹</span>
            <span>Back to Home</span>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content Area (Figma 31:1431 & 87:393) -->
    <main class="dashboard-body">
      <div class="dashboard-content-wrap">

        <!-- MACHINE STATUS SECTION (Figma 87:393) -->
        <section class="machine-status-section">
          <div class="section-header-row">
            <div class="section-title-group">
              <h2 class="section-heading">MACHINE STATUS</h2>
              <p class="section-subheading">Turn machines on or off to control engraving operations</p>
            </div>
          </div>

          <div class="status-machines-grid">
            <div 
              v-for="machine in queueStore.machines" 
              :key="machine.id"
              class="machine-status-card"
              :class="{ 'is-offline-card': machine.isActive === false }"
            >
              <!-- Card Header: Title + Toggle Switch -->
              <div class="machine-status-header">
                <span class="status-machine-title" :class="{ 'is-title-dimmed': machine.isActive === false }">
                  {{ machine.name }}
                </span>
                
                <!-- Toggle Switch (Figma 87:406 & 87:443) -->
                <button 
                  type="button"
                  class="machine-toggle-switch"
                  :class="{ 'is-active': machine.isActive !== false }"
                  @click="queueStore.toggleMachineActive(machine.id)"
                  :title="'Turn ' + machine.name + (machine.isActive !== false ? ' Off' : ' On')"
                  role="switch"
                  :aria-checked="machine.isActive !== false"
                >
                  <span class="toggle-knob"></span>
                </button>
              </div>

              <!-- Card Body: Image + Meta -->
              <div class="machine-status-body" :class="{ 'is-body-dimmed': machine.isActive === false }">
                <div class="machine-img-box">
                  <img 
                    src="/src/assets/images/laser-machine.png" 
                    :alt="machine.name" 
                    class="machine-visual-img" 
                  />
                </div>

                <div class="machine-meta-group">
                  <div class="meta-item">
                    <span class="meta-item-label">Status</span>
                    <span 
                      class="meta-item-status"
                      :class="machine.isActive === false ? 'text-offline' : (machine.status === 'engraving' ? 'text-engraving' : 'text-ready')"
                    >
                      {{ machine.isActive === false ? 'Offline' : (machine.status === 'engraving' ? 'Engraving' : 'Ready') }}
                    </span>
                  </div>

                  <div class="meta-item">
                    <span class="meta-item-label">Current Job</span>
                    <span class="meta-item-job">
                      {{ machine.isActive === false ? '-' : (getCurrentJobCode(machine) || '-') }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- CUSTOMER LIST SECTION (Figma 31:1431) -->
        <section class="customer-list-container">
          
          <div class="page-title-row">
            <h2 class="customer-list-title">CUSTOMER LIST</h2>
            <div class="search-and-stats">
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Search by name, ID, phone..." 
                class="search-input"
              />
              <span class="total-badge">Total: {{ displayedRows.length }}</span>
            </div>
          </div>

          <!-- Customer List Table (Figma 37:1908) -->
          <div class="table-card">
          <div class="table-responsive">
            <table class="customer-table">
              <thead>
                <tr class="table-header-row">
                  <th class="col-no">No</th>
                  <th class="col-name">Nama</th>
                  <th class="col-id">ID</th>
                  <th class="col-email">Email</th>
                  <th class="col-wa">WhatsApp</th>
                  <th class="col-stanley">Stanley</th>
                  <th class="col-position">Position</th>
                  <th class="col-custom">Custom</th>
                  <th class="col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(row, index) in displayedRows" 
                  :key="row.rowKey"
                  class="table-data-row fade-in"
                >
                  <!-- No -->
                  <td class="cell-no">{{ index + 1 }}</td>

                  <!-- Nama -->
                  <td class="cell-name font-medium">{{ row.customer_name }}</td>

                  <!-- Ticket ID (EG-XXXX) -->
                  <td class="cell-id">
                    <span class="id-tag">{{ formatTicketId(row) }}</span>
                  </td>

                  <!-- Email -->
                  <td class="cell-email">{{ row.email || '—' }}</td>

                  <!-- WhatsApp -->
                  <td class="cell-wa">{{ row.phone }}</td>

                  <!-- Stanley Model & Size -->
                  <td class="cell-stanley">
                    {{ formatStanleyModel(row.item) }}
                  </td>

                  <!-- Position (Horizontal / Vertical) -->
                  <td class="cell-position">
                    <span class="position-badge" :class="{ 'is-vertical': row.item?.position === 'Vertical' }">
                      {{ row.item?.position || 'Horizontal' }}
                    </span>
                  </td>

                  <!-- Custom Text with Live Typography Font Rendering (Figma 77:605) -->
                  <td class="cell-custom">
                    <span 
                      class="custom-rendered-text"
                      :class="row.item?.fontClass || 'font-engraving-lato'"
                    >
                      {{ row.item?.text || 'STANLEY' }}
                    </span>
                  </td>

                  <!-- Action Buttons (Figma 77:1125) -->
                  <td class="cell-action">
                    <div class="action-buttons-wrap">
                      <!-- Edit Button -->
                      <button 
                        class="action-btn edit-btn" 
                        title="Edit Customer Details"
                        @click="openEditModal(row)"
                      >
                        <img src="/src/assets/icons/edit.svg" alt="Edit" class="btn-icon" />
                      </button>

                      <!-- Delete Button -->
                      <button 
                        class="action-btn delete-btn" 
                        title="Delete Order"
                        @click="openDeleteModal(row)"
                      >
                        <img src="/src/assets/icons/trash.svg" alt="Delete" class="btn-icon delete-icon" />
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Empty State -->
                <tr v-if="displayedRows.length === 0">
                  <td colspan="9" class="empty-table-cell">
                    <div class="empty-table-content">
                      <p class="empty-title">No customer orders found</p>
                      <span class="empty-subtitle">
                        {{ filterMode !== 'all' ? `No orders recorded for ${formattedSelectedDate}.` : 'No matching records in the database.' }}
                      </span>
                      <button 
                        v-if="filterMode !== 'all'" 
                        type="button" 
                        class="btn-reset-filter"
                        @click="clearDateFilter"
                      >
                        Show All Time Orders
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </section>

      </div>
    </main>

    <!-- EDIT ORDER MODAL -->
    <Teleport to="body">
      <div v-if="showEditModal && editingOrder" class="modal-backdrop" @click="showEditModal = false">
        <div class="edit-modal-card fade-in" @click.stop>
          <div class="modal-header">
            <h3>Edit Customer Order</h3>
            <button class="close-x" @click="showEditModal = false">✕</button>
          </div>

          <form @submit.prevent="saveEditOrder" class="edit-form">
            <div class="form-group">
              <label>Customer Name</label>
              <input type="text" v-model="editForm.customer_name" required class="modal-input" />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>WhatsApp Phone</label>
                <input type="tel" v-model="editForm.phone" required class="modal-input" />
              </div>
              <div class="form-group flex-1">
                <label>Email</label>
                <input type="email" v-model="editForm.email" class="modal-input" />
              </div>
            </div>

            <div class="form-group">
              <label>Custom Engraving Text (Max 7 chars)</label>
              <input 
                type="text" 
                v-model="editForm.text" 
                maxlength="7" 
                required 
                class="modal-input uppercase-text"
              />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label>Font Style</label>
                <select v-model="editForm.fontId" class="modal-select" @change="handleFontChange">
                  <option v-for="f in fontOptions" :key="f.id" :value="f.id">
                    {{ f.name }}
                  </option>
                </select>
              </div>

              <div class="form-group flex-1">
                <label>Placement Position</label>
                <select v-model="editForm.position" class="modal-select">
                  <option value="Horizontal">Horizontal</option>
                  <option value="Vertical">Vertical</option>
                </select>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="showEditModal = false">Cancel</button>
              <button type="submit" class="btn-save">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- DELETE CONFIRMATION MODAL -->
    <Teleport to="body">
      <div v-if="showDeleteModal && deletingOrder" class="modal-backdrop" @click="showDeleteModal = false">
        <div class="delete-modal-card fade-in" @click.stop>
          <div class="delete-icon-circle">🗑️</div>
          <h3>Delete Customer Order?</h3>
          <p class="delete-desc">
            Are you sure you want to remove <strong>{{ deletingOrder.customer_name }}</strong>'s order ({{ formatTicketId(deletingOrder) }})? This action cannot be undone.
          </p>

          <div class="modal-actions">
            <button class="btn-cancel" @click="showDeleteModal = false">Cancel</button>
            <button class="btn-confirm-delete" @click="confirmDelete">Delete Order</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- GOOGLE STANDARD ADVANCED DATE PICKER MODAL -->
    <Teleport to="body">
      <div v-if="showDatePickerModal" class="date-modal-backdrop" @click="showDatePickerModal = false">
        <div class="date-picker-dialog fade-in" @click.stop>
          
          <!-- LEFT / SIDEBAR PANE IN LANDSCAPE (Header + Presets + Clear Button) -->
          <div class="dialog-sidebar-pane">
            <!-- Dialog Top Header -->
            <div class="dialog-header">
              <div class="dialog-title-block">
                <span class="dialog-super-title">SELECT DATE</span>
                <h3 class="dialog-selected-headline">{{ dialogHeadlineDate }}</h3>
              </div>
              <button class="dialog-close-x close-mobile-only" @click="showDatePickerModal = false" aria-label="Close">✕</button>
            </div>

            <!-- Quick Presets Bar (Google Material Style) -->
            <div class="date-presets-bar">
              <button 
                type="button"
                v-for="preset in datePresets" 
                :key="preset.id"
                class="preset-chip"
                :class="{ 'is-active': tempActivePreset === preset.id }"
                @click="applyPreset(preset.id)"
              >
                {{ preset.label }}
              </button>
            </div>

            <!-- Landscape Sidebar Quick Clear Action -->
            <div class="sidebar-clear-wrap">
              <button 
                type="button" 
                class="btn-text-clear" 
                @click="clearDateFilter"
              >
                Show All Time
              </button>
            </div>
          </div>

          <!-- RIGHT / CALENDAR PANE IN LANDSCAPE (Month Nav + Calendar Grid + Actions) -->
          <div class="dialog-calendar-pane">
            <!-- Calendar Top Bar with Navigation & Desktop Close -->
            <div class="calendar-top-bar">
              <!-- Calendar Navigator (Month & Year + Nav Controls) -->
              <div class="calendar-nav-row">
                <span class="current-month-year">{{ currentMonthYearLabel }}</span>
                <div class="nav-arrow-group">
                  <button type="button" class="cal-nav-btn" @click="prevMonth" title="Previous Month">‹</button>
                  <button type="button" class="cal-today-btn" @click="goToToday" title="Jump to Today">Today</button>
                  <button type="button" class="cal-nav-btn" @click="nextMonth" title="Next Month">›</button>
                </div>
              </div>
              <button class="dialog-close-x close-desktop-only" @click="showDatePickerModal = false" aria-label="Close">✕</button>
            </div>

            <!-- Days Grid Header (Su Mo Tu We Th Fr Sa) -->
            <div class="cal-weekdays-row">
              <span v-for="day in ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']" :key="day" class="weekday-cell">
                {{ day }}
              </span>
            </div>

            <!-- Days Cells Grid -->
            <div class="cal-days-grid">
              <button
                type="button"
                v-for="(dayObj, idx) in calendarDays"
                :key="idx"
                class="cal-day-cell"
                :class="{
                  'is-other-month': !dayObj.isCurrentMonth,
                  'is-today': dayObj.isToday,
                  'is-selected': isDaySelected(dayObj)
                }"
                @click="selectCalendarDate(dayObj)"
                :disabled="!dayObj.isCurrentMonth && dayObj.dayNumber === null"
              >
                <span class="day-number">{{ dayObj.dayNumber }}</span>
                <span v-if="dayObj.hasOrders" class="order-dot" title="Orders recorded on this day"></span>
              </button>
            </div>

            <!-- Dialog Footer Actions -->
            <div class="dialog-footer">
              <button 
                type="button" 
                class="btn-text-clear footer-clear-btn" 
                @click="clearDateFilter"
              >
                Show All Time
              </button>
              <div class="dialog-right-actions">
                <button type="button" class="btn-dialog-cancel" @click="showDatePickerModal = false">
                  Cancel
                </button>
                <button type="button" class="btn-dialog-apply" @click="confirmDateSelection">
                  Apply
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useQueueStore } from '../store/queueStore.js';
import { FONT_OPTIONS } from '../store/engravingStore.js';

const queueStore = useQueueStore();
const searchQuery = ref('');
const fontOptions = FONT_OPTIONS;

// --- ADVANCED GOOGLE STANDARD DATE PICKER STATE ---
const showDatePickerModal = ref(false);
const filterMode = ref('today'); // 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'custom' | 'all'
const selectedDate = ref(new Date()); // Default to Today
const activePreset = ref('today');

// Calendar View State for Navigator
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());

// Temporary Dialog State before clicking Apply
const tempSelectedDate = ref(new Date());
const tempActivePreset = ref('today');

const datePresets = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'all', label: 'All Time' }
];

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function formatDateForDisplay(d) {
  if (!d) return 'All Dates';
  const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(new Date(d));
}

const formattedSelectedDate = computed(() => {
  if (filterMode.value === 'all') return 'All Dates';
  if (filterMode.value === 'today') {
    return formatDateForDisplay(selectedDate.value); // e.g. "Fri, 14 Aug 2026"
  }
  if (filterMode.value === 'yesterday') {
    return `Yesterday, ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(selectedDate.value)}`;
  }
  if (filterMode.value === 'last7') {
    return 'Last 7 Days';
  }
  if (filterMode.value === 'thisMonth') {
    return 'This Month';
  }
  return formatDateForDisplay(selectedDate.value);
});

const dialogHeadlineDate = computed(() => {
  if (tempActivePreset.value === 'all') return 'All Time';
  if (tempActivePreset.value === 'last7') return 'Last 7 Days';
  if (tempActivePreset.value === 'thisMonth') return 'This Month';
  if (!tempSelectedDate.value) return 'All Dates';
  return formatDateForDisplay(tempSelectedDate.value);
});

const currentMonthYearLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1);
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d);
});

function openDatePickerModal() {
  tempSelectedDate.value = selectedDate.value ? new Date(selectedDate.value) : new Date();
  tempActivePreset.value = activePreset.value;
  if (tempSelectedDate.value) {
    viewYear.value = tempSelectedDate.value.getFullYear();
    viewMonth.value = tempSelectedDate.value.getMonth();
  }
  showDatePickerModal.value = true;
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11;
    viewYear.value--;
  } else {
    viewMonth.value--;
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0;
    viewYear.value++;
  } else {
    viewMonth.value++;
  }
}

function goToToday() {
  const now = new Date();
  viewYear.value = now.getFullYear();
  viewMonth.value = now.getMonth();
  tempSelectedDate.value = new Date(now);
  tempActivePreset.value = 'today';
}

function applyPreset(presetId) {
  tempActivePreset.value = presetId;
  const now = new Date();
  if (presetId === 'today') {
    tempSelectedDate.value = new Date(now);
    viewYear.value = now.getFullYear();
    viewMonth.value = now.getMonth();
  } else if (presetId === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    tempSelectedDate.value = y;
    viewYear.value = y.getFullYear();
    viewMonth.value = y.getMonth();
  } else if (presetId === 'last7') {
    tempSelectedDate.value = new Date(now);
  } else if (presetId === 'thisMonth') {
    tempSelectedDate.value = new Date(now);
  } else if (presetId === 'all') {
    tempSelectedDate.value = null;
  }
}

function selectCalendarDate(dayObj) {
  if (!dayObj.isCurrentMonth && dayObj.dayNumber === null) return;
  tempSelectedDate.value = new Date(dayObj.fullDate);
  const now = new Date();
  tempActivePreset.value = isSameDay(dayObj.fullDate, now) ? 'today' : 'custom';
}

function isDaySelected(dayObj) {
  if (!tempSelectedDate.value || !dayObj.fullDate) return false;
  return isSameDay(tempSelectedDate.value, dayObj.fullDate);
}

function confirmDateSelection() {
  selectedDate.value = tempSelectedDate.value ? new Date(tempSelectedDate.value) : null;
  activePreset.value = tempActivePreset.value;
  filterMode.value = tempActivePreset.value;
  showDatePickerModal.value = false;
}

function clearDateFilter() {
  tempActivePreset.value = 'all';
  tempSelectedDate.value = null;
  confirmDateSelection();
}

// Compute Days Matrix for Current Month
const calendarDays = computed(() => {
  const days = [];
  const year = viewYear.value;
  const month = viewMonth.value;
  const today = new Date();

  // First day index (0 = Sun, 1 = Mon...)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Total days in prev month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  // Leading days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const dateObj = new Date(year, month - 1, dayNum);
    days.push({
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: isSameDay(dateObj, today),
      fullDate: dateObj,
      hasOrders: false
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month, d);
    // Check if any active order was created or intake on this day
    const hasOrder = queueStore.orders.some(o => {
      const orderDate = new Date(o.created_at || o.intake_at || 0);
      return isSameDay(orderDate, dateObj);
    });

    days.push({
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isSameDay(dateObj, today),
      fullDate: dateObj,
      hasOrders: hasOrder
    });
  }

  // Trailing days to fill standard 5 or 6 weeks
  const totalCells = days.length <= 35 ? 35 : 42;
  const remaining = totalCells - days.length;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    days.push({
      dayNumber: d,
      isCurrentMonth: false,
      isToday: isSameDay(dateObj, today),
      fullDate: dateObj,
      hasOrders: false
    });
  }

  return days;
});

// Edit State
const showEditModal = ref(false);
const editingOrder = ref(null);
const editingItemIndex = ref(0);
const editForm = ref({
  customer_name: '',
  phone: '',
  email: '',
  text: '',
  font: 'Helvetica Bold',
  fontId: 'lato',
  fontClass: 'font-engraving-lato',
  position: 'Horizontal'
});

// Delete State
const showDeleteModal = ref(false);
const deletingOrder = ref(null);

onMounted(() => {
  queueStore.refreshFromStorage();
});

function formatTicketId(rowOrOrder) {
  if (!rowOrOrder) return '0001';
  if (rowOrOrder.system_queue_number) {
    return rowOrOrder.system_queue_number;
  }
  if (rowOrOrder.short_code && /^\d{4}$/.test(rowOrOrder.short_code)) {
    return rowOrOrder.short_code;
  }
  const pos = rowOrOrder.queue_position ? String(rowOrOrder.queue_position).padStart(4, '0') : (rowOrOrder.short_code || '0001');
  return pos;
}

function getCurrentJobCode(machine) {
  if (!machine || !machine.currentOrderId) return '-';
  const order = queueStore.getAssignedOrder(machine);
  if (!order) return '-';
  return formatTicketId(order);
}

// Transform orders into flat rows per engraved cup for exact Figma 31:1430 layout
const allRows = computed(() => {
  const rows = [];
  for (const order of queueStore.orders) {
    if (order.status === 'cancelled') continue;
    const items = order.items || [{}];
    items.forEach((item, itemIdx) => {
      rows.push({
        rowKey: `${order.order_id}-${itemIdx}`,
        order_id: order.order_id,
        system_queue_number: order.system_queue_number,
        short_code: order.short_code,
        intake_code: order.intake_code,
        queue_position: order.queue_position,
        customer_name: order.customer_name,
        phone: order.phone,
        email: order.email,
        status: order.status,
        item,
        itemIndex: itemIdx,
        rawOrder: order
      });
    });
  }
  return rows;
});

const displayedRows = computed(() => {
  let rows = allRows.value;

  // 1. Date Filter (Defaults to Today, or selected preset / custom date)
  if (filterMode.value === 'today' && selectedDate.value) {
    rows = rows.filter(r => {
      const orderDate = new Date(r.rawOrder?.created_at || r.rawOrder?.intake_at || 0);
      return isSameDay(orderDate, selectedDate.value);
    });
  } else if (filterMode.value === 'yesterday' && selectedDate.value) {
    rows = rows.filter(r => {
      const orderDate = new Date(r.rawOrder?.created_at || r.rawOrder?.intake_at || 0);
      return isSameDay(orderDate, selectedDate.value);
    });
  } else if (filterMode.value === 'last7') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    rows = rows.filter(r => {
      const orderDate = new Date(r.rawOrder?.created_at || r.rawOrder?.intake_at || 0);
      return orderDate >= cutoff;
    });
  } else if (filterMode.value === 'thisMonth') {
    const now = new Date();
    rows = rows.filter(r => {
      const orderDate = new Date(r.rawOrder?.created_at || r.rawOrder?.intake_at || 0);
      return orderDate.getFullYear() === now.getFullYear() && orderDate.getMonth() === now.getMonth();
    });
  } else if (filterMode.value === 'custom' && selectedDate.value) {
    rows = rows.filter(r => {
      const orderDate = new Date(r.rawOrder?.created_at || r.rawOrder?.intake_at || 0);
      return isSameDay(orderDate, selectedDate.value);
    });
  }

  // 2. Search Query Filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    rows = rows.filter(r => 
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      formatTicketId(r).toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q)) ||
      (r.item?.text && r.item.text.toLowerCase().includes(q)) ||
      (r.item?.position && r.item.position.toLowerCase().includes(q))
    );
  }

  return rows;
});

function formatStanleyModel(item) {
  if (!item) return 'Quencher 30 Oz';
  const size = item.size || '30oz';
  const model = item.model || 'Quencher';
  if (model.toLowerCase().includes('iceflow')) {
    return `IceFlow ${size}`;
  }
  return `Quencher ${size}`;
}

function openEditModal(row) {
  editingOrder.value = row.rawOrder;
  editingItemIndex.value = row.itemIndex;
  const item = row.item || {};

  editForm.value = {
    customer_name: row.customer_name,
    phone: row.phone,
    email: row.email || '',
    text: item.text || '',
    font: item.font || 'Helvetica Bold',
    fontId: item.fontId || 'lato',
    fontClass: item.fontClass || 'font-engraving-lato',
    position: item.position || 'Horizontal'
  };

  showEditModal.value = true;
}

function handleFontChange() {
  const found = fontOptions.find(f => f.id === editForm.value.fontId);
  if (found) {
    editForm.value.font = found.name;
    editForm.value.fontClass = found.fontClass;
  }
}

function saveEditOrder() {
  if (!editingOrder.value) return;

  const updatedItems = [...(editingOrder.value.items || [])];
  if (updatedItems[editingItemIndex.value]) {
    updatedItems[editingItemIndex.value] = {
      ...updatedItems[editingItemIndex.value],
      text: editForm.value.text.trim().toUpperCase(),
      font: editForm.value.font,
      fontId: editForm.value.fontId,
      fontClass: editForm.value.fontClass,
      position: editForm.value.position || 'Horizontal'
    };
  }

  queueStore.updateOrder(editingOrder.value.order_id, {
    customer_name: editForm.value.customer_name.trim(),
    phone: editForm.value.phone.trim(),
    email: editForm.value.email.trim() || undefined,
    items: updatedItems
  });

  showEditModal.value = false;
  editingOrder.value = null;
}

function openDeleteModal(row) {
  deletingOrder.value = row.rawOrder;
  showDeleteModal.value = true;
}

function confirmDelete() {
  if (deletingOrder.value) {
    queueStore.deleteOrder(deletingOrder.value.order_id);
  }
  showDeleteModal.value = false;
  deletingOrder.value = null;
}
</script>

<style scoped>
.customer-dashboard-screen {
  width: 100vw;
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  color: #111827;
  font-family: var(--font-brand);
  overflow-x: hidden;
}

/* Header (Figma 61:801) */
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
}

/* Date Picker Button (Figma 111:905 & Matching Logout Outline Style) */
.header-date-picker-btn {
  background-color: #FFFFFF;
  border: 1px solid #000000;
  border-radius: 8px;
  height: 40px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  color: #000000;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.header-date-picker-btn:hover {
  background-color: #F9FAFB;
}

.header-date-picker-btn:active {
  transform: scale(0.99);
}

.calendar-icon {
  width: 16px;
  height: 16px;
  color: #000000;
  flex-shrink: 0;
}

.date-picker-label {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 400;
  color: #000000;
  white-space: nowrap;
}

.chevron-icon {
  width: 12px;
  height: 12px;
  color: #000000;
  flex-shrink: 0;
}

/* Back to Home Button */
.back-station-btn {
  background-color: #000000;
  color: #FFFFFF;
  border: 1px solid #000000;
  height: 40px;
  padding: 0 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 400;
  text-decoration: none;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.back-station-btn:hover {
  opacity: 0.88;
}

.back-station-btn:active {
  transform: scale(0.99);
}

.back-arrow {
  font-size: 16px;
  line-height: 1;
  font-weight: 400;
  font-family: var(--font-brand);
}

/* Dashboard Body */
.dashboard-body {
  padding: clamp(16px, 2vw, 24px);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.dashboard-content-wrap {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Machine Status Section (Figma 87:393) */
.machine-status-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.section-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-heading {
  font-size: 14px;
  font-weight: 700;
  color: #121417;
  text-transform: uppercase;
  margin: 0;
  letter-spacing: 0.3px;
}

.section-subheading {
  font-size: 12px;
  color: #495057;
  margin: 0;
}

.status-machines-grid {
  display: flex;
  gap: 16px;
  align-items: stretch;
  flex-wrap: wrap;
}

.machine-status-card {
  background-color: #FFFFFF;
  border: 1px solid #E9ECEF;
  border-radius: 16px;
  padding: 24px;
  width: 306px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.machine-status-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.status-machine-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #121417;
  transition: opacity 0.2s ease;
}

.status-machine-title.is-title-dimmed {
  opacity: 0.5;
}

/* Toggle Switch (Figma 87:406 & 87:443) */
.machine-toggle-switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background-color: #ADB5BD;
  border: none;
  cursor: pointer;
  position: relative;
  padding: 2px;
  display: flex;
  align-items: center;
  transition: background-color 0.2s ease;
}

.machine-toggle-switch.is-active {
  background-color: #000000;
}

.toggle-knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #FFFFFF;
  display: block;
  transform: translateX(0);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.machine-toggle-switch.is-active .toggle-knob {
  transform: translateX(20px);
}

.machine-status-body {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  transition: opacity 0.2s ease;
}

.machine-status-body.is-body-dimmed {
  opacity: 0.3;
}

.machine-img-box {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  border: 1px solid #E9ECEF;
  background-color: #F8F9FA;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.machine-visual-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 4px;
}

.machine-meta-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-item-label {
  font-size: 12px;
  color: #868E96;
  font-weight: 400;
}

.meta-item-status {
  font-size: 14px;
  font-weight: 700;
}

.meta-item-status.text-ready,
.meta-item-status.text-engraving {
  color: #2B8A3E;
}

.meta-item-status.text-offline {
  color: #121417;
}

.meta-item-job {
  font-size: 14px;
  font-weight: 700;
  color: #121417;
}

/* Customer List Section */
.customer-list-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.customer-list-title {
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #121417;
  margin: 0;
  letter-spacing: 0.3px;
}

.search-and-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  height: 40px;
  width: 260px;
  padding: 0 14px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

.search-input:focus {
  border-color: #111827;
}

.total-badge {
  font-size: 13px;
  font-weight: 600;
  color: #6B7280;
  background-color: #F3F4F6;
  padding: 8px 12px;
  border-radius: 6px;
}

/* Table Card (Figma 37:1908) */
.table-card {
  background-color: #FFFFFF;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  overflow: hidden;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
}

.customer-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.table-header-row th {
  background-color: #F9FAFB;
  color: #6B7280;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
  white-space: nowrap;
}

.table-data-row td {
  padding: 16px;
  font-size: 13px;
  color: #374151;
  border-bottom: 1px solid #F3F4F6;
  vertical-align: middle;
}

.table-data-row:hover {
  background-color: #FAFAFA;
}

.col-no { width: 50px; }
.col-name { min-width: 160px; }
.col-id { width: 110px; }
.col-email { min-width: 190px; }
.col-wa { min-width: 150px; }
.col-stanley { min-width: 150px; }
.col-position { min-width: 120px; }
.col-custom { min-width: 180px; }
.col-action { width: 120px; }

.id-tag {
  font-family: inherit;
  font-weight: 700;
  color: #111827;
}

.position-badge {
  display: inline-block;
  padding: 4px 10px;
  background-color: #F3F4F6;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
}

.position-badge.is-vertical {
  background-color: #E5E7EB;
}

/* Custom Live Typography Column (Figma 77:605) */
.custom-rendered-text {
  font-size: 24px;
  line-height: 1;
  color: #111827;
  display: inline-block;
}

/* Action Buttons (Figma 77:1125) */
.action-buttons-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.action-btn:active {
  transform: scale(0.95);
}

.edit-btn {
  background-color: #F3F4F6;
}

.delete-btn {
  background-color: #FEF2F2;
}

.btn-icon {
  width: 18px;
  height: 18px;
}

.delete-icon {
  filter: invert(27%) sepia(85%) saturate(3015%) hue-rotate(345deg) brightness(92%) contrast(92%);
}

.empty-table-cell {
  text-align: center;
  padding: 48px !important;
  color: #9CA3AF;
  font-size: 14px;
}

/* MODALS */
.modal-backdrop {
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

.edit-modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F3F4F6;
  padding-bottom: 12px;
}

.modal-header h3 {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.close-x {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6B7280;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #4B5563;
}

.modal-input, .modal-select {
  height: 44px;
  padding: 0 14px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
}

.modal-input:focus, .modal-select:focus {
  border-color: #111827;
}

.uppercase-text {
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 1px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.btn-cancel {
  background-color: #F3F4F6;
  color: #374151;
  border: none;
  padding: 10px 18px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  padding: 10px 22px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.delete-modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 440px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.delete-icon-circle {
  font-size: 32px;
  background-color: #FEF2F2;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-modal-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.delete-desc {
  font-size: 13px;
  color: #6B7280;
  margin: 0;
  line-height: 1.5;
}

.btn-confirm-delete {
  background-color: #DC2626;
  color: #FFFFFF;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Empty Table State */
.empty-table-cell {
  text-align: center;
  padding: 48px 16px !important;
}

.empty-table-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.empty-subtitle {
  font-size: 13px;
  color: #6B7280;
}

.btn-reset-filter {
  margin-top: 8px;
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-reset-filter:hover {
  opacity: 0.88;
}

/* GOOGLE STANDARD ADVANCED DATE PICKER MODAL (Stanley PWA Design System) */
.date-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.date-picker-dialog {
  background-color: var(--color-bg-white, #FFFFFF);
  border: 1px solid var(--color-gray-border, #E5E7EB);
  border-radius: 12px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-brand);
  transition: all 0.2s ease;
}

.dialog-sidebar-pane {
  display: flex;
  flex-direction: column;
}

.dialog-calendar-pane {
  display: flex;
  flex-direction: column;
}

.calendar-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-desktop-only {
  display: none;
}

.close-mobile-only {
  display: flex;
}

.sidebar-clear-wrap {
  display: none;
}

.footer-clear-btn {
  display: block;
}

/* Base Styles */
.dialog-header {
  padding: 18px 20px 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-gray-border, #E5E7EB);
}

.dialog-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-super-title {
  font-family: var(--font-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--color-gray-medium, #6B7280);
  text-transform: uppercase;
}

.dialog-selected-headline {
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-black, #000000);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.dialog-close-x {
  background: var(--color-gray-bg, #F8F9FA);
  border: 1px solid var(--color-gray-border, #E5E7EB);
  font-size: 13px;
  font-weight: 700;
  color: var(--color-black, #000000);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.dialog-close-x:hover {
  background-color: #E5E7EB;
  border-color: var(--color-black, #000000);
}

.date-presets-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px 6px;
  overflow-x: auto;
}

.preset-chip {
  background-color: var(--color-gray-bg, #F8F9FA);
  border: 1px solid var(--color-gray-border, #E5E7EB);
  border-radius: 6px;
  padding: 6px 12px;
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-dark, #111827);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.preset-chip:hover {
  background-color: #E5E7EB;
  border-color: #D1D5DB;
}

.preset-chip.is-active {
  background-color: var(--color-black, #000000);
  color: #FFFFFF;
  border-color: var(--color-black, #000000);
}

.calendar-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px 8px;
  flex: 1;
}

.current-month-year {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--color-black, #000000);
}

.nav-arrow-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cal-nav-btn {
  background: #FFFFFF;
  border: 1px solid var(--color-gray-border, #E5E7EB);
  border-radius: 6px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-black, #000000);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cal-nav-btn:hover {
  background-color: var(--color-gray-bg, #F8F9FA);
  border-color: var(--color-black, #000000);
}

.cal-today-btn {
  background: transparent;
  border: 1px solid var(--color-black, #000000);
  border-radius: 6px;
  padding: 0 10px;
  height: 30px;
  font-family: var(--font-brand);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-black, #000000);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.cal-today-btn:hover {
  background-color: var(--color-black, #000000);
  color: #FFFFFF;
}

.cal-weekdays-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 16px;
  text-align: center;
}

.weekday-cell {
  font-family: var(--font-brand);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-gray-medium, #6B7280);
  letter-spacing: 0.5px;
  padding: 6px 0;
}

.cal-days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 4px 16px 14px;
  gap: 4px;
}

.cal-day-cell {
  aspect-ratio: 1;
  border-radius: 6px;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-black, #000000);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.cal-day-cell:hover:not(.is-selected) {
  background-color: var(--color-gray-bg, #F8F9FA);
}

.cal-day-cell.is-other-month {
  color: var(--color-gray-light, #ABABAB);
  opacity: 0.5;
}

.cal-day-cell.is-today:not(.is-selected) {
  border: 1.5px solid var(--color-black, #000000);
  font-weight: 700;
}

.cal-day-cell.is-selected {
  background-color: var(--color-black, #000000) !important;
  color: #FFFFFF !important;
  font-weight: 700;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.order-dot {
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #304D2B;
}

.cal-day-cell.is-selected .order-dot {
  background-color: #FFFFFF;
}

.dialog-footer {
  padding: 12px 18px;
  border-top: 1px solid var(--color-gray-border, #E5E7EB);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-gray-bg, #F8F9FA);
}

.btn-text-clear {
  background: #FFFFFF;
  border: 1px solid var(--color-gray-border, #E5E7EB);
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-dark, #111827);
  cursor: pointer;
  height: 40px;
  padding: 0 14px;
  border-radius: 8px;
  transition: all var(--transition-fast);
}

.btn-text-clear:hover {
  background-color: #F3F4F6;
  border-color: var(--color-black, #000000);
  color: var(--color-black, #000000);
}

.dialog-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-dialog-cancel {
  background: #FFFFFF;
  border: 1px solid var(--color-black, #000000);
  border-radius: 8px;
  height: 40px;
  padding: 0 16px;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-black, #000000);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-dialog-cancel:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.btn-dialog-cancel:active {
  transform: scale(0.99);
}

.btn-dialog-apply {
  background-color: var(--color-black, #000000);
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  height: 40px;
  padding: 0 20px;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--transition-fast), transform 0.1s ease;
}

.btn-dialog-apply:hover {
  opacity: 0.88;
}

.btn-dialog-apply:active {
  transform: scale(0.99);
}

/* =========================================================
   LANDSCAPE MINI TABLET & COMPACT SCREEN AUTO-LANDSCAPE POPUP 
   (e.g., iPad Mini, iPad Air landscape, 1024x768, 1280x800)
   ========================================================= */
@media (min-width: 580px) and (max-height: 820px), (min-width: 720px) and (orientation: landscape) {
  .date-picker-dialog {
    flex-direction: row;
    max-width: 590px;
    width: 92vw;
  }

  .dialog-sidebar-pane {
    width: 190px;
    flex-shrink: 0;
    background-color: var(--color-gray-bg, #F8F9FA);
    border-right: 1px solid var(--color-gray-border, #E5E7EB);
    padding: 16px 14px;
    justify-content: space-between;
  }

  .dialog-header {
    padding: 0 0 12px 0;
    border-bottom: 1px solid var(--color-gray-border, #E5E7EB);
  }

  .dialog-selected-headline {
    font-size: 16px;
  }

  .close-mobile-only {
    display: none;
  }

  .date-presets-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 0;
    gap: 6px;
    overflow-x: visible;
  }

  .preset-chip {
    width: 100%;
    text-align: left;
    padding: 7px 10px;
    font-size: 12px;
  }

  .sidebar-clear-wrap {
    display: block;
    padding-top: 10px;
    border-top: 1px solid var(--color-gray-border, #E5E7EB);
  }

  .sidebar-clear-wrap .btn-text-clear {
    width: 100%;
    text-align: center;
    height: 36px;
    font-size: 12px;
    padding: 0;
  }

  .dialog-calendar-pane {
    flex: 1;
    min-width: 0;
    background-color: #FFFFFF;
    justify-content: space-between;
  }

  .calendar-top-bar {
    padding: 12px 16px 4px;
  }

  .calendar-nav-row {
    padding: 0;
  }

  .close-desktop-only {
    display: flex;
    margin-left: 10px;
    width: 28px;
    height: 28px;
  }

  .cal-weekdays-row {
    padding: 0 14px;
  }

  .cal-days-grid {
    padding: 2px 14px 10px;
    gap: 2px;
  }

  .cal-day-cell {
    font-size: 12px;
  }

  .dialog-footer {
    padding: 10px 16px;
  }

  .footer-clear-btn {
    display: none;
  }

  .dialog-right-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .btn-dialog-cancel, .btn-dialog-apply {
    height: 36px;
    font-size: 12px;
    padding: 0 14px;
  }
}

.fade-in {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Comprehensive Responsive Rules for Tablets, iPads & Mobile */
@media (max-width: 960px) {
  .dashboard-header {
    height: auto;
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .header-titles {
    gap: 10px;
    height: auto;
  }
  .station-heading, .store-location {
    font-size: 14px;
  }
  .dashboard-body {
    padding: 16px;
  }
  .dashboard-content-wrap {
    gap: 20px;
  }
  .machines-status-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .page-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .search-and-stats {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    gap: 8px;
  }
  .search-input {
    width: 100%;
    max-width: none;
  }
}

@media (max-width: 600px) {
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .header-date-picker-btn, .back-station-btn {
    flex: 1;
    padding: 0 10px;
    font-size: 13px;
  }
}
</style>
