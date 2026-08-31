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
            <!-- Country Code Selector (No flags, Chevron pointing down) -->
            <div class="country-code-selector">
              <select v-model="countryCode" class="country-select">
                <option value="+62">+62</option>
                <option value="+1">+1</option>
                <option value="+65">+65</option>
                <option value="+60">+60</option>
                <option value="+61">+61</option>
                <option value="+44">+44</option>
                <option value="+81">+81</option>
                <option value="+82">+82</option>
                <option value="+86">+86</option>
              </select>
              <img src="/src/assets/icons/chevron-down.svg" alt="Select" class="chevron-icon" />
            </div>

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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import StepHeader from '../components/StepHeader.vue';
import CTAButton from '../components/CTAButton.vue';
import { useEngravingStore } from '../store/engravingStore';

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
  gap: 6px;
  position: relative;
  width: 75px;
  flex-shrink: 0;
}

.country-select {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-black);
  cursor: pointer;
  width: 100%;
  appearance: none;
  background: transparent;
  padding-right: 18px;
  border: none;
  outline: none;
}

.chevron-icon {
  position: absolute;
  right: 0;
  bottom: 16px;
  width: 14px;
  height: 14px;
  pointer-events: none;
  opacity: 0.8;
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
</style>
