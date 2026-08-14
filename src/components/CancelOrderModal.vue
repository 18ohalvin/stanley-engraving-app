<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click="$emit('close')">
        <div class="modal-sheet" @click.stop>
          <div class="sheet-handle"></div>

          <!-- Headline & Warning Copy (Figma 50:279) -->
          <div class="modal-headline">
            <h2 class="modal-title">Cancel your engraving?</h2>
            <p class="modal-subtitle">
              This deletes your design and cancels your ticket. You will need to start over.
            </p>
          </div>

          <!-- Stacked Action Buttons (Figma 50:287) -->
          <div class="modal-actions">
            <button 
              class="cancel-confirm-btn" 
              @click="$emit('confirm')"
            >
              Yes, Cancel Order
            </button>
            <button 
              class="keep-order-btn" 
              @click="$emit('close')"
            >
              No, Keep My Order
            </button>
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
  }
});

defineEmits(['close', 'confirm']);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: flex-end;
}

.modal-sheet {
  width: 100%;
  max-width: var(--mobile-max-width, 430px);
  background-color: var(--color-bg, #f2f2f2);
  border-radius: 20px 20px 0 0;
  padding: 16px 32px calc(48px + env(safe-area-inset-bottom, 0px)) 32px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.15);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 2px;
  margin: 0 auto;
}

.modal-headline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modal-title {
  font-family: var(--font-brand);
  font-size: 24px;
  font-weight: 500;
  line-height: 28px;
  color: var(--color-black);
  letter-spacing: -0.72px;
}

.modal-subtitle {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
  color: var(--color-black);
  letter-spacing: -0.48px;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.cancel-confirm-btn {
  width: 100%;
  height: 48px;
  border: 1px solid var(--color-black);
  background: transparent;
  color: var(--color-black);
  border-radius: 8px;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast), transform var(--transition-fast);
}

.cancel-confirm-btn:active {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(0.99);
}

.keep-order-btn {
  width: 100%;
  height: 48px;
  border: none;
  background: var(--color-black);
  color: #ffffff;
  border-radius: 8px;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.keep-order-btn:active {
  opacity: 0.9;
  transform: scale(0.99);
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-sheet {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-leave-active .modal-sheet {
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-enter-from .modal-sheet,
.modal-fade-leave-to .modal-sheet {
  transform: translateY(100%);
}
</style>
