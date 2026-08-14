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
    placementImage: '/src/assets/images/product-step1.png'
  },
  {
    id: 'iceflow-fastflow',
    name: 'IceFlow™ Bottle with Fast Flow Lid',
    shortName: 'Fast Flow Bottle',
    sizes: ['24oz', '36oz'],
    image: '/src/assets/images/product-iceflow-fastflow.png',
    placementImage: '/src/assets/images/product-iceflow-fastflow.png'
  }
];

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
