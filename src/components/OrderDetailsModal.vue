<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click="$emit('close')">
        <div class="modal-sheet" @click.stop>
          <div class="sheet-handle"></div>
          
          <div class="modal-header">
            <h3 class="modal-title">Order Details</h3>
            <button class="close-btn" @click="$emit('close')">✕</button>
          </div>

          <div class="modal-body">
            <div v-if="order" class="order-summary">
              <div class="info-row">
                <span class="label">Ticket ID:</span>
                <span class="value font-bold">#{{ order.short_code }}</span>
              </div>
              <div class="info-row">
                <span class="label">Customer Name:</span>
                <span class="value font-bold">{{ order.customer_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span>
                <span class="value">{{ order.phone }}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span class="status-badge" :class="order.status">{{ formatStatus(order.status) }}</span>
              </div>

              <div class="items-divider"></div>
              <h4 class="items-title">Custom Engravings ({{ order.items ? order.items.length : 0 }})</h4>

              <div class="items-list">
                <div 
                  v-for="(item, idx) in order.items" 
                  :key="item.id || idx" 
                  class="order-item-card"
                >
                  <div class="item-engraving" :class="item.fontClass">
                    {{ item.text }}
                  </div>
                  <div class="item-specs">
                    {{ item.size }} {{ item.model }} • Position {{ item.position }} • Font: {{ item.font }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="done-btn" @click="$emit('close')">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    default: null
  }
});

defineEmits(['close']);

function formatStatus(status) {
  switch (status) {
    case 'pending_dropoff': return 'Pending Drop-off';
    case 'in_queue': return 'In Queue';
    case 'engraving_in_progress': return 'Engraving in Progress';
    case 'ready_for_pickup': return 'Ready for Pickup';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  max-width: 430px;
  background: var(--color-bg-white);
  border-radius: 20px 20px 0 0;
  padding: 12px 24px 32px 24px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.2);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background-color: #d1d5db;
  border-radius: 2px;
  margin: 0 auto 16px auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-title {
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-black);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-gray-medium);
  background: #f3f4f6;
  border-radius: 50%;
}

.modal-body {
  overflow-y: auto;
  flex: 1;
  padding-right: 4px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  border-bottom: 1px solid #f3f4f6;
}

.label {
  color: var(--color-gray-medium);
}

.value {
  color: var(--color-black);
}

.font-bold {
  font-weight: 600;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending_dropoff { background: #fef3c7; color: #92400e; }
.status-badge.in_queue { background: #e0e7ff; color: #3730a3; }
.status-badge.engraving_in_progress { background: #dbeafe; color: #1e40af; }
.status-badge.ready_for_pickup { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }

.items-divider {
  margin: 20px 0 16px 0;
  height: 1px;
  background: #e5e7eb;
}

.items-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item-card {
  background: var(--color-gray-bg);
  border: 1px solid var(--color-gray-border);
  border-radius: 8px;
  padding: 12px 16px;
}

.item-engraving {
  font-size: 24px;
  color: var(--color-black);
  margin-bottom: 4px;
}

.item-specs {
  font-size: 12px;
  color: var(--color-gray-medium);
}

.modal-footer {
  margin-top: 20px;
}

.done-btn {
  width: 100%;
  height: 44px;
  background: var(--color-black);
  color: var(--color-bg-white);
  border-radius: 8px;
  font-weight: 500;
  font-size: 14px;
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-sheet {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-enter-from .modal-sheet {
  transform: translateY(100%);
}
</style>
