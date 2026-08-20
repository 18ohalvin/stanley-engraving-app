<template>
  <div class="step-header">
    <div class="step-meta-row">
      <span class="step-num">{{ stepNumber }}</span>
    </div>
    <h2 class="step-title">{{ title }}</h2>
  </div>
</template>

<script setup>
defineProps({
  stepNumber: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  }
});
</script>

<style scoped>
.step-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  width: 100%;
}

.step-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
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
