<template>
  <div 
    class="app-container"
    :class="{ 'full-width-view': isFullWidth }"
  >
    <!-- Fixed Stationary Stanley Brand Logo for Mobile Customer Views -->
    <div 
      v-if="!isFullWidth" 
      class="global-stanley-logo-fixed"
      title="Stanley 1913"
    >
      <img 
        :src="isLanding ? '/src/assets/images/logo-white.png' : '/src/assets/images/logo-black.png'" 
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
import { useRoute } from 'vue-router';

const route = useRoute();

const isFullWidth = computed(() => Boolean(route.meta?.fullWidth));
const isLanding = computed(() => {
  if (route.name === 'landing' || route.name === 'engrave-store') return true;
  if (route.path === '/') return true;
  if (route.path.startsWith('/engrave/') && !route.path.includes('/step-')) return true;
  return false;
});
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
  cursor: default;
  pointer-events: none;
  display: flex;
  align-items: center;
  user-select: none;
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
