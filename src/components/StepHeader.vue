<template>
  <div class="step-header">
    <div class="step-header-top-row">
      <button 
        v-if="hasBack" 
        type="button" 
        class="step-back-btn" 
        @click="goBack"
        title="Go to previous step"
      >
        <span class="back-arrow">‹</span> Back
      </button>
      <span class="step-num">{{ stepNumber }}</span>
    </div>
    <h2 class="step-title">{{ title }}</h2>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  stepNumber: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  showBack: {
    type: Boolean,
    default: true
  }
});

const router = useRouter();

const hasBack = computed(() => {
  if (!props.showBack) return false;
  return props.stepNumber !== 'Step 1';
});

function goBack() {
  if (window.history.state?.back) {
    router.back();
  } else {
    if (props.stepNumber === 'Step 2') router.push('/step-1');
    else if (props.stepNumber === 'Step 3') router.push('/step-2');
    else if (props.stepNumber === 'Step 4') router.push('/step-3');
    else if (props.stepNumber === 'Step 5') router.push('/step-4');
    else router.push('/');
  }
}
</script>

<style scoped>
.step-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  width: 100%;
}

.step-header-top-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-back-btn {
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  font-family: var(--font-brand);
  font-size: 13px;
  font-weight: 600;
  color: #18181B;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  transition: opacity 0.15s ease;
}

.step-back-btn:hover {
  opacity: 0.7;
}

.back-arrow {
  font-size: 16px;
  line-height: 1;
}

.step-num {
  font-family: var(--font-brand);
  font-size: 12px;
  color: var(--color-black);
  font-weight: 400;
  text-transform: none;
}

.step-title {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 600;
  color: var(--color-black);
  margin: 0;
}
</style>
