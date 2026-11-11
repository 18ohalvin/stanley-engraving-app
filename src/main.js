import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { useQueueStore } from './store/queueStore.js';
import { loadStoreDirectory } from './utils/storeResolver.js';

// Load the live store directory (code <-> current name) on every device
loadStoreDirectory();
window.addEventListener('stanley_stores_updated', () => loadStoreDirectory(true));

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');

// Initialize Cross-Device Real-time Synchronization
const queueStore = useQueueStore();
queueStore.initRealtimeSync();

// Re-scope the realtime feed on navigation (customer ticket ↔ staff station, login, logout)
router.afterEach(() => {
  queueStore.syncRealtimeScope();
});
