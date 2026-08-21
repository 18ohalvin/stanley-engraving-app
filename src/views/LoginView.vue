<template>
  <div class="login-screen">
    <!-- Fullscreen Background Image -->
    <img 
      src="/src/assets/images/login-bg.png" 
      alt="Stanley Background" 
      class="login-bg-img" 
    />
    
    <!-- Dark Vignette Overlay for Depth -->
    <div class="login-bg-overlay"></div>

    <!-- Top Centered Header (Figma 84:322) -->
    <header class="login-header">
      <img 
        src="/src/assets/images/logo-white.png" 
        alt="Stanley 1913" 
        class="stanley-white-logo" 
      />
    </header>

    <!-- Glassmorphic Sign In Card (Figma 85:405) -->
    <main class="login-card-container">
      <div class="sign-in-card fade-in">
        
        <div class="card-header-block">
          <h1 class="sign-in-title">Sign in</h1>
          <p class="sign-in-subtitle">
            Enter your credentials to access the staff dashboard.
          </p>
        </div>

        <form @submit.prevent="handleSignIn" class="sign-in-form">
          
          <!-- Engraver / Store ID Field (Exact Step 5 TextHolder States) -->
          <div 
            class="stanley-text-holder"
            :class="{
              'state-error': storeIdTouched && !storeId.trim(),
              'state-active': isStoreIdFocused || Boolean(storeId.trim()),
              'state-filled': !isStoreIdFocused && Boolean(storeId.trim()),
              'state-default': !isStoreIdFocused && !storeId.trim() && !storeIdTouched
            }"
          >
            <label 
              v-if="isStoreIdFocused || Boolean(storeId.trim())" 
              class="floating-label"
            >
              Engraver / Admin ID*
            </label>

            <span 
              v-if="storeIdTouched && !storeId.trim() && !isStoreIdFocused" 
              class="error-placeholder"
            >
              This information is required*
            </span>

            <input
              type="text"
              v-model="storeId"
              :placeholder="!isStoreIdFocused && !storeIdTouched ? 'Engraver / Admin ID*' : ''"
              required
              class="stanley-input-element"
              @focus="isStoreIdFocused = true; storeIdTouched = true"
              @blur="isStoreIdFocused = false"
              autocomplete="username"
            />
          </div>

          <!-- PIN Field (Exact Step 5 TextHolder States) -->
          <div 
            class="stanley-text-holder"
            :class="{
              'state-error': pinTouched && !pin.trim(),
              'state-active': isPinFocused || Boolean(pin.trim()),
              'state-filled': !isPinFocused && Boolean(pin.trim()),
              'state-default': !isPinFocused && !pin.trim() && !pinTouched
            }"
          >
            <label 
              v-if="isPinFocused || Boolean(pin.trim())" 
              class="floating-label"
            >
              PIN*
            </label>

            <span 
              v-if="pinTouched && !pin.trim() && !isPinFocused" 
              class="error-placeholder"
            >
              This information is required*
            </span>

            <input
              type="password"
              v-model="pin"
              :placeholder="!isPinFocused && !pinTouched ? 'PIN*' : ''"
              required
              maxlength="10"
              class="stanley-input-element"
              @focus="isPinFocused = true; pinTouched = true"
              @blur="isPinFocused = false"
              autocomplete="current-password"
            />
          </div>

          <!-- Inline Error message -->
          <p v-if="authError" class="auth-error-msg fade-in">
            {{ authError }}
          </p>

          <!-- Sign In CTA Button (Figma 85:406) -->
          <button 
            type="submit" 
            class="sign-in-btn"
            :disabled="isLoading || !isFormValid"
          >
            <span v-if="!isLoading">Sign In</span>
            <span v-else class="loading-dots">Authenticating...</span>
          </button>

          <!-- Footer Link (Figma 83:2602) -->
          <div class="card-footer-note">
            <span class="note-text">Can’t access your account? </span>
            <button type="button" class="support-link" @click="contactITSupport">
              Contact IT Support
            </button>
          </div>

        </form>

      </div>
    </main>

    <!-- IT SUPPORT MODAL -->
    <Teleport to="body">
      <div v-if="showSupportModal" class="support-modal-backdrop" @click="showSupportModal = false">
        <div class="support-modal-card fade-in" @click.stop>
          <div class="support-modal-header">
            <h3>Stanley Retail IT Support</h3>
            <button class="support-close-btn" @click="showSupportModal = false">✕</button>
          </div>
          <div class="support-modal-body">
            <p class="support-info-text">
              Only registered staff accounts and the Developer Master Account can access the staff dashboards. Contact IT Support below if you've lost access.
            </p>
            <div class="support-channel-list">
              <div class="support-channel-item">
                <span class="channel-label">WhatsApp IT Support:</span>
                <button type="button" class="support-wa-btn" @click="contactITSupport">
                  Chat on WhatsApp (+62 812-3456-7890)
                </button>
              </div>
              <div class="support-channel-item">
                <span class="channel-label">Retail Support Email:</span>
                <strong>it-support@stanley1913.id</strong>
              </div>
            </div>
          </div>
          <div class="support-modal-footer">
            <button class="support-ok-btn" @click="showSupportModal = false">
              Close
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getCanonicalStore } from '../utils/storeResolver.js';

const router = useRouter();
const route = useRoute();

const storeId = ref('');
const pin = ref('');
const isLoading = ref(false);
const authError = ref('');
const showSupportModal = ref(false);

// State tracking matching Step 5 TextHolder
const isStoreIdFocused = ref(false);
const storeIdTouched = ref(false);

const isPinFocused = ref(false);
const pinTouched = ref(false);

const isFormValid = computed(() => {
  return storeId.value.trim().length > 0 && pin.value.trim().length > 0;
});

function contactITSupport() {
  const phone = '6281234567890';
  const text = encodeURIComponent('Hi Stanley IT Support, I need assistance accessing the Stanley Engraving System.');
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

async function handleSignIn() {
  storeIdTouched.value = true;
  pinTouched.value = true;

  if (!isFormValid.value) return;

  isLoading.value = true;
  authError.value = '';

  const rawId = storeId.value.trim();
  const rawPin = pin.value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idOrUsername: rawId, pin: rawPin })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      isLoading.value = false;
      authError.value = data.error || 'Authentication failed. Please check your credentials.';
      return;
    }

    const { token, user } = data;
    const isSuperAdmin = user.role === 'Super Admin' || user.isDeveloper;
    const role = isSuperAdmin ? 'super_admin' : 'engraver';

    try {
      localStorage.setItem('stanley_staff_token', token);
      localStorage.setItem('stanley_staff_authenticated', 'true');
      localStorage.setItem('stanley_staff_user', user.name || user.staffId || rawId);
      localStorage.setItem('stanley_user_role', role);
      localStorage.setItem('stanley_user_store', user.store || '');
      if (user.isDeveloper) {
        localStorage.setItem('stanley_is_developer', 'true');
      } else {
        localStorage.removeItem('stanley_is_developer');
      }
    } catch (e) {}

    isLoading.value = false;

    if (route.query.redirect) {
      router.push(route.query.redirect);
    } else if (isSuperAdmin) {
      router.push('/admin');
    } else {
      const canonical = getCanonicalStore(user.store || user.staffId || rawId);
      const storeCode = canonical ? canonical.code : (user.store || user.staffId || rawId);
      router.push(`/engraver/${encodeURIComponent(storeCode)}`);
    }
  } catch (err) {
    // Network/server unreachable — do not fall back to an insecure client-side check.
    isLoading.value = false;
    authError.value = 'Unable to reach the Stanley server right now. Please check your connection and try again.';
  }
}
</script>

<style scoped>
.login-screen {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #111827;
  font-family: var(--font-brand);
  z-index: 100;
}

/* Background Image & Vignette */
.login-bg-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  z-index: 1;
}

.login-bg-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 35%, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.45) 100%);
  z-index: 2;
}

/* Top Centered Header (Figma 84:322) */
.login-header {
  position: absolute;
  top: clamp(16px, 3.5vh, 40px);
  left: 0;
  width: 100%;
  height: 48px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stanley-white-logo {
  height: 32px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

/* Glassmorphic Sign In Card (Figma 85:405) */
.login-card-container {
  position: relative;
  z-index: 10;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  margin-top: clamp(24px, 4vh, 48px);
}

.sign-in-card {
  width: 100%;
  max-width: 396px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 8px;
  padding: 32px 32px 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.card-header-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sign-in-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0;
  line-height: 1.3;
}

.sign-in-subtitle {
  font-size: 12px;
  color: #111827;
  margin: 0;
  line-height: 18px;
}

.sign-in-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Figma 4:688 TextHolder Style (Identical to Step 5) */
.stanley-text-holder {
  position: relative;
  width: 100%;
  border-bottom: 1px solid #000000;
  padding-top: 24px;
  padding-bottom: 14px;
  padding-right: 16px;
  display: flex;
  align-items: center;
  transition: border-color 0.2s ease;
}

.stanley-text-holder.state-error {
  border-bottom-color: #873939;
}

/* Floating Label */
.floating-label {
  position: absolute;
  top: 4px;
  left: 0;
  font-size: 10px;
  line-height: 12px;
  color: #000000;
  pointer-events: none;
  font-weight: 500;
}

/* Error Placeholder */
.error-placeholder {
  position: absolute;
  left: 0;
  bottom: 14px;
  font-size: 14px;
  color: #873939;
  pointer-events: none;
}

.stanley-input-element {
  width: 100%;
  font-size: 14px;
  line-height: 18px;
  color: #000000;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  font-family: inherit;
}

.stanley-input-element::placeholder {
  color: #ababab;
  font-size: 14px;
}

.auth-error-msg {
  color: #DC2626;
  font-size: 12px;
  margin: -8px 0 0 0;
  font-weight: 500;
}

/* Sign In Button (Figma 85:406) */
.sign-in-btn {
  width: 100%;
  height: 56px;
  background-color: #000000;
  color: #FFFFFF;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease, transform 0.1s ease;
  margin-top: 8px;
}

.sign-in-btn:hover:not(:disabled) {
  opacity: 0.88;
}

.sign-in-btn:active:not(:disabled) {
  transform: scale(0.99);
}

.sign-in-btn:disabled {
  background-color: #D2D2D2;
  cursor: not-allowed;
}

/* Card Footer Link (Figma 83:2602) */
.card-footer-note {
  font-size: 12px;
  color: #000000;
  line-height: 18px;
  text-align: left;
}

.note-text {
  color: #000000;
}

.support-link {
  background: none;
  border: none;
  color: #000000;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  font-size: 12px;
  font-family: inherit;
  padding: 0;
}

.support-link:hover {
  opacity: 0.75;
}

/* SUPPORT MODAL */
.support-modal-backdrop {
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

.support-modal-card {
  background-color: #FFFFFF;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.support-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F3F4F6;
  padding-bottom: 12px;
}

.support-modal-header h3 {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}

.support-close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6B7280;
}

.support-info-text {
  font-size: 13px;
  color: #4B5563;
  margin: 0 0 12px 0;
}

.support-channel-list {
  background-color: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.support-channel-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.channel-label {
  font-size: 11px;
  color: #6B7280;
}

.demo-pill-badge {
  background-color: #111827;
  color: #FFFFFF;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  display: inline-block;
  margin-top: 4px;
}

.support-wa-btn {
  background-color: #25D366;
  color: #FFFFFF;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  width: fit-content;
  transition: opacity 0.15s ease;
}

.support-wa-btn:hover {
  opacity: 0.9;
}

.support-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #F3F4F6;
  padding-top: 14px;
}

.support-quick-fill-btn {
  background-color: #F3F4F6;
  color: #111827;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.support-ok-btn {
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.fade-in {
  animation: fadeIn 0.25s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
