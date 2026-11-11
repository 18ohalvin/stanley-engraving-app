import { defineStore } from 'pinia';
import { getStoredOrders, saveStoredOrders, fetchServerOrders, getBroadcastChannel, broadcastSyncMessage } from '../utils/storage.js';
import { logEngravingAnalytics, sendWhatsAppNotification } from '../utils/analyticsService.js';
import { formatSystemQueueNumber, toLocalDateKey } from '../utils/formatters.js';
import { isSameStore, getCanonicalStore, loadStoreDirectory } from '../utils/storeResolver.js';

// Clean empty starting state for production deployment
const INITIAL_SEED_ORDERS = [];

function isStationControllerContext() {
  if (typeof window === 'undefined' || !window.location || !window.location.pathname) return true;
  const path = window.location.pathname.toLowerCase();
  // Public customer-facing routes (landing, engraving steps, tickets) never act as station controllers
  if (
    path === '/' ||
    /^\/(queue|ticket|q|track|engrave)(\/|$)/.test(path) ||
    /^\/step-\d/.test(path) ||
    path.includes('customize')
  ) {
    return false;
  }
  return true;
}

function protectLocalProgress(local, remoteOrder) {
  if (!local) return remoteOrder;
  // Protect ready_for_pickup from being downgraded by stale server state
  if (local.status === 'ready_for_pickup' && remoteOrder.status !== 'ready_for_pickup') {
    return { ...remoteOrder, status: 'ready_for_pickup', ready_at: local.ready_at || remoteOrder.ready_at };
  }
  // Protect in_queue from being downgraded to pending_dropoff
  if (local.status === 'in_queue' && remoteOrder.status === 'pending_dropoff') {
    return {
      ...remoteOrder,
      status: 'in_queue',
      intake_at: local.intake_at || remoteOrder.intake_at,
      system_queue_number: local.system_queue_number || remoteOrder.system_queue_number,
      short_code: local.short_code || remoteOrder.short_code
    };
  }
  return remoteOrder;
}

function mergeOrdersPreservingLocalProgress(existingOrders, incomingOrders) {
  if (!Array.isArray(incomingOrders)) return existingOrders;
  if (!Array.isArray(existingOrders) || existingOrders.length === 0) return incomingOrders;
  const localById = new Map(existingOrders.map(o => [o.order_id, o]));
  return incomingOrders.map(remoteOrder => protectLocalProgress(localById.get(remoteOrder.order_id), remoteOrder));
}

function getStaffToken() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
  } catch (e) {
    return null;
  }
}

/**
 * Which realtime feed this tab should subscribe to:
 *  - logged-in staff on a station/admin page: their tenant's feed
 *  - customer on a ticket page: only that ticket
 *  - any other customer page: public catalogue events only
 */
function getRealtimeEventsUrl() {
  if (typeof window === 'undefined' || !window.location) return '/api/events';
  const token = getStaffToken();
  if (token && isStationControllerContext()) {
    return `/api/events?token=${encodeURIComponent(token)}`;
  }
  // /queue|/ticket|/q  :orderId  or  :storeId/:orderId
  const ticketMatch = window.location.pathname.match(/^\/(?:queue|ticket|q)\/(?:([^/]+)\/)?([^/]+)\/?$/i);
  if (ticketMatch) {
    const params = new URLSearchParams({ order: decodeURIComponent(ticketMatch[2]) });
    if (ticketMatch[1]) params.set('store', decodeURIComponent(ticketMatch[1]));
    return `/api/events?${params.toString()}`;
  }
  return '/api/events';
}

// Module-level SSE connection (one per tab)
let sseInstance = null;
let sseUrl = null;
let sseReconnectTimer = null;

export const useQueueStore = defineStore('queue', {
  state: () => {
    const defaultMachines = [
      {
        id: 'machine-01',
        name: 'Machine 01',
        isActive: true,
        status: 'idle', // 'idle' | 'engraving'
        currentOrderId: null,
        currentItemIndex: 0,
        timerSeconds: 0,
        image: '/src/assets/images/station-ready-cup.png'
      },
      {
        id: 'machine-02',
        name: 'Machine 02',
        isActive: true,
        status: 'idle',
        currentOrderId: null,
        currentItemIndex: 0,
        timerSeconds: 0,
        image: '/src/assets/images/station-ready-cup.png'
      }
    ];

    return {
      orders: getStoredOrders(),
      // Customer ticket view: server-computed number of orders ahead, keyed by order_id
      ticketQueueAhead: {},
      // 2 Physical laser machine stations matching Figma 17:635 & 87:393
      machines: defaultMachines
    };
  },

  getters: {
    allOrders: (state) => state.orders,
    
    pendingDropoffOrders: (state) => 
      state.orders.filter(o => o.status === 'pending_dropoff'),

    inQueueOrders: (state) => {
      return state.orders
        .filter(o => o.status === 'in_queue')
        .slice()
        .sort((a, b) => {
          const timeA = new Date(a.intake_at || a.created_at || 0).getTime();
          const timeB = new Date(b.intake_at || b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const numA = parseInt(a.system_queue_number || a.short_code, 10) || 0;
          const numB = parseInt(b.system_queue_number || b.short_code, 10) || 0;
          return numA - numB;
        });
    },

    inProgressOrders: (state) => 
      state.orders.filter(o => o.status === 'engraving_in_progress'),

    readyOrders: (state) => 
      state.orders.filter(o => o.status === 'ready_for_pickup'),

    upcomingListOrders: (state) => (activeStoreId = null) => {
      const activeAssignedIds = state.machines
        .filter(m => m.isActive !== false)
        .map(m => m.currentOrderId)
        .filter(Boolean);

      const storeId = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);

      return state.orders
        .filter(o => {
          if (o.status !== 'in_queue' || activeAssignedIds.includes(o.order_id)) return false;
          if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
            const match = isSameStore(o.store_id, storeId) || isSameStore(o.store_code, storeId) || isSameStore(o.store_name, storeId);
            if (!match) return false;
          }
          return true;
        })
        .slice()
        .sort((a, b) => {
          const timeA = new Date(a.intake_at || a.created_at || 0).getTime();
          const timeB = new Date(b.intake_at || b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const numA = parseInt(a.system_queue_number || a.short_code, 10) || 0;
          const numB = parseInt(b.system_queue_number || b.short_code, 10) || 0;
          return numA - numB;
        });
    },

    getOrderById: (state) => (orderIdOrCode) => {
      if (!orderIdOrCode) return null;
      const cleanCode = String(orderIdOrCode).replace('#', '').trim().toUpperCase();
      if (!cleanCode || cleanCode === 'UNDEFINED' || cleanCode === 'NULL') return null;
      const parts = cleanCode.split('-');
      const subCode = parts[parts.length - 1];

      return state.orders.find(o => {
        if (!o) return false;
        const oId = (o.order_id || '').trim().toUpperCase();
        const sCode = (o.short_code || '').trim().toUpperCase();
        const iCode = (o.intake_code || '').trim().toUpperCase();
        const qNum = (o.system_queue_number || '').trim().toUpperCase();

        // Exact matches
        if (oId && oId === cleanCode) return true;
        if (sCode && sCode === cleanCode) return true;
        if (iCode && iCode === cleanCode) return true;
        if (qNum && qNum === cleanCode) return true;

        // Subcode matches (e.g. 130826-C4X matching C4X)
        if (subCode && subCode.length >= 3) {
          if (sCode && sCode === subCode) return true;
          if (iCode && iCode === subCode) return true;
          if (qNum && qNum === subCode) return true;
        }

        // Full ID suffix matches (e.g. searching C4X matching 130826-C4X)
        if (oId && cleanCode.length >= 3 && oId.endsWith(`-${cleanCode}`)) return true;

        return false;
      }) || null;
    },

    getAssignedOrder: (state) => (machine) => {
      if (!machine || !machine.currentOrderId) return null;
      return state.orders.find(o => o.order_id === machine.currentOrderId) || null;
    }
  },

  actions: {
    async refreshFromStorage(storeId = null) {
      // Only logged-in staff may list orders; customer pages load just their own ticket.
      if (!getStaffToken() || !isStationControllerContext()) return;
      const targetStore = storeId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      // Fetch central cloud server orders
      const remote = await fetchServerOrders(targetStore);
      if (remote && Array.isArray(remote)) {
        this.orders = mergeOrdersPreservingLocalProgress(this.orders, remote);
      }
      await this.refreshMachinesFromStorage(targetStore);
      if (isStationControllerContext()) {
        this.autoAssignMachines(targetStore);
      }
    },

    async refreshMachinesFromStorage(targetStoreId = null) {
      try {
        if (typeof localStorage !== 'undefined') {
          const localData = localStorage.getItem('stanley_machines_state');
          if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              parsed.forEach(storedM => {
                const target = this.machines.find(m => m.id === storedM.id);
                if (target) {
                  target.status = storedM.status || 'idle';
                  target.currentOrderId = storedM.currentOrderId || null;
                  target.timerSeconds = storedM.timerSeconds || 0;
                  target.currentItemIndex = storedM.currentItemIndex || 0;
                  if (storedM.isActive !== undefined) target.isActive = storedM.isActive;
                }
              });
            }
          }
        }

        if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined') {
          const storeId = targetStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
          const storeParam = storeId && storeId !== '*' && storeId !== 'HQ Central' ? `?storeId=${encodeURIComponent(storeId)}` : '';
          const token = getStaffToken();
          const res = await fetch(`/api/machines${storeParam}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data?.machines || []);
            if (Array.isArray(list) && list.length > 0) {
              list.forEach(storedM => {
                const target = this.machines.find(m => m.id === storedM.id);
                if (target) {
                  target.status = storedM.status || 'idle';
                  target.currentOrderId = storedM.currentOrderId || null;
                  target.timerSeconds = storedM.timerSeconds || 0;
                  target.currentItemIndex = storedM.currentItemIndex || 0;
                  if (storedM.isActive !== undefined) target.isActive = storedM.isActive;
                }
              });
            }
          }
        }
      } catch (e) {}
    },

    saveMachinesState() {
      if (!isStationControllerContext()) return;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('stanley_machines_state', JSON.stringify(this.machines));
        }
        const storeId = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
        broadcastSyncMessage('machines_updated', { storeId, machines: this.machines });
        if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined') {
          const storeParam = storeId && storeId !== '*' && storeId !== 'HQ Central' ? `?storeId=${encodeURIComponent(storeId)}` : '';
          const token = getStaffToken();
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(`/api/machines${storeParam}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ machines: this.machines, storeId })
          }).catch(() => {});
        }
      } catch (e) {}
    },

    applyMachinesPayload(list) {
      if (!Array.isArray(list)) return;
      list.forEach(storedM => {
        const target = this.machines.find(m => m.id === storedM.id);
        if (target) {
          target.status = storedM.status || 'idle';
          target.currentOrderId = storedM.currentOrderId || null;
          target.timerSeconds = storedM.timerSeconds || 0;
          target.currentItemIndex = storedM.currentItemIndex || 0;
          if (storedM.isActive !== undefined) target.isActive = storedM.isActive;
        }
      });
    },

    // Merge a single order delta pushed from the server
    applyOrderUpsert(order) {
      if (!order || !order.order_id) return;
      const index = this.orders.findIndex(o => o.order_id === order.order_id);
      if (index === -1) {
        this.orders = [order, ...this.orders];
      } else {
        const next = this.orders.slice();
        next[index] = protectLocalProgress(this.orders[index], order);
        this.orders = next;
      }
      this.afterRemoteOrdersChange();
    },

    applyOrderRemoved(orderId) {
      if (!orderId) return;
      const next = this.orders.filter(o => o.order_id !== orderId);
      if (next.length === this.orders.length) return;
      this.orders = next;
      this.afterRemoteOrdersChange();
    },

    afterRemoteOrdersChange() {
      if (isStationControllerContext() && getStaffToken()) {
        const targetStore = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
        this.autoAssignMachines(targetStore);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stanley_orders_updated', { detail: this.orders }));
      }
    },

    /**
     * (Re)connect the SSE feed if the scope changed (route change, login, logout).
     * Called on startup and after every route navigation.
     */
    syncRealtimeScope() {
      if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
      const url = getRealtimeEventsUrl();
      if (sseInstance && sseUrl === url) return;
      const scopeChanged = sseUrl !== url;
      const wasStaffScope = Boolean(sseUrl && sseUrl.includes('token='));
      this.connectRealtime(url);
      // Leaving a staff scope (logout): drop that tenant's orders from this device's memory
      if (wasStaffScope && !url.includes('token=')) {
        this.orders = [];
      }
      // Entering a staff scope (e.g. right after login): load that tenant's orders once.
      if (scopeChanged && url.includes('token=')) {
        this.refreshFromStorage();
      }
    },

    connectRealtime(url) {
      if (sseInstance) {
        sseInstance.close();
        sseInstance = null;
      }
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
      sseUrl = url;

      try {
        const source = new EventSource(url);
        sseInstance = source;

        const on = (event, handler) => {
          source.addEventListener(event, (e) => {
            try {
              handler(JSON.parse(e.data));
            } catch (err) {}
          });
        };

        on('order_upsert', (order) => this.applyOrderUpsert(order));
        on('order_removed', (data) => this.applyOrderRemoved(data && data.order_id));
        on('orders_resync', () => this.refreshFromStorage());
        on('queue_position', (data) => {
          if (data && data.order_id) {
            this.ticketQueueAhead = { ...this.ticketQueueAhead, [data.order_id]: Number(data.queue_ahead) || 0 };
          }
        });
        on('machines_updated', (rawData) => {
          const list = Array.isArray(rawData) ? rawData : (rawData?.machines || []);
          const eventStoreId = rawData?.storeId;
          const localStoreId = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
          if (eventStoreId && localStoreId && !isSameStore(eventStoreId, localStoreId)) {
            return; // Global admins receive every store's machines; keep only the active store's
          }
          this.applyMachinesPayload(list);
          window.dispatchEvent(new CustomEvent('stanley_machines_updated', { detail: list }));
        });

        const forward = {
          products_updated: 'stanley_products_updated',
          stores_updated: 'stanley_stores_updated',
          settings_updated: 'stanley_settings_updated',
          staff_updated: 'stanley_staff_updated',
          whatsapp_status: 'stanley_whatsapp_status'
        };
        Object.entries(forward).forEach(([event, windowEvent]) => {
          on(event, (detail) => window.dispatchEvent(new CustomEvent(windowEvent, { detail })));
        });

        source.onerror = () => {
          if (sseInstance !== source) return;
          source.close();
          sseInstance = null;
          if (!sseReconnectTimer) {
            sseReconnectTimer = setTimeout(() => {
              sseReconnectTimer = null;
              // Re-evaluate scope in case the token expired or the route changed meanwhile
              this.connectRealtime(getRealtimeEventsUrl());
              // Catch up on anything missed while disconnected
              this.refreshFromStorage();
            }, 3000);
          }
        };
      } catch (e) {}
    },

    initRealtimeSync() {
      if (typeof window === 'undefined') return;

      this.refreshFromStorage();

      // Listen to cross-tab zero-latency BroadcastChannel (same device only)
      const channel = getBroadcastChannel();
      if (channel) {
        channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'orders_updated' && Array.isArray(payload)) {
            this.orders = mergeOrdersPreservingLocalProgress(this.orders, payload);
            if (isStationControllerContext()) {
              const targetStore = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
              this.autoAssignMachines(targetStore);
            }
          } else if (type === 'machines_updated') {
            const list = Array.isArray(payload) ? payload : (payload?.machines || []);
            const eventStoreId = payload?.storeId;
            const localStoreId = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
            if (eventStoreId && localStoreId && !isSameStore(eventStoreId, localStoreId)) {
              return; // Ignore other store's machines!
            }
            this.applyMachinesPayload(list);
          }
        };
      }

      this.syncRealtimeScope();

      // Clean up SSE connection before page unload/refresh to free browser socket immediately
      window.addEventListener('beforeunload', () => {
        if (sseInstance) {
          sseInstance.close();
          sseInstance = null;
        }
      });

      // Synchronize when staff returns to the station tab (visibilitychange + focus often
      // fire together, so coalesce them into a single fetch)
      let lastFocusRefresh = 0;
      const refreshOnReturn = () => {
        if (!isStationControllerContext()) return;
        const now = Date.now();
        if (now - lastFocusRefresh < 2000) return;
        lastFocusRefresh = now;
        this.refreshFromStorage();
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') refreshOnReturn();
        });
        window.addEventListener('focus', refreshOnReturn);
      }

      // Gentle background fail-safe sync (every 15s) strictly for logged-in station controllers
      setInterval(() => {
        if (isStationControllerContext() && document.visibilityState !== 'hidden') {
          this.refreshFromStorage();
        }
      }, 15000);
    },

    async resetDatabase() {
      this.orders = JSON.parse(JSON.stringify(INITIAL_SEED_ORDERS));
      saveStoredOrders(this.orders);
      for (const m of this.machines) {
        m.currentOrderId = null;
        m.status = 'idle';
        m.timerSeconds = 0;
        m.currentItemIndex = 0;
      }
      await this.saveMachinesState();
      try {
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        await fetch('/api/orders/clear', { method: 'POST', headers });
      } catch (e) {}
      this.autoAssignMachines();
    },

    getNextSystemQueueNumber(targetStoreId = null) {
      const storeId = targetStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      
      // Local business day of this station device (not the UTC day)
      const getYYYYMMDD = (dateInput) => toLocalDateKey(dateInput || new Date());

      const todayStr = getYYYYMMDD(new Date());

      const filtered = this.orders.filter(o => {
        if (o.status === 'pending_dropoff' || o.status === 'cancelled') return false;
        if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
          const match = isSameStore(o.store_id, storeId) || isSameStore(o.store_code, storeId) || isSameStore(o.store_name, storeId);
          if (!match) return false;
        }
        const oDate = getYYYYMMDD(o.created_at || o.intake_at);
        return oDate === todayStr;
      });

      const highest = filtered.reduce((max, o) => {
        const num1 = parseInt(o.system_queue_number, 10);
        const num2 = parseInt(o.short_code, 10);
        const val = !isNaN(num1) ? num1 : (!isNaN(num2) ? num2 : 0);
        return Math.max(max, val);
      }, 0);

      const nextNum = highest + 1;
      return formatSystemQueueNumber(nextNum);
    },

    getActiveQueueCount() {
      return this.orders.filter(o => o.status === 'in_queue' || o.status === 'engraving_in_progress').length;
    },

    addOrder(order) {
      this.orders.unshift(order);
      saveStoredOrders(this.orders);
      this.autoAssignMachines();
      // Persisted by the caller (engravingStore.submitOrder awaits POST /api/orders/public)
    },

    upsertOrder(order) {
      if (!order || (!order.order_id && !order.short_code && !order.intake_code)) return;
      const index = this.orders.findIndex(o => 
        (order.order_id && o.order_id === order.order_id) || 
        (order.short_code && o.short_code === order.short_code) ||
        (order.intake_code && o.intake_code === order.intake_code)
      );
      if (index !== -1) {
        this.orders[index] = { ...this.orders[index], ...order };
      } else {
        this.orders.unshift(order);
      }
      saveStoredOrders(this.orders);

      try {
        if (typeof fetch !== 'undefined' && order.order_id) {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(`/api/orders/${encodeURIComponent(order.order_id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(order)
          }).catch(() => {});
        }
      } catch (e) {}
    },

    updateStatus(orderId, newStatus) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        const target = this.orders[index];
        target.status = newStatus;
        target.updated_at = new Date().toISOString();
        saveStoredOrders(this.orders);

        try {
          if (typeof fetch !== 'undefined') {
            const targetId = target.order_id || orderId;
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            fetch(`/api/orders/${encodeURIComponent(targetId)}/status`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ status: newStatus })
            }).catch(() => {});
          }
        } catch (e) {}

        return this.orders[index];
      }
      return null;
    },

    cancelOrder(orderId) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        const target = this.orders[index];
        target.status = 'cancelled';
        target.updated_at = new Date().toISOString();
        saveStoredOrders(this.orders);

        const machine = this.machines.find(m => m.currentOrderId === orderId);
        if (machine) {
          machine.currentOrderId = null;
          machine.status = 'idle';
          machine.timerSeconds = 0;
          this.autoAssignMachines();
        }

        try {
          if (typeof fetch !== 'undefined') {
            const targetId = target.order_id || orderId;
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            fetch(`/api/orders/${encodeURIComponent(targetId)}/status`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ status: 'cancelled' })
            }).catch(() => {});
          }
        } catch (e) {}
      }
    },

    updateOrder(orderId, updatedFields) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        this.orders[index] = {
          ...this.orders[index],
          ...updatedFields,
          updated_at: new Date().toISOString()
        };
        const target = this.orders[index];
        saveStoredOrders(this.orders);
        this.autoAssignMachines();

        try {
          if (typeof fetch !== 'undefined') {
            const targetId = target.order_id || orderId;
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            fetch(`/api/orders/${encodeURIComponent(targetId)}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(target)
            }).catch(() => {});
          }
        } catch (e) {}

        return this.orders[index];
      }
      return null;
    },

    async deleteOrder(orderId) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        const target = this.orders[index];
        const targetId = target.order_id || orderId;
        this.orders.splice(index, 1);
        saveStoredOrders(this.orders);

        const machine = this.machines.find(m => m.currentOrderId === orderId);
        if (machine) {
          machine.currentOrderId = null;
          machine.status = 'idle';
          machine.timerSeconds = 0;
          this.autoAssignMachines();
        }

        // Permanently delete from cloud backend database
        try {
          if (typeof fetch !== 'undefined') {
            const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            await fetch(`/api/orders/${encodeURIComponent(targetId)}`, {
              method: 'DELETE',
              headers
            });
          }
        } catch (e) {
          console.warn('Failed to delete order from backend database:', e);
        }

        return true;
      }
      return false;
    },

    /**
     * Zone A: Lookup Order by 3-digit Alphanumeric Code (e.g. C4X)
     * Returns order details to show in confirmation modal
     */
    async lookupIntakeOrder(rawCode, activeStoreId = null) {
      if (!rawCode || !rawCode.trim()) {
        return { success: false, message: 'Please enter a 3-character intake code.' };
      }

      const cleanCode = rawCode.trim().toUpperCase();
      let order = this.orders.find(o => 
        (o.intake_code && o.intake_code.toUpperCase() === cleanCode) ||
        (o.short_code && o.short_code.toUpperCase() === cleanCode) ||
        (o.order_id && o.order_id.toUpperCase().endsWith(cleanCode))
      );

      // Real-time backend query fallback if not found in local Pinia memory
      if (!order && typeof fetch !== 'undefined') {
        try {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const storeParam = activeStoreId ? `?storeId=${encodeURIComponent(activeStoreId)}` : '';
          const res = await fetch(`/api/orders/lookup/${encodeURIComponent(cleanCode)}${storeParam}`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data && data.order) {
              order = data.order;
              const existIdx = this.orders.findIndex(o => o.order_id === order.order_id);
              if (existIdx >= 0) {
                this.orders[existIdx] = order;
              } else {
                this.orders.unshift(order);
              }
              saveStoredOrders(this.orders);
            }
          }
        } catch (e) {}
      }

      if (!order) {
        return { 
          success: false, 
          message: `Intake Code #${cleanCode} not found. Please verify customer phone screen.` 
        };
      }

      const targetStore = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      if (targetStore && targetStore !== '*' && targetStore !== 'HQ Central') {
        // Compare by store CODE using the live directory (names may have been renamed)
        await loadStoreDirectory();
        const orderStore = order.store_code || order.store_id || order.store_name;
        if (orderStore) {
          const match = isSameStore(order.store_code, targetStore) ||
                        isSameStore(order.store_id, targetStore) ||
                        isSameStore(order.store_name, targetStore);
          if (!match) {
            const orderInfo = getCanonicalStore(orderStore);
            const stationInfo = getCanonicalStore(targetStore);
            const label = (info, fallback) => (info ? `${info.name} (${info.code})` : fallback);
            return {
              success: false,
              message: `Order #${cleanCode} was submitted for ${label(orderInfo, orderStore)}. Cannot process at ${label(stationInfo, targetStore)}.`
            };
          }
        }
      }

      if (order.status === 'engraving_in_progress') {
        return { 
          success: false, 
          message: `Order #${order.short_code || order.system_queue_number} is currently engraving on a laser station.` 
        };
      }

      if (order.status === 'ready_for_pickup') {
        return { 
          success: false, 
          message: `Order #${order.short_code || order.system_queue_number} is already completed.` 
        };
      }

      if (order.status === 'in_queue') {
        const qNum = order.system_queue_number || order.short_code || cleanCode;
        return {
          success: true,
          order,
          alreadyInQueue: true,
          nextQueueNumber: qNum,
          message: `Order #${qNum} has already been received and is currently in queue.`
        };
      }

      const storeForNumber = order.store_id || order.store_code || order.store_name || targetStore;
      const nextQueueNumber = this.getNextSystemQueueNumber(storeForNumber);

      return {
        success: true,
        order,
        nextQueueNumber
      };
    },

    /**
     * Zone A: Confirm Intake from Pop-up Modal
     * Moves order to in_queue, assigns official 4-digit system queue number (e.g. #0021)
     */
    async confirmOrderIntake(orderId, activeStoreId = null) {
      let order = this.orders.find(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      
      // Real-time backend fetch fallback if not in local memory
      if (!order && typeof fetch !== 'undefined') {
        try {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch(`/api/orders/lookup/${encodeURIComponent(orderId)}`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (data && data.order) {
              order = data.order;
              this.orders.unshift(order);
            }
          }
        } catch (e) {}
      }

      if (!order) {
        return { success: false, message: 'Order not found.' };
      }

      const targetStore = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      if (targetStore && targetStore !== '*' && targetStore !== 'HQ Central') {
        const orderStore = order.store_id || order.store_code || order.store_name;
        if (orderStore) {
          const match = isSameStore(order.store_id, targetStore) || 
                        isSameStore(order.store_code, targetStore) || 
                        isSameStore(order.store_name, targetStore);
          if (!match) {
            return {
              success: false,
              message: `Order belongs to Store "${orderStore}". Cannot confirm intake at Store "${targetStore}".`
            };
          }
        }
      }

      const isAlreadyInQueue = order.status === 'in_queue';

      let newQueueNumber = order.system_queue_number;
      if (!newQueueNumber) {
        const storeForNumber = order.store_id || order.store_code || order.store_name || targetStore;
        newQueueNumber = this.getNextSystemQueueNumber(storeForNumber);
      }
      
      // Update order to in_queue with official 4-digit system queue number
      order.status = 'in_queue';
      order.system_queue_number = newQueueNumber;
      order.short_code = newQueueNumber; // Update ticket code to #0021
      if (!order.intake_at) {
        order.intake_at = new Date().toISOString();
      }
      
      // AWAIT server persistence BEFORE notifying customer to eliminate race conditions
      if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined' && order.order_id) {
        try {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const putRes = await fetch(`/api/orders/${encodeURIComponent(order.order_id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(order)
          });
          if (putRes.ok) {
            const data = await putRes.json();
            if (data?.order) {
              Object.assign(order, data.order);
            }
          }
        } catch (e) {
          console.warn('Network error syncing intake to server:', e);
        }
      }

      saveStoredOrders(this.orders);
      if (isStationControllerContext()) {
        this.autoAssignMachines(targetStore);
      }

      // Trigger WhatsApp notification for order received / accepted ONLY if not already notified / in-queue
      if (!isAlreadyInQueue) {
        sendWhatsAppNotification(order, 'order_accepted');
      }

      return {
        success: true,
        order,
        newQueueNumber,
        message: isAlreadyInQueue
          ? `Order #${newQueueNumber} is already in the queue. Updated station assignment.`
          : `Cup intake confirmed! Assigned Queue #${newQueueNumber}.`
      };
    },

    /**
     * Auto-Pull Engine:
     * 1. Validate existing machine assignments against actual active orders and isolated store.
     * 2. Release orders from disabled/inactive machines immediately back to the queue pool.
     * 3. Clean up stale/completed/cancelled order IDs.
     * 4. Pull top pending orders into any active idle machines (Machine 01 first for oldest Customer A, then Machine 02 for Customer B, Customer 03 waits).
     */
    autoAssignMachines(targetStoreId = null) {
      if (!isStationControllerContext()) return;
      const storeId = targetStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);

      // Step 1: Clean up invalid/completed orders OR orders on INACTIVE machines
      for (const machine of this.machines) {
        if (machine.isActive === false) {
          // If machine is disabled, it MUST NEVER hold an order!
          if (machine.currentOrderId) {
            const heldOrder = this.orders.find(o => o.order_id === machine.currentOrderId);
            if (heldOrder && heldOrder.status === 'engraving_in_progress') {
              heldOrder.status = 'in_queue';
              heldOrder.assigned_machine = null;
              saveStoredOrders(this.orders);
            }
            machine.currentOrderId = null;
            machine.status = 'idle';
            machine.timerSeconds = 0;
            machine.currentItemIndex = 0;
          }
        } else if (machine.currentOrderId) {
          const assignedOrder = this.orders.find(o => o.order_id === machine.currentOrderId);
          const isStoreMismatch = (storeId && storeId !== '*' && storeId !== 'HQ Central' && assignedOrder)
            ? !(isSameStore(assignedOrder.store_id, storeId) || isSameStore(assignedOrder.store_code, storeId) || isSameStore(assignedOrder.store_name, storeId))
            : false;

          if (!assignedOrder || isStoreMismatch || assignedOrder.status === 'ready_for_pickup' || assignedOrder.status === 'cancelled' || assignedOrder.status === 'pending_dropoff') {
            machine.currentOrderId = null;
            machine.status = 'idle';
            machine.timerSeconds = 0;
            machine.currentItemIndex = 0;
          }
        }
      }

      // Step 2: Collect currently assigned active IDs ONLY from ACTIVE online machines
      const currentlyAssignedIds = this.machines
        .filter(m => m.isActive !== false)
        .map(m => m.currentOrderId)
        .filter(Boolean);

      // Step 3: Find available queued orders not yet on an active online station, sorted oldest first (FIFO)
      const availablePending = this.orders
        .filter(o => {
          if (o.status !== 'in_queue' && o.status !== 'engraving_in_progress') return false;
          if (currentlyAssignedIds.includes(o.order_id)) return false;
          if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
            const match = isSameStore(o.store_id, storeId) || isSameStore(o.store_code, storeId) || isSameStore(o.store_name, storeId);
            if (!match) return false;
          }
          return true;
        })
        .slice()
        .sort((a, b) => {
          const timeA = new Date(a.intake_at || a.created_at || 0).getTime();
          const timeB = new Date(b.intake_at || b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const numA = parseInt(a.system_queue_number || a.short_code, 10) || 0;
          const numB = parseInt(b.system_queue_number || b.short_code, 10) || 0;
          return numA - numB;
        });

      // Step 4: Auto-assign into idle ACTIVE machines only (Machine 01 gets Customer A, Machine 02 gets Customer B, Customer 03 waits)
      for (const machine of this.machines) {
        if (machine.isActive !== false && !machine.currentOrderId && availablePending.length > 0) {
          const nextOrder = availablePending.shift();
          machine.currentOrderId = nextOrder.order_id;
          machine.currentItemIndex = 0;
          machine.status = nextOrder.status === 'engraving_in_progress' ? 'engraving' : 'idle';
          machine.timerSeconds = 0;
        }
      }

      this.saveMachinesState();
    },

    assignOrderToMachine(orderId, machineId = null) {
      let targetMachine = null;
      if (machineId) {
        targetMachine = this.machines.find(m => m.id === machineId && m.isActive !== false && m.status !== 'engraving');
      }
      if (!targetMachine) {
        // Priority 1: First active machine that is completely free (no order assigned)
        targetMachine = this.machines.find(m => m.isActive !== false && !m.currentOrderId);
      }
      if (!targetMachine) {
        // Priority 2: First active machine that is idle (not actively engraving)
        targetMachine = this.machines.find(m => m.isActive !== false && m.status !== 'engraving');
      }
      if (!targetMachine) return false;

      const order = this.orders.find(o => o.order_id === orderId || o.short_code === orderId);
      if (!order) return false;

      targetMachine.currentOrderId = order.order_id;
      targetMachine.currentItemIndex = 0;
      targetMachine.status = order.status === 'engraving_in_progress' ? 'engraving' : 'idle';
      targetMachine.timerSeconds = 0;
      this.saveMachinesState();
      return true;
    },

    toggleMachineActive(machineId) {
      const machine = this.machines.find(m => m.id === machineId);
      if (machine) {
        machine.isActive = machine.isActive === undefined ? false : !machine.isActive;
        if (!machine.isActive) {
          // Immediately release held order back to the queue pool
          if (machine.currentOrderId) {
            const heldOrder = this.orders.find(o => o.order_id === machine.currentOrderId);
            if (heldOrder && heldOrder.status === 'engraving_in_progress') {
              heldOrder.status = 'in_queue';
              heldOrder.assigned_machine = null;
              saveStoredOrders(this.orders);
            }
            machine.currentOrderId = null;
            machine.status = 'idle';
            machine.timerSeconds = 0;
            machine.currentItemIndex = 0;
          }
        }
        this.saveMachinesState();
        this.autoAssignMachines();
      }
    },

    setMachineActive(machineId, isActive) {
      const machine = this.machines.find(m => m.id === machineId);
      if (machine) {
        machine.isActive = Boolean(isActive);
        if (!machine.isActive) {
          if (machine.currentOrderId) {
            const heldOrder = this.orders.find(o => o.order_id === machine.currentOrderId);
            if (heldOrder && heldOrder.status === 'engraving_in_progress') {
              heldOrder.status = 'in_queue';
              heldOrder.assigned_machine = null;
              saveStoredOrders(this.orders);
            }
            machine.currentOrderId = null;
            machine.status = 'idle';
            machine.timerSeconds = 0;
            machine.currentItemIndex = 0;
          }
        }
        this.saveMachinesState();
        this.autoAssignMachines();
      }
    },

    startMachine(machineId) {
      const machine = this.machines.find(m => m.id === machineId);
      if (!machine || !machine.currentOrderId) return;

      machine.status = 'engraving';
      machine.timerSeconds = 0;
      
      const order = this.orders.find(o => o.order_id === machine.currentOrderId);
      if (order) {
        order.status = 'engraving_in_progress';
        order.assigned_machine = machine.name;
        order.engraving_started_at = new Date().toISOString();
        saveStoredOrders(this.orders);

        if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined') {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(`/api/orders/${encodeURIComponent(order.order_id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(order)
          }).catch(e => console.warn('Network error saving engraving status:', e));
        }
      }

      this.saveMachinesState();
    },

    /**
     * State 2 -> State 3: DONE. NOTIFY CUSTOMER
     */
    completeMachine(machineId) {
      const machine = this.machines.find(m => m.id === machineId);
      if (!machine || !machine.currentOrderId) return;

      const order = this.orders.find(o => o.order_id === machine.currentOrderId);
      if (order) {
        const currentItem = order.items?.[machine.currentItemIndex || 0] || order.items?.[0] || {};
        
        logEngravingAnalytics({
          orderId: order.order_id,
          shortCode: order.short_code,
          machineId: machine.id,
          machineName: machine.name,
          durationSeconds: machine.timerSeconds,
          customerName: order.customer_name,
          model: currentItem.model,
          size: currentItem.size,
          orientation: currentItem.position,
          font: currentItem.font,
          text: currentItem.text
        });

        // Update status in local memory immediately
        order.status = 'ready_for_pickup';
        order.ready_at = new Date().toISOString();
        saveStoredOrders(this.orders);

        if (typeof window !== 'undefined' && window.location && typeof fetch !== 'undefined') {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_staff_token') : null;
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          fetch(`/api/orders/${encodeURIComponent(order.order_id)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(order)
          }).catch(e => console.warn('Network error saving completed order status:', e));
        }

        // Send pickup notification to customer with updated ready_for_pickup status
        sendWhatsAppNotification(order, 'order_completed');
      }

      machine.status = 'idle';
      machine.currentOrderId = null;
      machine.currentItemIndex = 0;
      machine.timerSeconds = 0;

      this.saveMachinesState();
      const storeId = typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null;
      if (isStationControllerContext()) {
        this.autoAssignMachines(storeId);
      }
    },

    tickTimers() {
      for (const machine of this.machines) {
        if (machine.status === 'engraving') {
          machine.timerSeconds++;
        }
      }
    },

    setMachineItemIndex(machineId, index) {
      const machine = this.machines.find(m => m.id === machineId);
      if (machine) {
        const order = this.getAssignedOrder(machine);
        const maxIndex = (order?.items?.length || 1) - 1;
        if (index >= 0 && index <= maxIndex) {
          machine.currentItemIndex = index;
        }
      }
    }
  }
});
