<template>
  <div class="store-not-found">
    <div class="card">
      <h1 class="title">{{ requestedStore ? 'Store not found' : 'Scan the store QR code' }}</h1>
      <p class="message">
        <template v-if="requestedStore">
          We couldn't find a Stanley store with the code
          <strong>{{ requestedStore }}</strong>.
        </template>
        Custom engraving orders are made for a specific store. Please scan the QR code
        displayed at the Stanley store where you'd like your cup engraved.
      </p>
      <router-link to="/login" class="staff-link">Staff login</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const requestedStore = computed(() => {
  const value = route.query.store;
  return typeof value === 'string' ? value.trim() : '';
});
</script>

<style scoped>
.store-not-found {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: #f4f4f4;
  box-sizing: border-box;
}

.card {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border: 1px solid #e3e3e3;
  border-radius: 12px;
  padding: 28px 24px;
  text-align: center;
  box-sizing: border-box;
}

.title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 700;
  color: #111111;
}

.message {
  margin: 0 0 24px;
  font-size: 15px;
  line-height: 1.5;
  color: #555555;
}

.message strong {
  color: #111111;
  word-break: break-word;
}

.staff-link {
  font-size: 13px;
  color: #777777;
  text-decoration: underline;
}
</style>
