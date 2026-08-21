<template>
  <div class="landing-page">
    <!-- Full-bleed background image -->
    <div class="bg-image-container">
      <img 
        :src="landingBg" 
        alt="Stanley Lifestyle" 
        class="bg-image"
      />
      <div class="bg-gradient-overlay"></div>
    </div>

    <!-- Content / Headline & CTA -->
    <div class="landing-content">
      <div class="headline-block">
        <h1 class="headline-text">
          <span>Customize</span>
          <span>Your Stanley</span>
        </h1>
        
        <CTAButton 
          variant="white" 
          label="Get Started" 
          @click="startCustomization"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import landingBg from '../assets/images/landing-bg.png';
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

function startCustomization() {
  engravingStore.resetDraft();
  const storeId = route.params.storeId || engravingStore.selectedStoreId;
  if (storeId) {
    router.push(`/engrave/${storeId}/step-1`);
  } else {
    router.push('/step-1');
  }
}
</script>

<style scoped>
.landing-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  background-color: #000000;
  display: flex;
  flex-direction: column;
}

.bg-image-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.bg-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.bg-gradient-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg, 
    rgba(0, 0, 0, 0.25) 0%, 
    rgba(0, 0, 0, 0) 35%, 
    rgba(0, 0, 0, 0.45) 70%, 
    rgba(0, 0, 0, 0.85) 100%
  );
}

.landing-content {
  position: relative;
  z-index: 10;
  height: 100%;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--top-content-padding) var(--side-margin) calc(76px + env(safe-area-inset-bottom, 0px)) var(--side-margin);
}

.headline-block {
  display: flex;
  flex-direction: column;
  gap: 32px;
  align-items: flex-start;
  width: 100%;
}

.headline-text {
  font-family: var(--font-brand);
  font-size: 48px;
  font-weight: 500;
  color: #ffffff;
  letter-spacing: -0.96px;
  line-height: 48px;
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  word-break: break-word;
}

.headline-text span {
  display: block;
  line-height: 48px;
}

@media (max-height: 700px) {
  .headline-text {
    font-size: 40px;
    line-height: 40px;
  }
  .headline-text span {
    line-height: 40px;
  }
  .headline-block {
    gap: 24px;
  }
}
</style>
