<template>
  <div class="step-page step5-view">
    <main class="page-container">
      <div class="step-content">
        <StepHeader stepNumber="Step 5" title="Who is this for?" />

        <form class="form-fields" @submit.prevent="submitOrder">
          <!-- Full Name Input (Figma 4:688 TextHolder) -->
          <div 
            class="stanley-text-holder"
            :class="{
              'state-error': nameTouched && !customerName.trim(),
              'state-active': isNameFocused || Boolean(customerName.trim()),
              'state-filled': !isNameFocused && Boolean(customerName.trim()),
              'state-default': !isNameFocused && !customerName.trim() && !nameTouched
            }"
          >
            <label 
              v-if="isNameFocused || Boolean(customerName.trim())" 
              class="floating-label"
            >
              Full Name*
            </label>

            <span 
              v-if="nameTouched && !customerName.trim() && !isNameFocused" 
              class="error-placeholder"
            >
              This information is required*
            </span>

            <input
              type="text"
              v-model="customerName"
              :placeholder="!isNameFocused && !nameTouched ? 'Full Name*' : ''"
              required
              class="stanley-input-element"
              @focus="isNameFocused = true; nameTouched = true"
              @blur="isNameFocused = false"
              autocomplete="name"
            />
          </div>

          <!-- Phone Number + Country Code Row -->
          <div class="phone-input-row">
            <!-- Country Code Selector Trigger -->
            <button 
              type="button" 
              class="country-code-selector" 
              @click="openCountryModal"
              aria-label="Select country calling code"
            >
              <span class="country-code-value">{{ countryCode }}</span>
              <img 
                src="/src/assets/icons/chevron-down.svg" 
                alt="Select" 
                class="chevron-icon"
                :class="{ 'is-open': isCountryModalOpen }"
              />
            </button>

            <!-- Phone Number Input (Figma 4:688 TextHolder, without leading 0) -->
            <div 
              class="stanley-text-holder phone-number-wrap"
              :class="{
                'state-error': phoneTouched && !phoneNumber.trim(),
                'state-active': isPhoneFocused || Boolean(phoneNumber.trim()),
                'state-filled': !isPhoneFocused && Boolean(phoneNumber.trim()),
                'state-default': !isPhoneFocused && !phoneNumber.trim() && !phoneTouched
              }"
            >
              <label 
                v-if="isPhoneFocused || Boolean(phoneNumber.trim())" 
                class="floating-label"
              >
                Phone Number*
              </label>

              <span 
                v-if="phoneTouched && !phoneNumber.trim() && !isPhoneFocused" 
                class="error-placeholder"
              >
                This information is required*
              </span>

              <input
                type="tel"
                v-model="phoneNumber"
                @input="handlePhoneInput"
                :placeholder="!isPhoneFocused && !phoneTouched ? 'Phone Number*' : ''"
                required
                class="stanley-input-element"
                @focus="isPhoneFocused = true; phoneTouched = true"
                @blur="isPhoneFocused = false"
                autocomplete="tel"
              />
            </div>
          </div>

          <!-- Email (Required) -->
          <div 
            class="stanley-text-holder"
            :class="{
              'state-error': emailTouched && (!email.trim() || !isEmailValid),
              'state-active': isEmailFocused || Boolean(email.trim()),
              'state-filled': !isEmailFocused && Boolean(email.trim()) && isEmailValid,
              'state-default': !isEmailFocused && !email.trim() && !emailTouched
            }"
          >
            <label 
              v-if="isEmailFocused || Boolean(email.trim())" 
              class="floating-label"
            >
              Email*
            </label>

            <span 
              v-if="emailTouched && !email.trim() && !isEmailFocused" 
              class="error-placeholder"
            >
              This information is required*
            </span>
            <span 
              v-else-if="emailTouched && Boolean(email.trim()) && !isEmailValid && !isEmailFocused" 
              class="error-placeholder"
            >
              Please enter a valid email*
            </span>

            <input
              type="email"
              v-model="email"
              :placeholder="!isEmailFocused && !emailTouched ? 'Email*' : ''"
              required
              class="stanley-input-element"
              @focus="isEmailFocused = true; emailTouched = true"
              @blur="isEmailFocused = false"
              autocomplete="email"
            />
          </div>

          <!-- Inline Legal Statement -->
          <p class="legal-statement">
            By continuing, I confirm that all custom spelling and contact details are accurate.
          </p>
        </form>
      </div>

      <!-- Submit CTA Button (Fill color #D2D2D2 when disabled) -->
      <div class="bottom-action">
        <CTAButton
          label="Submit Engraving Order"
          :disabled="!isFormValid"
          :loading="isSubmitting"
          @click="submitOrder"
        />
      </div>
    </main>

    <!-- Country Code Picker Modal (Matching Stanley UI Style) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="isCountryModalOpen" class="country-modal-backdrop" @click="closeCountryModal">
          <div class="country-modal-sheet" @click.stop>
            <div class="sheet-handle"></div>

            <div class="modal-header-row">
              <div class="modal-header-text">
                <h3 class="modal-title">Select Country</h3>
                <p class="modal-subtitle">Choose your international calling code</p>
              </div>
              <button 
                type="button" 
                class="modal-close-btn" 
                @click="closeCountryModal"
                aria-label="Close modal"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Search Input Bar -->
            <div class="country-search-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                ref="countrySearchInput"
                type="text" 
                v-model="searchQuery" 
                placeholder="Search country or code (e.g. +65, US, Japan)..." 
                class="country-search-input"
              />
              <button 
                v-if="searchQuery" 
                type="button" 
                class="clear-search-btn" 
                @click="searchQuery = ''"
                aria-label="Clear search"
              >
                ✕
              </button>
            </div>

            <!-- Scrollable Countries List -->
            <div class="countries-scroll-list">
              <!-- Popular Section (shown when no search query) -->
              <template v-if="!searchQuery.trim()">
                <div class="country-section-label">Popular</div>
                <button 
                  v-for="c in popularCountries" 
                  :key="'pop-' + c.code"
                  type="button"
                  class="country-item-row"
                  :class="{ 'is-selected': countryCode === c.dialCode }"
                  @click="selectCountry(c.dialCode)"
                >
                  <div class="country-item-left">
                    <span class="country-name">{{ c.name }}</span>
                    <span class="country-iso">{{ c.code }}</span>
                  </div>
                  <div class="country-item-right">
                    <span class="dial-code-badge">{{ c.dialCode }}</span>
                    <svg v-if="countryCode === c.dialCode" class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </button>

                <div class="country-section-label country-section-divider">All Countries</div>
              </template>

              <!-- Filtered or Full List -->
              <button 
                v-for="c in filteredCountries" 
                :key="c.code + c.dialCode"
                type="button"
                class="country-item-row"
                :class="{ 'is-selected': countryCode === c.dialCode }"
                @click="selectCountry(c.dialCode)"
              >
                <div class="country-item-left">
                  <span class="country-name">{{ c.name }}</span>
                  <span class="country-iso">{{ c.code }}</span>
                </div>
                <div class="country-item-right">
                  <span class="dial-code-badge">{{ c.dialCode }}</span>
                  <svg v-if="countryCode === c.dialCode" class="check-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </button>

              <!-- Empty State -->
              <div v-if="filteredCountries.length === 0" class="empty-search-state">
                <p>No country found matching "{{ searchQuery }}"</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StepHeader from '../components/StepHeader.vue';
import CTAButton from '../components/CTAButton.vue';
import { useEngravingStore } from '../store/engravingStore';
import { COUNTRY_CODES } from '../utils/countryCodes';

const router = useRouter();
const route = useRoute();
const engravingStore = useEngravingStore();

onMounted(() => {
  if (route.params.storeId) {
    engravingStore.setStoreId(route.params.storeId);
  }
});

const customerName = ref(engravingStore.customer.name || '');
const countryCode = ref(engravingStore.customer.countryCode || '+62');
const phoneNumber = ref(engravingStore.customer.phone || '');
const email = ref(engravingStore.customer.email || '');
const isSubmitting = ref(false);

// Country Picker Modal State
const isCountryModalOpen = ref(false);
const searchQuery = ref('');
const countrySearchInput = ref(null);

const popularCountries = computed(() => {
  return COUNTRY_CODES.filter(c => c.popular);
});

const filteredCountries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) {
    return COUNTRY_CODES;
  }
  const cleanQ = q.replace(/^\+/, '');
  return COUNTRY_CODES.filter(c => {
    const matchName = c.name.toLowerCase().includes(q);
    const matchCode = c.code.toLowerCase().includes(q);
    const matchDial = c.dialCode.toLowerCase().includes(q) || c.dialCode.replace(/^\+/, '').includes(cleanQ);
    return matchName || matchCode || matchDial;
  });
});

function openCountryModal() {
  isCountryModalOpen.value = true;
  searchQuery.value = '';
  nextTick(() => {
    if (countrySearchInput.value) {
      countrySearchInput.value.focus();
    }
  });
}

function closeCountryModal() {
  isCountryModalOpen.value = false;
  searchQuery.value = '';
}

function selectCountry(code) {
  countryCode.value = code;
  closeCountryModal();
}

// State tracking for Figma 4:688 TextHolder variants
const isNameFocused = ref(false);
const nameTouched = ref(false);

const isPhoneFocused = ref(false);
const phoneTouched = ref(false);

const isEmailFocused = ref(false);
const emailTouched = ref(false);

// Automatically remove leading '0' and keep numeric digits
function handlePhoneInput(event) {
  let val = event.target.value;
  // Strip all non-digits
  val = val.replace(/[^0-9]/g, '');
  // Strip any leading zeros
  val = val.replace(/^0+/, '');
  phoneNumber.value = val;
}

const isEmailValid = computed(() => {
  const em = email.value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
});

const isFormValid = computed(() => {
  const name = customerName.value.trim();
  const phone = phoneNumber.value.replace(/[^0-9]/g, '');
  return name.length >= 2 && phone.length >= 6 && isEmailValid.value;
});

async function submitOrder() {
  nameTouched.value = true;
  phoneTouched.value = true;
  emailTouched.value = true;
  
  if (!isFormValid.value || isSubmitting.value) return;

  isSubmitting.value = true;
  engravingStore.setCustomerDetails({
    name: customerName.value.trim(),
    countryCode: countryCode.value,
    phone: phoneNumber.value.trim(),
    email: email.value.trim()
  });

  try {
    const order = await engravingStore.submitOrder();
    if (order && order.order_id) {
      const storeParam = route.params.storeId || order.store_code || order.store_id;
      if (storeParam) {
        router.push(`/queue/${encodeURIComponent(storeParam)}/${order.order_id}`);
      } else {
        router.push(`/queue/${order.order_id}`);
      }
    }
  } catch (err) {
    console.error('Error submitting order:', err);
  } finally {
    isSubmitting.value = false;
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
  gap: clamp(16px, 2.2vh, 28px);
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2.2vh, 28px);
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: clamp(16px, 2vh, 24px);
}

/* Figma 4:688 TextHolder Component */
.stanley-text-holder {
  position: relative;
  width: 100%;
  border-bottom: 1px solid var(--color-black);
  padding-top: 24px;
  padding-bottom: 14px;
  padding-right: 16px;
  display: flex;
  align-items: center;
  transition: border-color var(--transition-fast);
}

.stanley-text-holder.state-error {
  border-bottom-color: #873939;
}

/* Floating Label at top (10px) */
.floating-label {
  position: absolute;
  top: 4px;
  left: 0;
  font-family: var(--font-brand);
  font-size: 10px;
  line-height: 12px;
  color: var(--color-black);
  pointer-events: none;
}

/* Error placeholder text */
.error-placeholder {
  position: absolute;
  left: 0;
  bottom: 14px;
  font-family: var(--font-brand);
  font-size: 14px;
  color: #873939;
  pointer-events: none;
}

.stanley-input-element {
  width: 100%;
  font-family: var(--font-brand);
  font-size: 14px;
  line-height: 18px;
  color: var(--color-black);
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
}

.stanley-input-element::placeholder {
  color: #ababab;
  font-size: 14px;
}

/* Country code row */
.phone-input-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.country-code-selector {
  border-bottom: 1px solid var(--color-black);
  padding-top: 24px;
  padding-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  position: relative;
  width: 80px;
  flex-shrink: 0;
  background: transparent;
  border-top: none;
  border-left: none;
  border-right: none;
  cursor: pointer;
  outline: none;
  transition: opacity var(--transition-fast);
}

.country-code-selector:hover {
  opacity: 0.85;
}

.country-code-value {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-black);
  line-height: 18px;
}

.chevron-icon {
  width: 14px;
  height: 14px;
  opacity: 0.8;
  transition: transform 0.2s ease;
}

.chevron-icon.is-open {
  transform: rotate(180deg);
}

.phone-number-wrap {
  flex: 1;
}

.legal-statement {
  font-family: var(--font-brand);
  font-size: 13px;
  line-height: 18px;
  color: var(--color-black);
  margin-top: 8px;
}

.bottom-action {
  margin-top: auto;
  padding-top: 12px;
  width: 100%;
}

/* Country Code Modal Styles (Matching Stanley UI Style) */
.country-modal-backdrop {
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

.country-modal-sheet {
  width: 100%;
  max-width: var(--mobile-max-width, 430px);
  max-height: 82vh;
  background-color: var(--color-bg, #f2f2f2);
  border-radius: 20px 20px 0 0;
  padding: 14px 20px calc(24px + env(safe-area-inset-bottom, 0px)) 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #d1d5db;
  border-radius: 2px;
  margin: 0 auto;
}

.modal-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
}

.modal-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-title {
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-black);
  letter-spacing: -0.3px;
  margin: 0;
}

.modal-subtitle {
  font-family: var(--font-brand);
  font-size: 12px;
  color: #666;
  margin: 0;
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-black);
  transition: background var(--transition-fast);
}

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

.country-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #d5d5d5;
  border-radius: 10px;
  padding: 10px 14px;
  transition: border-color var(--transition-fast);
}

.country-search-box:focus-within {
  border-color: var(--color-black);
}

.search-icon {
  color: #888;
  flex-shrink: 0;
}

.country-search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-brand);
  font-size: 13.5px;
  color: var(--color-black);
  padding: 0;
}

.country-search-input::placeholder {
  color: #999;
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}

.countries-scroll-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  max-height: 52vh;
  padding-right: 4px;
  margin-top: 4px;
}

/* Custom Scrollbar */
.countries-scroll-list::-webkit-scrollbar {
  width: 4px;
}
.countries-scroll-list::-webkit-scrollbar-track {
  background: transparent;
}
.countries-scroll-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.country-section-label {
  font-family: var(--font-brand);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #888;
  padding: 6px 10px 4px 10px;
}

.country-section-divider {
  border-top: 1px solid #e2e2e2;
  margin-top: 10px;
  padding-top: 10px;
}

.country-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
  width: 100%;
}

.country-item-row:hover {
  background: rgba(0, 0, 0, 0.04);
}

.country-item-row.is-selected {
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.country-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.country-name {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-black);
}

.country-iso {
  font-family: var(--font-brand);
  font-size: 11px;
  color: #888;
  font-weight: 500;
}

.country-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dial-code-badge {
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  color: #444;
}

.check-icon {
  color: var(--color-black);
}

.empty-search-state {
  padding: 32px 16px;
  text-align: center;
  color: #888;
  font-family: var(--font-brand);
  font-size: 13px;
}

/* Modal Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

