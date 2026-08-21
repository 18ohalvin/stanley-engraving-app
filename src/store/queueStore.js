import { defineStore } from 'pinia';
import { getStoredOrders, saveStoredOrders, fetchServerOrders, getBroadcastChannel, broadcastSyncMessage } from '../utils/storage.js';
import { logEngravingAnalytics, sendWhatsAppNotification } from '../utils/analyticsService.js';
import { formatSystemQueueNumber } from '../utils/formatters.js';

// Clean empty starting state for production deployment
const INITIAL_SEED_ORDERS = [];

function getStoredMachines() {
  try {
    const data = localStorage.getItem('stanley_machines_state');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return null;
}

export const useQueueStore = defineStore('queue', {
  state: () => {
    let stored = getStoredOrders();
    if (!stored || !Array.isArray(stored)) {
      stored = INITIAL_SEED_ORDERS;
      saveStoredOrders(stored);
    }

    const defaultMachines = [
      {
        id: 'machine-01',
        name: 'Machine 01',
        isActive: true,
        status: 'idle', // 'idle' | 'engraving'
        currentOrderId: null,
        currentItemIndex: 0,
        timerSeconds: 0,
        image: '/src/assets/images/product-step1.png'
      },
      {
        id: 'machine-02',
        name: 'Machine 02',
        isActive: true,
        status: 'idle',
        currentOrderId: null,
        currentItemIndex: 0,
        timerSeconds: 0,
        image: '/src/assets/images/product-step1.png'
      }
    ];

    const storedMachines = getStoredMachines();
    const machines = defaultMachines.map(dm => {
      const found = storedMachines?.find(sm => sm.id === dm.id);
      return found ? { ...dm, ...found } : dm;
    });

    return {
      orders: stored,
      // 2 Physical laser machine stations matching Figma 17:635 & 87:393
      machines
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

      const isSameStore = (storeA, storeB) => {
        if (!storeA || !storeB) return false;
        if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;
        const a = String(storeA).trim().toLowerCase();
        const b = String(storeB).trim().toLowerCase();
        if (!a || !b) return false;
        if (a === b) return true;
        const cleanA = a.replace(/[^a-z0-9]/g, '');
        const cleanB = b.replace(/[^a-z0-9]/g, '');
        if (!cleanA || !cleanB) return false;
        return cleanA === cleanB;
      };

      const storeId = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);

      return state.orders
        .filter(o => {
          if (o.status !== 'in_queue' || activeAssignedIds.includes(o.order_id)) return false;
          if (storeId && storeId !== '*' && storeId !== 'HQ Central') {
            const matchId = isSameStore(o.store_id, storeId);
            const matchCode = isSameStore(o.store_code, storeId);
            const matchName = isSameStore(o.store_name, storeId);
            if (!matchId && !matchCode && !matchName) return false;
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
      return state.orders.find(o => 
        (o.order_id && o.order_id.toUpperCase() === cleanCode) || 
        (o.intake_code && o.intake_code.toUpperCase() === cleanCode) ||
        (o.short_code && o.short_code.toUpperCase() === cleanCode) ||
        (o.system_queue_number && o.system_queue_number.toUpperCase() === cleanCode) ||
        (o.order_id && o.order_id.toUpperCase().endsWith(cleanCode))
      );
    },

    getAssignedOrder: (state) => (machine) => {
      if (!machine || !machine.currentOrderId) return null;
      return state.orders.find(o => o.order_id === machine.currentOrderId) || null;
    }
  },

  actions: {
    async refreshFromStorage() {
      // Fetch central network server orders first
      const remote = await fetchServerOrders();
      if (remote && Array.isArray(remote)) {
        this.orders = remote;
      } else {
        const fresh = getStoredOrders();
        if (fresh && Array.isArray(fresh)) {
          this.orders = fresh;
        }
      }
      this.refreshMachinesFromStorage();
      this.autoAssignMachines();
    },

    initRealtimeSync() {
      if (typeof window === 'undefined') return;

      this.refreshFromStorage();

      // Listen to cross-tab zero-latency BroadcastChannel
      const channel = getBroadcastChannel();
      if (channel) {
        channel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'orders_updated' && Array.isArray(payload)) {
            this.orders = payload;
            this.autoAssignMachines();
          } else if (type === 'machines_updated' && Array.isArray(payload)) {
            payload.forEach(storedM => {
              const target = this.machines.find(m => m.id === storedM.id);
              if (target) {
                target.status = storedM.status;
                target.currentOrderId = storedM.currentOrderId;
                target.timerSeconds = storedM.timerSeconds;
                target.currentItemIndex = storedM.currentItemIndex;
                if (storedM.isActive !== undefined) target.isActive = storedM.isActive;
              }
            });
          }
        };
      }

      // Listen to native window storage events across tabs
      window.addEventListener('storage', (e) => {
        if (e.key === 'stanley_engraving_orders' || e.key === 'stanley_machines_state' || e.key === 'stanley_product_catalog_order') {
          this.refreshFromStorage();
        }
      });

      // Listen to in-app custom event
      window.addEventListener('stanley_orders_updated', () => {
        this.refreshFromStorage();
      });

      // Listen to real-time events broadcasted across devices over LAN/WiFi via SSE
      if (typeof EventSource !== 'undefined') {
        try {
          const es = new EventSource('/api/events');
          es.addEventListener('orders_updated', (e) => {
            try {
              const updated = JSON.parse(e.data);
              if (Array.isArray(updated)) {
                this.orders = updated;
                this.autoAssignMachines();
              }
            } catch (err) {}
          });
        } catch (e) {}
      }

      // Fast network polling sync (every 1.5s) for rock-solid cross-device sync
      setInterval(() => {
        this.refreshFromStorage();
      }, 1500);
    },

    resetDatabase() {
      this.orders = JSON.parse(JSON.stringify(INITIAL_SEED_ORDERS));
      saveStoredOrders(this.orders);
      for (const m of this.machines) {
        m.currentOrderId = null;
        m.status = 'idle';
        m.timerSeconds = 0;
        m.currentItemIndex = 0;
      }
      this.saveMachinesState();
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('stanley_engraving_analytics_logs');
          localStorage.removeItem('stanley_whatsapp_webhook_logs');
        }
      } catch (e) {}
      this.autoAssignMachines();
    },

    getNextSystemQueueNumber(targetStoreId = null) {
      const storeId = targetStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      
      const getYYYYMMDD = (dateInput) => {
        if (!dateInput) return new Date().toISOString().split('T')[0];
        if (typeof dateInput === 'string') {
          const match = dateInput.match(/^\d{4}-\d{2}-\d{2}/);
          if (match) return match[0];
        }
        try {
          const d = new Date(dateInput);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {}
        return new Date().toISOString().split('T')[0];
      };

      const todayStr = getYYYYMMDD(new Date());

      const isSameStore = (storeA, storeB) => {
        if (!storeA || !storeB) return false;
        if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;
        const a = String(storeA).trim().toLowerCase();
        const b = String(storeB).trim().toLowerCase();
        if (!a || !b) return false;
        if (a === b) return true;
        const cleanA = a.replace(/[^a-z0-9]/g, '');
        const cleanB = b.replace(/[^a-z0-9]/g, '');
        if (!cleanA || !cleanB) return false;
        return cleanA === cleanB;
      };

      const filtered = this.orders.filter(o => {
        if (o.status === 'pending_dropoff' || o.status === 'cancelled') return false;
        if (storeId && storeId !== '*') {
          const matchId = isSameStore(o.store_id, storeId);
          const matchCode = isSameStore(o.store_code, storeId);
          const matchName = isSameStore(o.store_name, storeId);
          if (!matchId && !matchCode && !matchName) return false;
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
    },

    updateStatus(orderId, newStatus) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        this.orders[index].status = newStatus;
        this.orders[index].updated_at = new Date().toISOString();
        saveStoredOrders(this.orders);
        return this.orders[index];
      }
      return null;
    },

    cancelOrder(orderId) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        this.orders[index].status = 'cancelled';
        saveStoredOrders(this.orders);

        const machine = this.machines.find(m => m.currentOrderId === orderId);
        if (machine) {
          machine.currentOrderId = null;
          machine.status = 'idle';
          machine.timerSeconds = 0;
          this.autoAssignMachines();
        }
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
        saveStoredOrders(this.orders);
        this.autoAssignMachines();
        return this.orders[index];
      }
      return null;
    },

    deleteOrder(orderId) {
      const index = this.orders.findIndex(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (index !== -1) {
        this.orders.splice(index, 1);
        saveStoredOrders(this.orders);

        const machine = this.machines.find(m => m.currentOrderId === orderId);
        if (machine) {
          machine.currentOrderId = null;
          machine.status = 'idle';
          machine.timerSeconds = 0;
          this.autoAssignMachines();
        }
        return true;
      }
      return false;
    },

    /**
     * Zone A: Lookup Order by 3-digit Alphanumeric Code (e.g. C4X)
     * Returns order details to show in confirmation modal
     */
    lookupIntakeOrder(rawCode, activeStoreId = null) {
      if (!rawCode || !rawCode.trim()) {
        return { success: false, message: 'Please enter a 3-character intake code.' };
      }

      const cleanCode = rawCode.trim().toUpperCase();
      const order = this.orders.find(o => 
        (o.intake_code && o.intake_code.toUpperCase() === cleanCode) ||
        (o.short_code && o.short_code.toUpperCase() === cleanCode) ||
        (o.order_id && o.order_id.toUpperCase().endsWith(cleanCode))
      );

      if (!order) {
        return { 
          success: false, 
          message: `Intake Code #${cleanCode} not found. Please verify customer phone screen.` 
        };
      }

      const isSameStore = (storeA, storeB) => {
        if (!storeA || !storeB) return false;
        if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;
        const a = String(storeA).trim().toLowerCase();
        const b = String(storeB).trim().toLowerCase();
        if (!a || !b) return false;
        if (a === b) return true;
        const cleanA = a.replace(/[^a-z0-9]/g, '');
        const cleanB = b.replace(/[^a-z0-9]/g, '');
        if (!cleanA || !cleanB) return false;
        return cleanA === cleanB;
      };

      const targetStore = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      if (targetStore && targetStore !== '*' && targetStore !== 'HQ Central') {
        const orderStore = order.store_id || order.store_code || order.store_name;
        if (orderStore) {
          const matchId = isSameStore(order.store_id, targetStore);
          const matchCode = isSameStore(order.store_code, targetStore);
          const matchName = isSameStore(order.store_name, targetStore);
          if (!matchId && !matchCode && !matchName) {
            return {
              success: false,
              message: `Order #${cleanCode} was submitted for Store "${orderStore}". Cannot process at Store "${targetStore}".`
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
    confirmOrderIntake(orderId, activeStoreId = null) {
      const order = this.orders.find(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (!order) {
        return { success: false, message: 'Order not found.' };
      }

      const isSameStore = (storeA, storeB) => {
        if (!storeA || !storeB) return false;
        if (storeA === '*' || storeB === '*' || storeA === 'HQ Central' || storeB === 'HQ Central') return true;
        const a = String(storeA).trim().toLowerCase();
        const b = String(storeB).trim().toLowerCase();
        if (!a || !b) return false;
        if (a === b) return true;
        const cleanA = a.replace(/[^a-z0-9]/g, '');
        const cleanB = b.replace(/[^a-z0-9]/g, '');
        if (!cleanA || !cleanB) return false;
        return cleanA === cleanB;
      };

      const targetStore = activeStoreId || (typeof localStorage !== 'undefined' ? localStorage.getItem('stanley_user_store') : null);
      if (targetStore && targetStore !== '*' && targetStore !== 'HQ Central') {
        const orderStore = order.store_id || order.store_code || order.store_name;
        if (orderStore) {
          const matchId = isSameStore(order.store_id, targetStore);
          const matchCode = isSameStore(order.store_code, targetStore);
          const matchName = isSameStore(order.store_name, targetStore);
          if (!matchId && !matchCode && !matchName) {
            return {
              success: false,
              message: `Order belongs to Store "${orderStore}". Cannot confirm intake at Store "${targetStore}".`
            };
          }
        }
      }

      let newQueueNumber = order.system_queue_number;
      if (!newQueueNumber) {
        const storeForNumber = order.store_id || order.store_code || order.store_name || targetStore;
        newQueueNumber = this.getNextSystemQueueNumber(storeForNumber);
      }
      
      // Update order to in_queue with official 4-digit system queue number
      order.status = 'in_queue';
      order.system_queue_number = newQueueNumber;
      order.short_code = newQueueNumber; // Update ticket code to #0021
      order.intake_at = new Date().toISOString();
      
      saveStoredOrders(this.orders);
      
      // If there's an idle machine, load this order into it immediately
      const idleActiveMachine = this.machines.find(m => m.isActive !== false && (!m.currentOrderId || m.status === 'idle'));
      if (idleActiveMachine && idleActiveMachine.status !== 'engraving') {
        idleActiveMachine.currentOrderId = order.order_id;
        idleActiveMachine.currentItemIndex = 0;
        idleActiveMachine.status = 'idle';
        idleActiveMachine.timerSeconds = 0;
        this.saveMachinesState();
      }

      this.autoAssignMachines();

      return {
        success: true,
        order,
        newQueueNumber,
        message: `Cup intake confirmed! Assigned Queue #${newQueueNumber}.`
      };
    },

    /**
     * Auto-Pull Engine:
     * 1. Validate existing machine assignments against actual active orders.
     * 2. Release orders from disabled/inactive machines immediately back to the queue pool.
     * 3. Clean up stale/completed/cancelled order IDs.
     * 4. Pull top pending orders into any active idle machines.
     */
    autoAssignMachines() {
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
          if (!assignedOrder || assignedOrder.status === 'ready_for_pickup' || assignedOrder.status === 'cancelled' || assignedOrder.status === 'pending_dropoff') {
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
        .filter(o => 
          (o.status === 'in_queue' || o.status === 'engraving_in_progress') && 
          !currentlyAssignedIds.includes(o.order_id)
        )
        .slice()
        .sort((a, b) => {
          const timeA = new Date(a.intake_at || a.created_at || 0).getTime();
          const timeB = new Date(b.intake_at || b.created_at || 0).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const numA = parseInt(a.system_queue_number || a.short_code, 10) || 0;
          const numB = parseInt(b.system_queue_number || b.short_code, 10) || 0;
          return numA - numB;
        });

      // Step 4: Auto-assign into idle ACTIVE machines only (oldest customer first)
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
        targetMachine = this.machines.find(m => m.id === machineId && m.isActive !== false);
      }
      if (!targetMachine) {
        targetMachine = this.machines.find(m => m.isActive !== false && m.status !== 'engraving') || this.machines.find(m => m.isActive !== false);
      }
      const order = this.orders.find(o => o.order_id === orderId || o.short_code === orderId);
      if (!targetMachine || !order) return false;

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

    saveMachinesState() {
      try {
        localStorage.setItem('stanley_machines_state', JSON.stringify(this.machines));
        broadcastSyncMessage('machines_updated', this.machines);
      } catch (e) {}
    },

    refreshMachinesFromStorage() {
      try {
        const data = localStorage.getItem('stanley_machines_state');
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            parsed.forEach(storedM => {
              const target = this.machines.find(m => m.id === storedM.id);
              if (target) {
                if (storedM.isActive !== undefined) target.isActive = storedM.isActive;
              }
            });
          }
        }
      } catch (e) {}
    },

    /**
     * State 1 -> State 2: START ENGRAVING
     */
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
      }
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

        sendWhatsAppNotification(order);

        order.status = 'ready_for_pickup';
        order.ready_at = new Date().toISOString();
        saveStoredOrders(this.orders);
      }

      machine.status = 'idle';
      machine.currentOrderId = null;
      machine.currentItemIndex = 0;
      machine.timerSeconds = 0;

      this.autoAssignMachines();
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
