import { defineStore } from 'pinia';
import { containsProfanity, sanitizeEngravingText } from '../utils/profanityFilter.js';
import { generateOrderId, generateIntakeCode, generateShortCode, formatBookingTime, formatPhoneNumber } from '../utils/formatters.js';
import { useQueueStore } from './queueStore.js';

export const FONT_OPTIONS = [
  { id: 'lato', name: 'Helvetica Bold', label: 'AA', fontClass: 'font-engraving-lato', previewText: 'HELVETICA', allCaps: true },
  { id: 'lobster', name: 'Lobster', label: 'Aa', fontClass: 'font-engraving-lobster', previewText: 'Lobster', allCaps: false },
  { id: 'caveat', name: 'Caveat', label: 'Aa', fontClass: 'font-engraving-caveat', previewText: 'Caveat', allCaps: false },
  { id: 'pinyon', name: 'Pinyon Script', label: 'Aa', fontClass: 'font-engraving-pinyon', previewText: 'Pinyon', allCaps: false },
  { id: 'abeezee', name: 'ABeeZee', label: 'Aa', fontClass: 'font-engraving-abeezee', previewText: 'ABeeZee', allCaps: false }
];

export const CUP_MODELS = [
  {
    id: 'iceflow-flipstraw',
    name: 'The IceFlow™ Flip Straw Tumbler',
    shortName: 'IceFlow Flip Straw',
    sizes: ['40oz', '30oz', '20oz'],
    image: '/src/assets/images/product-step1.png',
    placementImage: '/src/assets/images/product-step2.png',
    positions: ['Horizontal', 'Vertical']
  },
  {
    id: 'quencher-h20',
    name: 'Quencher H2.0 30oz',
    shortName: 'Quencher H2.0',
    sizes: ['20 Oz', '30 Oz', '40 Oz'],
    image: '/src/assets/images/machine-cup-1.png',
    placementImage: '/src/assets/images/product-step2.png',
    positions: ['Horizontal', 'Vertical']
  },
  {
    id: 'aerolight-transit',
    name: 'The Aerolight™ Transit Bottle',
    shortName: 'Aerolight Transit',
    sizes: ['16 Oz', '20 Oz'],
    image: '/src/assets/images/product-iceflow-fastflow.png',
    placementImage: '/src/assets/images/product-step2.png',
    positions: ['Horizontal', 'Vertical']
  }
];

export function getCatalogCupModels() {
  try {
    const saved = localStorage.getItem('stanley_product_catalog_order');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const active = parsed.filter(p => p.isActive !== false);
        if (active.length > 0) {
          return active.map(p => ({
            id: p.id || p.modelKey || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: p.name,
            shortName: p.name.replace(/™|®/g, '').split(' ').slice(0, 2).join(' '),
            sizes: (p.availableSizes && p.availableSizes.length > 0) ? p.availableSizes : ['20 Oz', '30 Oz', '40 Oz'],
            image: p.image || '/src/assets/images/product-step1.png',
            placementImage: p.engravedImage || '/src/assets/images/product-step2.png',
            positions: (p.availablePositions && p.availablePositions.length > 0) ? p.availablePositions : ['Horizontal', 'Vertical']
          }));
        }
      }
    }
  } catch (e) {
    console.error('Error reading catalog cup models:', e);
  }
  return CUP_MODELS;
}

export const useEngravingStore = defineStore('engraving', {
  state: () => ({
    // Current draft item being configured
    currentItem: {
      model: 'The IceFlow™ Flip Straw Tumbler',
      shortName: 'IceFlow',
      size: '',
      position: 'Horizontal',
      text: '',
      font: 'Helvetica Bold',
      fontId: 'lato',
      fontClass: 'font-engraving-lato'
    },
    // Final cart items list
    items: [],
    // Index if editing an existing item from cart
    editingIndex: null,
    // Customer information
    customer: {
      name: '',
      countryCode: '+62',
      phone: '',
      email: ''
    },
    // Store Context for Independent Customer PWA Form
    storeContext: {
      storeCode: '',
      storeId: '',
      storeName: ''
    }
  }),

  getters: {
    hasProfanity: (state) => containsProfanity(state.currentItem.text),
    isStep1Valid: (state) => Boolean(state.currentItem.model && state.currentItem.size),
    isStep2Valid: (state) => Boolean(state.currentItem.position),
    isStep3Valid: (state) => {
      const text = state.currentItem.text.trim();
      return text.length > 0 && text.length <= 7 && !containsProfanity(text);
    },
    isCustomerValid: (state) => {
      const name = state.customer.name.trim();
      const phone = state.customer.phone.replace(/[^0-9]/g, '');
      return name.length >= 2 && phone.length >= 6;
    },
    cartCount: (state) => state.items.length
  },

  actions: {
    setModel(modelName, shortName) {
      this.currentItem.model = modelName;
      this.currentItem.shortName = shortName || modelName;
    },

    setSize(size) {
      this.currentItem.size = size;
    },

    setPosition(position) {
      this.currentItem.position = position;
    },

    setText(text) {
      const isAllCaps = FONT_OPTIONS.find(f => f.id === this.currentItem.fontId)?.allCaps ?? false;
      this.currentItem.text = sanitizeEngravingText(text || '', 7, isAllCaps);
    },

    setFont(fontInput, fontClassInput, nameInput) {
      let selectedOption = null;
      if (typeof fontInput === 'object' && fontInput !== null) {
        selectedOption = fontInput;
        this.currentItem.font = fontInput.name || fontInput.id;
        this.currentItem.fontId = fontInput.id;
        this.currentItem.fontClass = fontInput.fontClass;
      } else if (typeof fontInput === 'string') {
        const found = FONT_OPTIONS.find(f => f.id === fontInput || f.fontClass === fontInput);
        if (found) {
          selectedOption = found;
          this.currentItem.font = found.name;
          this.currentItem.fontId = found.id;
          this.currentItem.fontClass = found.fontClass;
        } else {
          this.currentItem.fontId = fontInput;
          this.currentItem.fontClass = fontClassInput || `font-engraving-${fontInput}`;
          this.currentItem.font = nameInput || fontInput;
        }
      }
      if (selectedOption?.allCaps && this.currentItem.text) {
        this.currentItem.text = this.currentItem.text.toUpperCase();
      }
    },

    /**
     * Commits the current draft item into the items array
     */
    saveCurrentItem() {
      const fontOption = FONT_OPTIONS.find(f => f.id === this.currentItem.fontId) || FONT_OPTIONS[0];
      const rawText = (this.currentItem.text || '').trim();
      const finalText = fontOption.allCaps 
        ? (rawText.toUpperCase() || 'STANLEY') 
        : (rawText || 'Stanley');

      const itemToSave = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        model: this.currentItem.model,
        shortName: this.currentItem.shortName || 'IceFlow',
        size: this.currentItem.size || '40oz',
        position: this.currentItem.position || 'Horizontal',
        text: finalText,
        font: this.currentItem.font || fontOption.name,
        fontId: this.currentItem.fontId || fontOption.id,
        fontClass: this.currentItem.fontClass || fontOption.fontClass
      };

      if (this.editingIndex !== null && this.editingIndex >= 0 && this.editingIndex < this.items.length) {
        this.items[this.editingIndex] = itemToSave;
        this.editingIndex = null;
      } else {
        this.items.push(itemToSave);
      }

      // Reset draft for potential next item
      this.resetDraft();
    },

    saveCurrentItemToCart() {
      return this.saveCurrentItem();
    },

    resetDraft() {
      this.currentItem = {
        model: 'The IceFlow™ Flip Straw Tumbler',
        shortName: 'IceFlow',
        size: '',
        position: 'Horizontal',
        text: '',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      };
      this.editingIndex = null;
    },

    restoreDraftFromCart() {
      if ((!this.currentItem.size || !this.currentItem.text) && this.items.length > 0) {
        const lastIdx = this.items.length - 1;
        if (this.items[lastIdx]) {
          this.currentItem = { ...this.items[lastIdx] };
          this.editingIndex = lastIdx;
        }
      }
    },

    editItem(index) {
      if (index >= 0 && index < this.items.length) {
        const item = this.items[index];
        this.currentItem = { ...item };
        this.editingIndex = index;
      }
    },

    deleteItem(index) {
      if (index >= 0 && index < this.items.length) {
        this.items.splice(index, 1);
      }
    },

    setCustomerDetails({ name, countryCode, phone, email }) {
      if (name !== undefined) this.customer.name = name;
      if (countryCode !== undefined) this.customer.countryCode = countryCode;
      if (phone !== undefined) this.customer.phone = phone;
      if (email !== undefined) this.customer.email = email;
    },

    initStoreContextFromParams(queryParams = {}) {
      const codeParam = queryParams.store || queryParams.store_code || queryParams.storeId || '';
      if (!codeParam) {
        try {
          const cachedCode = localStorage.getItem('stanley_pwa_store_code') || '';
          const cachedName = localStorage.getItem('stanley_pwa_store_name') || '';
          if (cachedCode) {
            this.storeContext.storeCode = cachedCode;
            this.storeContext.storeId = cachedCode;
            this.storeContext.storeName = cachedName || cachedCode;
          }
        } catch (e) {}
        return;
      }

      const cleanCode = String(codeParam).trim();
      this.storeContext.storeCode = cleanCode;
      this.storeContext.storeId = cleanCode;

      let matchedName = cleanCode;
      try {
        const savedNetwork = localStorage.getItem('stanley_stores_network');
        if (savedNetwork) {
          const network = JSON.parse(savedNetwork);
          if (Array.isArray(network)) {
            const found = network.find(s => 
              (s.code && s.code.toLowerCase() === cleanCode.toLowerCase()) ||
              (s.name && s.name.toLowerCase().includes(cleanCode.toLowerCase()))
            );
            if (found) {
              matchedName = found.name;
            }
          }
        }
      } catch (e) {}

      this.storeContext.storeName = matchedName;
      try {
        localStorage.setItem('stanley_pwa_store_code', cleanCode);
        localStorage.setItem('stanley_pwa_store_name', matchedName);
      } catch (e) {}
    },

    /**
     * Generates and submits the final order payload
     */
    submitOrder() {
      const queueStore = useQueueStore();
      
      // If current item has text and isn't saved yet, auto-save it
      if (this.currentItem.text.trim() && this.items.length === 0) {
        this.saveCurrentItem();
      }

      const intakeCode = generateIntakeCode();
      const orderId = generateOrderId(intakeCode);
      const now = new Date();
      const bookingTime = formatBookingTime(now);
      const fullPhone = formatPhoneNumber(this.customer.countryCode, this.customer.phone);

      const storeCode = this.storeContext.storeCode || localStorage.getItem('stanley_pwa_store_code') || '';
      const storeName = this.storeContext.storeName || localStorage.getItem('stanley_pwa_store_name') || '';

      const orderPayload = {
        order_id: orderId,
        intake_code: intakeCode,
        short_code: intakeCode,
        system_queue_number: null,
        customer_name: this.customer.name.trim(),
        phone: fullPhone,
        email: this.customer.email ? this.customer.email.trim() : undefined,
        booking_time: bookingTime,
        created_at: now.toISOString(),
        status: 'pending_dropoff',
        store_code: storeCode,
        store_id: storeCode,
        store_name: storeName,
        queue_position: queueStore.getActiveQueueCount() + 1,
        items: this.items.map(item => ({
          id: item.id,
          model: item.model,
          size: item.size,
          position: item.position,
          text: item.text,
          font: item.font,
          fontClass: item.fontClass
        }))
      };

      queueStore.addOrder(orderPayload);

      return orderPayload;
    },

    clearAll() {
      this.resetDraft();
      this.items = [];
      this.customer = {
        name: '',
        countryCode: '+62',
        phone: '',
        email: ''
      };
    }
  }
});
