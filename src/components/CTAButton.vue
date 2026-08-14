<template>
  <button
    :type="type"
    class="cta-button"
    :class="[
      `variant-${variant}`,
      { 'is-disabled': disabled, 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="spinner"></span>
    <span v-else class="button-label">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'outline' | 'white'
    validator: (v) => ['primary', 'secondary', 'outline', 'white'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button'
  }
});

defineEmits(['click']);
</script>

<style scoped>
.cta-button {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  padding: 0 20px;
  user-select: none;
}

/* Primary Black */
.variant-primary {
  background-color: var(--color-black);
  color: var(--color-bg-white);
  border: 1px solid var(--color-black);
}

.variant-primary:hover:not(:disabled) {
  background-color: #222222;
}

/* White / Landing CTA */
.variant-white {
  background-color: var(--color-bg-white);
  color: var(--color-black);
  border: 1px solid var(--color-bg-white);
  width: 160px;
}

.variant-white:hover:not(:disabled) {
  background-color: #f0f0f0;
}

/* Outline */
.variant-outline {
  background-color: transparent;
  color: var(--color-black);
  border: 1px solid var(--color-black);
}

.variant-outline:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* Secondary */
.variant-secondary {
  background-color: var(--color-gray-bg);
  color: var(--color-black);
  border: 1px solid var(--color-gray-border);
}

/* Inactive / Disabled state: fill color D2D2D2 */
.cta-button.is-disabled {
  background-color: #D2D2D2 !important;
  color: #FFFFFF !important;
  border: 1px solid #D2D2D2 !important;
  cursor: not-allowed;
  pointer-events: none;
  opacity: 1 !important;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
