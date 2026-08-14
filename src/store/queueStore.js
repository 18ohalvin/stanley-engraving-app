import { defineStore } from 'pinia';
import { getStoredOrders, saveStoredOrders, fetchServerOrders } from '../utils/storage.js';
import { logEngravingAnalytics, sendWhatsAppNotification } from '../utils/analyticsService.js';
import { formatSystemQueueNumber } from '../utils/formatters.js';

// Initial clean seed orders: 10 mockup users ahead (Queue #0001 to #0010)
const INITIAL_SEED_ORDERS = [
  {
    order_id: '130826-0001',
    intake_code: 'A8R',
    short_code: '0001',
    system_queue_number: '0001',
    customer_name: 'Raissa Sabrina',
    email: 'raissa.sabrina@gmail.com',
    phone: '+6281299887701',
    booking_time: '10:00',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-1',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'RAISSA',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0002',
    intake_code: '3M2',
    short_code: '0002',
    system_queue_number: '0002',
    customer_name: 'Liovian Kurniawan',
    email: 'liovian.k@outlook.com',
    phone: '+6281311223302',
    booking_time: '10:15',
    created_at: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-2',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'LIOVIAN',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0003',
    intake_code: '7K9',
    short_code: '0003',
    system_queue_number: '0003',
    customer_name: 'Jane Abigail',
    email: 'jane.abigail@gmail.com',
    phone: '+6281755667703',
    booking_time: '10:30',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-3',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'ABIGAIL',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0004',
    intake_code: 'X4D',
    short_code: '0004',
    system_queue_number: '0004',
    customer_name: 'Dimas Pratama',
    email: 'dimas.pratama@yahoo.com',
    phone: '+6281801234504',
    booking_time: '10:45',
    created_at: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-4',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'DIMAS',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0005',
    intake_code: '9WP',
    short_code: '0005',
    system_queue_number: '0005',
    customer_name: 'Clarissa Wong',
    email: 'clarissa.w@gmail.com',
    phone: '+6281987654305',
    booking_time: '11:00',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-5',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'CLARISSA',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0006',
    intake_code: '2KV',
    short_code: '0006',
    system_queue_number: '0006',
    customer_name: 'Kevin Sanjaya',
    email: 'kevin.sanjaya@gmail.com',
    phone: '+6281234567806',
    booking_time: '11:15',
    created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-6',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'SANJAYA',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0007',
    intake_code: '5ND',
    short_code: '0007',
    system_queue_number: '0007',
    customer_name: 'Nadia Puteri',
    email: 'nadia.puteri@gmail.com',
    phone: '+6281567890107',
    booking_time: '11:30',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-7',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'NADIA',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0008',
    intake_code: '8AP',
    short_code: '0008',
    system_queue_number: '0008',
    customer_name: 'Aditya Perkasa',
    email: 'aditya.perkasa@gmail.com',
    phone: '+6281789012308',
    booking_time: '11:45',
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-8',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'ADITYA',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0009',
    intake_code: '4ST',
    short_code: '0009',
    system_queue_number: '0009',
    customer_name: 'Stephanie Tan',
    email: 'stephanie.tan@gmail.com',
    phone: '+6281345678909',
    booking_time: '12:00',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-9',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'STEPHANIE',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0010',
    intake_code: '6RH',
    short_code: '0010',
    system_queue_number: '0010',
    customer_name: 'Rizal Hidayat',
    email: 'rizal.hidayat@gmail.com',
    phone: '+6281678901210',
    booking_time: '12:15',
    created_at: new Date(Date.now() - 3600000 * 0.5).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-10',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'RIZAL',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0011',
    intake_code: '8GW',
    short_code: '0011',
    system_queue_number: '0011',
    customer_name: 'Alvin Decorous',
    email: 'alvin.decorous@gmail.com',
    phone: '+6281234567811',
    booking_time: '12:30',
    created_at: new Date(Date.now() - 3400000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-11',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'ALVIN',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0012',
    intake_code: '2LR',
    short_code: '0012',
    system_queue_number: '0012',
    customer_name: 'Namaku',
    email: 'namaku@gmail.com',
    phone: '+6281398765412',
    booking_time: '12:38',
    created_at: new Date(Date.now() - 3200000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-12',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'NAMAKU',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0013',
    intake_code: '3BP',
    short_code: '0013',
    system_queue_number: '0013',
    customer_name: 'Bambang Pamungkas',
    email: 'bambang.p@gmail.com',
    phone: '+6281211110013',
    booking_time: '12:45',
    created_at: new Date(Date.now() - 3000000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-13',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'BPAMUNGKAS',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0014',
    intake_code: '5JI',
    short_code: '0014',
    system_queue_number: '0014',
    customer_name: 'Jessica Iskandar',
    email: 'jessica.i@yahoo.com',
    phone: '+6281322220014',
    booking_time: '13:00',
    created_at: new Date(Date.now() - 2800000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-14',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'JEDAR',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0015',
    intake_code: '7FG',
    short_code: '0015',
    system_queue_number: '0015',
    customer_name: 'Farhan Gunawan',
    email: 'farhan.g@gmail.com',
    phone: '+6281733330015',
    booking_time: '13:15',
    created_at: new Date(Date.now() - 2600000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-15',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'FARHAN',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0016',
    intake_code: '2AN',
    short_code: '0016',
    system_queue_number: '0016',
    customer_name: 'Alya Nurshabrina',
    email: 'alya.nur@outlook.com',
    phone: '+6281844440016',
    booking_time: '13:30',
    created_at: new Date(Date.now() - 2400000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-16',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'ALYA N.',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0017',
    intake_code: '9DM',
    short_code: '0017',
    system_queue_number: '0017',
    customer_name: 'Daniel Mananta',
    email: 'daniel.m@gmail.com',
    phone: '+6281955550017',
    booking_time: '13:45',
    created_at: new Date(Date.now() - 2200000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-17',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'DJKR',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0018',
    intake_code: '4TF',
    short_code: '0018',
    system_queue_number: '0018',
    customer_name: 'Tasya Farasya',
    email: 'tasya.f@gmail.com',
    phone: '+6281266660018',
    booking_time: '14:00',
    created_at: new Date(Date.now() - 2000000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-18',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'MEMONG',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0019',
    intake_code: '8GM',
    short_code: '0019',
    system_queue_number: '0019',
    customer_name: 'Gading Marten',
    email: 'gading.m@yahoo.com',
    phone: '+6281377770019',
    booking_time: '14:15',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-19',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'PAPA GADING',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0020',
    intake_code: '6CI',
    short_code: '0020',
    system_queue_number: '0020',
    customer_name: 'Chelsea Islan',
    email: 'chelsea.i@gmail.com',
    phone: '+6281788880020',
    booking_time: '14:30',
    created_at: new Date(Date.now() - 1600000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-20',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'CHELSEA',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0021',
    intake_code: '1RR',
    short_code: '0021',
    system_queue_number: '0021',
    customer_name: 'Reza Rahadian',
    email: 'reza.r@outlook.com',
    phone: '+6281899990021',
    booking_time: '14:45',
    created_at: new Date(Date.now() - 1400000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-21',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'REZA R.',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0022',
    intake_code: '3DS',
    short_code: '0022',
    system_queue_number: '0022',
    customer_name: 'Dian Sastrowardoyo',
    email: 'dian.s@gmail.com',
    phone: '+6281900000022',
    booking_time: '15:00',
    created_at: new Date(Date.now() - 1200000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-22',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'DIAN SASTRO',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0023',
    intake_code: '5NS',
    short_code: '0023',
    system_queue_number: '0023',
    customer_name: 'Nicholas Saputra',
    email: 'nicholas.s@gmail.com',
    phone: '+6281212120023',
    booking_time: '15:15',
    created_at: new Date(Date.now() - 1000000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-23',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'NICSAP',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0024',
    intake_code: '7MA',
    short_code: '0024',
    system_queue_number: '0024',
    customer_name: 'Maudy Ayunda',
    email: 'maudy.a@outlook.com',
    phone: '+6281323230024',
    booking_time: '15:30',
    created_at: new Date(Date.now() - 800000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-24',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Vertical',
        text: 'MAUDY',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  {
    order_id: '130826-0025',
    intake_code: '9IR',
    short_code: '0025',
    system_queue_number: '0025',
    customer_name: 'Iqbaal Ramadhan',
    email: 'iqbaal.r@gmail.com',
    phone: '+6281734340025',
    booking_time: '15:45',
    created_at: new Date(Date.now() - 600000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-25',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'IQBAAL',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0026',
    intake_code: '2VP',
    short_code: '0026',
    system_queue_number: '0026',
    customer_name: 'Vanesha Prescilla',
    email: 'vanesha.p@yahoo.com',
    phone: '+6281845450026',
    booking_time: '16:00',
    created_at: new Date(Date.now() - 500000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-26',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'SASHA',
        font: 'Lobster',
        fontId: 'lobster',
        fontClass: 'font-engraving-lobster'
      }
    ]
  },
  {
    order_id: '130826-0027',
    intake_code: '4CJ',
    short_code: '0027',
    system_queue_number: '0027',
    customer_name: 'Chicco Jerikho',
    email: 'chicco.j@gmail.com',
    phone: '+6281956560027',
    booking_time: '16:15',
    created_at: new Date(Date.now() - 400000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-27',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'CHICCO',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  },
  {
    order_id: '130826-0028',
    intake_code: '8TB',
    short_code: '0028',
    system_queue_number: '0028',
    customer_name: 'Tara Basro',
    email: 'tara.b@gmail.com',
    phone: '+6281267670028',
    booking_time: '16:30',
    created_at: new Date(Date.now() - 300000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-28',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '30oz',
        position: 'Horizontal',
        text: 'TARA',
        font: 'Pinyon Script',
        fontId: 'pinyon',
        fontClass: 'font-engraving-pinyon'
      }
    ]
  },
  {
    order_id: '130826-0029',
    intake_code: '6JT',
    short_code: '0029',
    system_queue_number: '0029',
    customer_name: 'Joe Taslim',
    email: 'joe.taslim@outlook.com',
    phone: '+6281378780029',
    booking_time: '16:45',
    created_at: new Date(Date.now() - 200000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-29',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Vertical',
        text: 'JTASLIM',
        font: 'ABeeZee',
        fontId: 'abeezee',
        fontClass: 'font-engraving-abeezee'
      }
    ]
  },
  {
    order_id: '130826-0030',
    intake_code: '1AP',
    short_code: '0030',
    system_queue_number: '0030',
    customer_name: 'Arifin Putra',
    email: 'arifin.p@gmail.com',
    phone: '+6281789890030',
    booking_time: '17:00',
    created_at: new Date(Date.now() - 100000).toISOString(),
    status: 'in_queue',
    assigned_machine: null,
    items: [
      {
        id: 'seed-30',
        model: 'The Quencher H2.0 FlowState™ Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'ARIFIN',
        font: 'Caveat',
        fontId: 'caveat',
        fontClass: 'font-engraving-caveat'
      }
    ]
  },
  // Sample Pending Dropoff Order with 3-char alphanumeric intake code C4X for instant testing
  {
    order_id: '130826-C4X',
    intake_code: 'C4X',
    short_code: 'C4X',
    system_queue_number: null,
    customer_name: 'Jane Abigail',
    email: 'jane.abigail@gmail.com',
    phone: '+6281755667788',
    booking_time: '14:30',
    created_at: new Date().toISOString(),
    status: 'pending_dropoff',
    items: [
      {
        id: 'sample-c4x-1',
        model: 'The IceFlow™ Flip Straw Tumbler',
        size: '40oz',
        position: 'Horizontal',
        text: 'STANLEY',
        font: 'Helvetica Bold',
        fontId: 'lato',
        fontClass: 'font-engraving-lato'
      }
    ]
  }
];

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
    if (!stored || stored.length === 0) {
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

    upcomingListOrders: (state) => {
      const activeAssignedIds = state.machines
        .filter(m => m.isActive !== false)
        .map(m => m.currentOrderId)
        .filter(Boolean);

      return state.orders
        .filter(o => o.status === 'in_queue' && !activeAssignedIds.includes(o.order_id))
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
      const fresh = getStoredOrders();
      if (fresh && fresh.length > 0) {
        this.orders = fresh;
      }
      // Async sync from central network server
      const remote = await fetchServerOrders();
      if (remote && Array.isArray(remote) && remote.length > 0) {
        this.orders = remote;
      }
      this.refreshMachinesFromStorage();
      this.autoAssignMachines();
    },

    initRealtimeSync() {
      if (typeof window === 'undefined') return;

      this.refreshFromStorage();

      // Listen to real-time events broadcasted across devices
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

      // Fast network polling sync (every 2.5s)
      setInterval(() => {
        this.refreshFromStorage();
      }, 2500);
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
      this.autoAssignMachines();
    },

    getNextSystemQueueNumber() {
      const highest = this.orders.reduce((max, o) => {
        const num = parseInt(o.system_queue_number || o.short_code, 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      return formatSystemQueueNumber(highest + 1);
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
    lookupIntakeOrder(codeInput) {
      if (!codeInput) {
        return { success: false, message: 'Please enter a 3-digit Engraving ID (e.g. C4X).' };
      }

      const cleanCode = String(codeInput).replace('#', '').trim().toUpperCase();
      const order = this.orders.find(o => 
        (o.intake_code && o.intake_code.toUpperCase() === cleanCode) ||
        (o.short_code && o.short_code.toUpperCase() === cleanCode) ||
        (o.order_id && o.order_id.toUpperCase().endsWith(cleanCode))
      );

      if (!order) {
        return { success: false, message: `Unique Code #${cleanCode} not found.` };
      }

      if (order.status === 'in_queue') {
        return { 
          success: false, 
          message: `Order #${order.short_code} is already in the active upcoming queue.` 
        };
      }

      if (order.status === 'engraving_in_progress') {
        return { 
          success: false, 
          message: `Order #${order.short_code} is currently engraving on a laser station.` 
        };
      }

      if (order.status === 'ready_for_pickup') {
        return { 
          success: false, 
          message: `Order #${order.short_code} is already completed.` 
        };
      }

      const nextQueueNumber = this.getNextSystemQueueNumber();

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
    confirmOrderIntake(orderId) {
      const order = this.orders.find(o => o.order_id === orderId || o.short_code === orderId || o.intake_code === orderId);
      if (!order) {
        return { success: false, message: 'Order not found.' };
      }

      const newQueueNumber = this.getNextSystemQueueNumber();
      
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
