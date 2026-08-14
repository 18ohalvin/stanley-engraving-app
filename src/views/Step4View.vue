<template>
  <div class="step-page step4-view">
    <main class="page-container">
      <div class="step-content">
        <StepHeader stepNumber="Step 4" title="Double Check Your Order" />

        <!-- Cart Items List -->
        <div class="cart-list">
          <div 
            v-for="(item, index) in items" 
            :key="item.id || index"
            class="cart-item-row fade-in"
          >
            <div class="item-main-row">
              <div class="item-text-render" :class="item.fontClass">
                {{ item.text }}
              </div>
              
              <div class="item-actions">
                <button 
                  class="action-icon-btn" 
                  @click="editItem(index)" 
                  aria-label="Edit item"
                >
                  <img src="/src/assets/icons/edit.svg" alt="Edit" class="action-icon" />
                </button>
                <button 
                  class="action-icon-btn" 
                  @click="deleteItem(index)" 
                  aria-label="Delete item"
                >
                  <img src="/src/assets/icons/trash.svg" alt="Delete" class="action-icon" />
                </button>
              </div>
            </div>

            <p class="item-context-spec">
              {{ item.size }} {{ item.shortName || 'IceFlow' }} • Position {{ item.position }}
            </p>
          </div>

          <!-- Empty State if all deleted -->
          <div v-if="items.length === 0" class="empty-state">
            <p>No engraving items in your cart.</p>
            <CTAButton label="Start Designing" @click="addAnotherItem" />
          </div>
        </div>
      </div>

      <!-- Bottom Actions (Figma 36:1512) -->
      <div v-if="items.length > 0" class="bottom-actions">
        <CTAButton
          variant="outline"
          label="Add another one"
          @click="addAnotherItem"
        />
        <CTAButton
          label="Submit"
          :disabled="items.length === 0"
          @click="goNext"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import StepHeader from '../components/StepHeader.vue';
import CTAButton from '../components/CTAButton.vue';
import { useEngravingStore } from '../store/engravingStore';

const router = useRouter();
const engravingStore = useEngravingStore();

const items = computed(() => engravingStore.items);

function editItem(index) {
  engravingStore.editItem(index);
  router.push('/step-3');
}

function deleteItem(index) {
  engravingStore.deleteItem(index);
  if (engravingStore.items.length === 0) {
    engravingStore.resetDraft();
    router.push('/step-1');
  }
}

function addAnotherItem() {
  engravingStore.resetDraft();
  router.push('/step-1');
}

function goNext() {
  if (items.value.length > 0) {
    router.push('/step-5');
  }
}
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
  padding: var(--top-content-padding) var(--side-margin) var(--bottom-content-padding) var(--side-margin);
  display: flex;
  flex-direction: column;
  flex: 1;
  justify-content: space-between;
  gap: 32px;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  flex: 1;
  min-height: 0;
}

.cart-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
  padding-right: 4px;
  max-height: 55vh;
}

.cart-item-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.item-main-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.item-text-render {
  font-size: clamp(24px, 3.8vh, 32px);
  color: var(--color-black);
  line-height: 1.2;
  word-break: break-all;
  flex: 1;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.action-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background var(--transition-fast);
}

.action-icon-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.action-icon {
  width: 22px;
  height: 22px;
}

.item-context-spec {
  font-family: var(--font-brand);
  font-size: 12px;
  color: var(--color-black);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bottom-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  width: 100%;
}
</style>
