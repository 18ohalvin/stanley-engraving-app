<template>
  <div class="step-page step2-view">
    <main class="page-container">
      <div class="step-content">
        <StepHeader stepNumber="Step 2" title="Choose Your Placement" />

        <!-- Cup Placement Visualizer (Figma 66:845) -->
        <div class="placement-visualizer">
          <div class="cup-container">
            <img 
              :src="currentModel.placementImage || currentModel.image" 
              :alt="currentModel.name" 
              class="cup-image"
            />

            <!-- Live Text Placement Overlay on Cup -->
            <transition name="fade">
              <div 
                v-if="selectedPosition" 
                class="placement-text-overlay"
                :class="{ 'is-vertical': selectedPosition === 'Vertical' }"
              >
                TEXT
              </div>
            </transition>
          </div>

          <!-- Position Selector Buttons Horizontal / Vertical (Figma 66:845) -->
          <div class="position-toggles">
            <button
              v-for="pos in availablePositions"
              :key="pos"
              class="position-btn"
              :class="{ 'is-active': selectedPosition === pos }"
              @click="selectPosition(pos)"
            >
              {{ pos }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Next CTA -->
      <div class="bottom-action">
        <CTAButton
          label="Next"
          :disabled="!isStepValid"
          @click="goNext"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StepHeader from '../components/StepHeader.vue';
import CTAButton from '../components/CTAButton.vue';
import { useEngravingStore, CUP_MODELS, getCatalogCupModels, fetchCatalogCupModels } from '../store/engravingStore';

const router = useRouter();
const route = useRoute();
const engravingStore = useEngravingStore();

const modelsList = ref(getCatalogCupModels());

const currentModel = computed(() => {
  const models = modelsList.value.length > 0 ? modelsList.value : getCatalogCupModels();
  return models.find(m => m.name === engravingStore.currentItem.model) || models[0] || CUP_MODELS[0];
});

const availablePositions = computed(() => {
  return currentModel.value?.positions || ['Horizontal', 'Vertical'];
});

onMounted(async () => {
  if (route.params.storeId) {
    engravingStore.setStoreId(route.params.storeId);
  }
  const fresh = await fetchCatalogCupModels();
  if (Array.isArray(fresh) && fresh.length > 0) {
    modelsList.value = fresh;
  }
  if (!engravingStore.currentItem.position || !availablePositions.value.includes(engravingStore.currentItem.position)) {
    engravingStore.setPosition(availablePositions.value[0] || 'Horizontal');
  }
});

const selectedPosition = computed(() => engravingStore.currentItem.position || 'Horizontal');
const isStepValid = computed(() => Boolean(selectedPosition.value));

function selectPosition(pos) {
  engravingStore.setPosition(pos);
}

function goNext() {
  if (isStepValid.value) {
    const storeId = route.params.storeId || engravingStore.selectedStoreId;
    if (storeId) {
      router.push(`/engrave/${storeId}/step-3`);
    } else {
      router.push('/step-3');
    }
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
}

.step-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.placement-visualizer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex: 1;
  margin: auto 0;
  min-height: 0;
}

.cup-container {
  position: relative;
  width: 100%;
  max-width: 100%;
  height: clamp(240px, 42vh, 390px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  min-height: 0;
}

.cup-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.09));
}

/* Placement Text Overlay (Figma 66:841 & 66:856) */
.placement-text-overlay {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 1px;
  text-transform: uppercase;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease;
  white-space: nowrap;
}

.placement-text-overlay.is-vertical {
  transform: translate(-50%, -50%) rotate(-90deg);
}

.position-toggles {
  display: flex;
  gap: 8px;
  justify-content: center;
  width: 100%;
  margin-top: clamp(10px, 1.8vh, 16px);
}

.position-btn {
  height: 28px;
  padding: 0 16px;
  border-radius: 4px;
  border: 1px solid var(--color-black);
  background-color: transparent;
  color: var(--color-black);
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 85px;
}

.position-btn.is-active {
  background-color: var(--color-black);
  color: var(--color-bg-white);
}

.bottom-action {
  margin-top: auto;
  padding-top: clamp(12px, 2vh, 20px);
  width: 100%;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
