import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/main.css';
import { useQueueStore } from './store/queueStore.js';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');

// Initialize Cross-Device Real-time Synchronization
const queueStore = useQueueStore();
queueStore.initRealtimeSync();
