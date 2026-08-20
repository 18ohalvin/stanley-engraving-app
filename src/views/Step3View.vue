<template>
  <div class="step-page step3-view">
    <main class="page-container">
      <div class="step-content">
        <StepHeader stepNumber="Step 3" title="Design Your Engraving" />

        <div class="design-section">
          <!-- Live Preview Box (Horizontal or Vertical based on Step 2 selection) -->
          <div class="text-preview-box" :class="{ 'is-vertical-preview': isVertical }">
            <p 
              class="preview-rendered-text"
              :class="[selectedFontClass, { 'is-vertical': isVertical }]"
            >
              {{ enteredText || (currentFontOption?.allCaps ? 'STANLEY' : 'Stanley') }}
            </p>
          </div>

            <!-- Input Field with Max 7 Characters Limit -->
            <div class="input-container">
              <div class="input-underline-wrap" :class="{ 'has-error': hasProfanity }">
                <input
                  type="text"
                  :value="enteredText"
                  maxlength="7"
                  placeholder="Enter your text"
                  class="engraving-input"
                  @input="handleInput"
                  autocomplete="off"
                  autocorrect="off"
                  spellcheck="false"
                />
                <span class="char-counter">{{ enteredText.length }}/7</span>
              </div>

              <!-- Profanity warning -->
              <p v-if="hasProfanity" class="error-msg fade-in">
                Please avoid offensive words or inappropriate language.
              </p>
            </div>

            <!-- Font Style Selector -->
            <div class="font-selector-section">
              <p class="font-selector-title">Select Your Font Style</p>
              <div class="font-grid">
                <button
                  v-for="font in FONT_OPTIONS"
                  :key="font.id"
                  class="font-card"
                  :class="{ 'is-active': selectedFontId === font.id }"
                  @click="selectFont(font)"
                >
                  <span class="font-sample" :class="font.fontClass">
                    {{ font.label }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bottom-actions">
          <CTAButton
            variant="outline"
            label="Engrave Another Item"
            :disabled="!isStepValid"
            @click="addAnotherItem"
          />
          <CTAButton
            variant="primary"
            label="Review Order"
            :disabled="!isStepValid"
            @click="reviewOrder"
          />
        </div>
      </main>

      <!-- Intermediate Saved Modal (Figma 12:930 Customize) -->
      <Teleport to="body">
        <div v-if="showSavedModal" class="saved-modal-backdrop">
          <div class="saved-modal-card fade-in" @click.stop>
            <div class="saved-modal-header">
              <h3 class="saved-modal-title">Your item is saved!</h3>
              <p class="saved-modal-desc">
                Let's customize your next cup. You will be able to review all your items together on the final screen before submitting.
              </p>
            </div>
            <CTAButton
              label="Design Next Item"
              @click="continueToNextCup"
            />
          </div>
        </div>
      </Teleport>
    </div>
  </template>

  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import StepHeader from '../components/StepHeader.vue';
  import CTAButton from '../components/CTAButton.vue';
  import { useEngravingStore, FONT_OPTIONS } from '../store/engravingStore.js';
  import { containsProfanity } from '../utils/profanityFilter.js';

  const router = useRouter();
  const engravingStore = useEngravingStore();

  const enteredText = ref(engravingStore.currentItem.text || '');
  const selectedFontId = ref(engravingStore.currentItem.fontId || 'lato');
  const currentFontOption = computed(() => {
    return FONT_OPTIONS.find(f => f.id === selectedFontId.value) || FONT_OPTIONS[0];
  });
  const selectedFontClass = computed(() => {
    return currentFontOption.value ? currentFontOption.value.fontClass : 'font-engraving-lato';
  });

  const selectedPosition = computed(() => engravingStore.currentItem.position || 'Horizontal');
  const isVertical = computed(() => selectedPosition.value === 'Vertical');

  const showSavedModal = ref(false);

  const hasProfanity = computed(() => containsProfanity(enteredText.value));

  const isStepValid = computed(() => {
    const text = (enteredText.value || '').trim();
    return text.length > 0 && text.length <= 7 && !hasProfanity.value && Boolean(selectedFontId.value);
  });

  onMounted(() => {
    if (engravingStore.currentItem.text) {
      enteredText.value = engravingStore.currentItem.text;
    }
    if (engravingStore.currentItem.fontId) {
      selectedFontId.value = engravingStore.currentItem.fontId;
    } else {
      selectedFontId.value = 'lato';
      engravingStore.setFont(FONT_OPTIONS[0]);
    }
  });

  function handleInput(e) {
    let val = e.target.value || '';
    if (val.length > 7) {
      val = val.slice(0, 7);
    }
    if (currentFontOption.value?.allCaps) {
      val = val.toUpperCase();
    }
    enteredText.value = val;
    engravingStore.setText(enteredText.value);
  }

  function selectFont(font) {
    selectedFontId.value = font.id;
    engravingStore.setFont(font);
    if (font.allCaps && enteredText.value) {
      enteredText.value = enteredText.value.toUpperCase();
      engravingStore.setText(enteredText.value);
    }
  }

  function addAnotherItem() {
    const text = (enteredText.value || '').trim();
    if (!text || text.length > 7 || hasProfanity.value) return;
    const fontObj = FONT_OPTIONS.find(f => f.id === selectedFontId.value) || FONT_OPTIONS[0];
    engravingStore.setFont(fontObj);
    engravingStore.setText(text);
    engravingStore.saveCurrentItem();
    showSavedModal.value = true;
  }

  function continueToNextCup() {
    showSavedModal.value = false;
    engravingStore.resetDraft();
    router.push('/step-1');
  }

  function reviewOrder() {
    const text = (enteredText.value || '').trim();
    if (!text || text.length > 7 || hasProfanity.value) return;
    const fontObj = FONT_OPTIONS.find(f => f.id === selectedFontId.value) || FONT_OPTIONS[0];
    engravingStore.setFont(fontObj);
    engravingStore.setText(text);
    engravingStore.saveCurrentItem();
    router.push('/step-4');
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
  gap: 32px;
}

.design-section {
  display: flex;
  flex-direction: column;
  gap: clamp(24px, 3.8vh, 48px);
}

/* Live Typography Preview Box (Transparent / Matches Main Background) */
.text-preview-box {
  min-height: clamp(80px, 12vh, 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
  background: transparent;
  transition: min-height 0.25s ease, padding 0.25s ease;
  overflow: visible;
}

.text-preview-box.is-vertical-preview {
  min-height: clamp(200px, 30vh, 290px);
  padding: 20px 0;
}

.preview-rendered-text {
  font-size: clamp(36px, 5.5vh, 52px);
  font-weight: 700;
  color: var(--color-black);
  text-align: center;
  word-break: break-all;
  line-height: 1.1;
  letter-spacing: 2.5px;
  transition: all var(--transition-fast);
  display: inline-block;
}

.preview-rendered-text.is-vertical {
  font-size: clamp(36px, 5.5vh, 52px);
  transform: rotate(-90deg);
  transform-origin: center;
  letter-spacing: 3px;
  white-space: nowrap;
}

/* Input Container */
.input-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.input-underline-wrap {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--color-black);
  padding: 10px 4px;
  position: relative;
  transition: border-color var(--transition-fast);
}

.input-underline-wrap.has-error {
  border-bottom-color: var(--color-error);
}

.engraving-input {
  flex: 1;
  font-size: 14px;
  color: var(--color-black);
  text-align: left;
  padding-right: 36px;
}

.engraving-input::placeholder {
  color: #ababab;
  font-size: 14px;
  text-align: left;
}

.char-counter {
  position: absolute;
  right: 4px;
  font-size: 11px;
  color: var(--color-gray-light);
  font-weight: 500;
}

.char-counter.is-max {
  color: var(--color-error);
}

.profanity-warning {
  font-size: 12px;
  color: var(--color-error);
  margin-top: 4px;
  text-align: center;
}

/* Font Style Selector (Figma 4:589) */
.font-selector-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.font-selector-title {
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 400;
  color: var(--color-black);
  text-align: center;
  width: 100%;
}

.font-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  width: 100%;
}

.font-card {
  height: clamp(50px, 6.8vh, 60px);
  border-radius: 5px;
  border: 1px solid var(--color-black);
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.font-card.is-active {
  background-color: var(--color-black);
}

.font-card.is-active .font-sample {
  color: var(--color-bg-white);
}

.font-sample {
  font-size: 20px;
  color: var(--color-black);
  user-select: none;
}

/* Bottom Actions */
.bottom-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;
  width: 100%;
}

/* Saved Modal */
.saved-modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.saved-modal-card {
  width: 100%;
  max-width: 430px;
  background: var(--color-bg);
  border-radius: 20px 20px 0 0;
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  box-shadow: 0 -10px 25px rgba(0, 0, 0, 0.2);
}

.saved-modal-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-modal-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-black);
}

.saved-modal-desc {
  font-size: 15px;
  line-height: 22px;
  color: var(--color-gray-dark);
}

/* Responsive Scaling for Compact Viewports & Landscape Displays */
@media (max-height: 720px) {
  .step-content {
    gap: 16px;
  }
  .design-section {
    gap: 14px;
  }
  .text-preview-box {
    min-height: 60px;
    padding: 4px 0;
  }
  .text-preview-box.is-vertical-preview {
    min-height: 180px;
    padding: 10px 0;
  }
  .preview-rendered-text {
    font-size: clamp(28px, 4.2vh, 40px);
  }
  .preview-rendered-text.is-vertical {
    font-size: clamp(28px, 4.2vh, 40px);
  }
  .font-selector-section {
    gap: 10px;
  }
  .font-card {
    height: 46px;
  }
  .bottom-actions {
    padding-top: 10px;
    gap: 6px;
  }
}
</style>
