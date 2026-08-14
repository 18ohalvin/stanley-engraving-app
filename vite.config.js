import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import fs from 'fs';
import path from 'path';

// Initial clean seed orders: 10 mockup users ahead (Queue #0001 to #0010)
const SEED_ORDERS = [
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

function crossDeviceSyncPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dataFile = path.resolve(dataDir, 'orders.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  function getOrders() {
    try {
      if (fs.existsSync(dataFile)) {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading orders.json, using seed orders:', e);
    }
    saveOrders(SEED_ORDERS);
    return SEED_ORDERS;
  }

  function saveOrders(orders) {
    try {
      fs.writeFileSync(dataFile, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving orders.json:', e);
    }
  }

  const sseClients = new Set();

  function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
      } catch (e) {
        sseClients.delete(client);
      }
    }
  }

  return {
    name: 'cross-device-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // SSE Real-time stream endpoint
        if (req.url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });
          res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
          sseClients.add(res);

          req.on('close', () => {
            sseClients.delete(res);
          });
          return;
        }

        // GET all orders across all devices
        if (req.url === '/api/orders' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify(getOrders()));
          return;
        }

        // POST /api/orders (save or update order from any device)
        if (req.url === '/api/orders' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const orders = getOrders();

              if (Array.isArray(payload)) {
                saveOrders(payload);
                broadcast('orders_updated', payload);
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ success: true, count: payload.length }));
                return;
              }

              // Single order upsert
              const idx = orders.findIndex(o => o.order_id === payload.order_id);
              if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...payload, updated_at: new Date().toISOString() };
              } else {
                orders.unshift(payload);
              }

              saveOrders(orders);
              broadcast('orders_updated', orders);
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true, order: payload }));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // POST /api/reset (reset dummy database)
        if (req.url === '/api/reset' && req.method === 'POST') {
          saveOrders(SEED_ORDERS);
          broadcast('orders_updated', SEED_ORDERS);
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: true, orders: SEED_ORDERS }));
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), crossDeviceSyncPlugin()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173
  }
});
