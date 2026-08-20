<template>
  <header class="stanley-header" :class="{ 'is-dark': isDark }">
    <div class="logo-wrapper">
      <img 
        src="/src/assets/images/logo-white.png" 
        alt="Stanley 1913" 
        class="stanley-logo"
      />
    </div>
    <div v-if="showBack" class="header-action">
      <button @click="$emit('back')" class="back-btn" aria-label="Go back">
        <img src="/src/assets/icons/chevron-left.svg" alt="Back" class="icon" />
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  isDark: {
    type: Boolean,
    default: false
  },
  showBack: {
    type: Boolean,
    default: false
  }
});

defineEmits(['back']);
</script>

<style scoped>
.stanley-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  padding: 24px 32px 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 20;
}

.logo-wrapper {
  width: 139px;
  height: 25px;
  display: flex;
  align-items: center;
}

.stanley-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.05);
}

.icon {
  width: 18px;
  height: 18px;
}
</style>
