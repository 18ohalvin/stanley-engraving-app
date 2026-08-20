<template>
  <div 
    class="app-container"
    :class="{ 'full-width-view': isFullWidth }"
  >
    <!-- Fixed Stationary Stanley Brand Logo for Mobile Customer Views -->
    <div 
      v-if="!isFullWidth" 
      class="global-stanley-logo-fixed"
      @click="handleLogoClick"
      title="Cancel & Back to Home"
      role="button"
      tabindex="0"
    >
      <img 
        src="/src/assets/images/logo-white.png" 
        alt="Stanley 1913" 
        class="stationary-logo"
      />
    </div>

    <!-- Main View Router Container -->
    <router-view v-slot="{ Component }">
      <transition name="page-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEngravingStore } from './store/engravingStore';

const route = useRoute();
const router = useRouter();
const engravingStore = useEngravingStore();

const isFullWidth = computed(() => Boolean(route.meta?.fullWidth));
const isLanding = computed(() => route.path === '/');

function handleLogoClick() {
  if (route.path !== '/') {
    engravingStore.clearAll();
    router.push('/');
  }
}
</script>

<style>
/* Fixed Global Logo */
.global-stanley-logo-fixed {
  position: absolute;
  top: var(--top-logo-top);
  left: var(--top-logo-left);
  width: 139px;
  height: 25px;
  z-index: 100;
  cursor: pointer;
  display: flex;
  align-items: center;
  user-select: none;
  transition: transform var(--transition-fast);
}

.global-stanley-logo-fixed:hover {
  opacity: 0.85;
}

.global-stanley-logo-fixed:active {
  transform: scale(0.97);
}

.stationary-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Page transition without affecting the fixed logo */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.page-slide-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.page-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
