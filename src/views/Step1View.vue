<template>
  <div class="step-page step1-view">
    <main class="page-container">
      <!-- Step 1 Content matching Figma node 4:301 -->
      <div class="step-content">
        <StepHeader stepNumber="Step 1" title="Select Your Stanley" />

        <!-- Product Card Carousel (Fills Screen Width) -->
        <div class="product-card">
          <div class="carousel-row">
            <button 
              class="nav-arrow" 
              @click="prevModel" 
              aria-label="Previous model"
            >
              <img src="/src/assets/icons/arrow-left.svg" alt="Prev" class="arrow-icon" />
            </button>

            <div class="product-image-wrap">
              <img 
                :src="currentModel.image" 
                :alt="currentModel.name" 
                class="product-image"
              />
            </div>

            <button 
              class="nav-arrow" 
              @click="nextModel" 
              aria-label="Next model"
            >
              <img src="/src/assets/icons/arrow-left.svg" alt="Next" class="arrow-icon arrow-right-flipped" />
            </button>
          </div>

          <h3 class="product-name">{{ currentModel.name }}</h3>

          <!-- Size Selector Buttons (Unselected by default) -->
          <div class="size-toggles">
            <button
              v-for="size in currentModel.sizes"
              :key="size"
              class="size-btn"
              :class="{ 'is-active': selectedSize === size }"
              @click="selectSize(size)"
            >
              {{ size }}
            </button>
          </div>
        </div>
      </div>

      <!-- Bottom Next CTA (Fill color #D2D2D2 when inactive) -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StepHeader from '../components/StepHeader.vue';
import CTAButton from '../components/CTAButton.vue';
import { useEngravingStore, CUP_MODELS, getCatalogCupModels, fetchCatalogCupModels } from '../store/engravingStore';

const router = useRouter();
const route = useRoute();
const engravingStore = useEngravingStore();

const cupModels = ref(getCatalogCupModels());
const currentModelIndex = ref(0);
const currentModel = computed(() => cupModels.value[currentModelIndex.value] || cupModels.value[0] || CUP_MODELS[0]);
const selectedSize = computed(() => engravingStore.currentItem.size);

// Requires size to be selected explicitly
const isStepValid = computed(() => Boolean(engravingStore.currentItem.model && engravingStore.currentItem.size));

let eventSource = null;

async function syncCatalogModels() {
  const models = await fetchCatalogCupModels();
  if (Array.isArray(models) && models.length > 0) {
    cupModels.value = models;
    const idx = cupModels.value.findIndex(m => m.name === engravingStore.currentItem.model);
    if (idx !== -1) {
      currentModelIndex.value = idx;
    } else {
      engravingStore.setModel(currentModel.value.name, currentModel.value.shortName);
    }
  }
}

onMounted(async () => {
  if (route.params.storeId) {
    engravingStore.setStoreId(route.params.storeId);
  }
  await syncCatalogModels();

  if (typeof EventSource !== 'undefined') {
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('products_updated', () => {
        syncCatalogModels();
      });
      eventSource.addEventListener('settings_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && data.key === 'products') {
            syncCatalogModels();
          }
        } catch (err) {}
      });
    } catch (e) {}
  }

  window.addEventListener('stanley_products_updated', syncCatalogModels);
  window.addEventListener('storage', (e) => {
    if (e.key === 'stanley_product_catalog_order') {
      syncCatalogModels();
    }
  });
});

onUnmounted(() => {
  if (eventSource) eventSource.close();
  window.removeEventListener('stanley_products_updated', syncCatalogModels);
});

function selectSize(size) {
  engravingStore.setSize(size);
  engravingStore.setModel(currentModel.value.name, currentModel.value.shortName);
}

function updateModelSelection() {
  const model = currentModel.value;
  engravingStore.setModel(model.name, model.shortName);
  // Reset size if previously selected size is not in this model's size options
  if (!model.sizes.includes(engravingStore.currentItem.size)) {
    engravingStore.setSize('');
  }
}

function nextModel() {
  const total = cupModels.value.length;
  currentModelIndex.value = (currentModelIndex.value + 1) % (total || 1);
  updateModelSelection();
}

function prevModel() {
  const total = cupModels.value.length;
  currentModelIndex.value = (currentModelIndex.value - 1 + (total || 1)) % (total || 1);
  updateModelSelection();
}

function goNext() {
  if (isStepValid.value) {
    const storeId = route.params.storeId || engravingStore.selectedStoreId;
    if (storeId) {
      router.push(`/engrave/${storeId}/step-2`);
    } else {
      router.push('/step-2');
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

/* Product Card Composition (Figma 4:301) */
.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  margin: auto 0;
  min-height: 0;
}

.carousel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.nav-arrow {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background var(--transition-fast), transform var(--transition-fast);
  flex-shrink: 0;
  padding: 0;
}

.nav-arrow:active {
  transform: scale(0.92);
}

.nav-arrow:hover {
  background: rgba(0, 0, 0, 0.05);
}

.arrow-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.arrow-right-flipped {
  transform: scaleX(-1);
}

.product-image-wrap {
  width: 100%;
  flex: 1;
  height: clamp(190px, 30vh, 290px);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.product-image {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.08));
}

.product-name {
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 400;
  color: var(--color-black);
  text-align: center;
  line-height: 16px;
  margin-top: 16px;
}

.size-toggles {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 8px;
}

.size-btn {
  width: 57px;
  height: 28px;
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
}

.size-btn.is-active {
  background-color: var(--color-black);
  color: var(--color-bg-white);
}

.bottom-action {
  margin-top: auto;
  padding-top: 24px;
  width: 100%;
}
</style>
