import { 
  Customer, 
  Doctor, 
  Expense, 
  FollowUpReminder, 
  Invoice, 
  Product, 
  Purchase,
  ShopBranch,
  StoreProfile, 
  Supplier, 
  UserAccount, 
  WhatsAppTemplate 
} from '../types';

export const initialShops: ShopBranch[] = [
  {
    id: 'shop-1',
    name: 'Shop 1 - M.G. Road (Main Branch)',
    code: 'SHOP-1',
    tagline: 'Flagship Eyewear Studio',
    address: 'Shop No. 12-14, Ground Floor, Central Commercial Complex, M.G. Road',
    city: 'New Delhi',
    phone: '+91 98765 43210',
    gstin: '07AAAAA0000A1Z5',
    isMain: true
  },
  {
    id: 'shop-2',
    name: 'Shop 2 - City Mall (South Ext)',
    code: 'SHOP-2',
    tagline: 'Designer Eyewear & Contact Lens Lounge',
    address: 'UG-09, City Center Mall, South Extension Part-II',
    city: 'New Delhi',
    phone: '+91 98765 43211',
    gstin: '07AAAAA0000A2Z6',
    isMain: false
  },
  {
    id: 'shop-3',
    name: 'Shop 3 - Metro Plaza (Noida Sec-18)',
    code: 'SHOP-3',
    tagline: 'Express Optical & Glazing Lab',
    address: 'Shop 22, Ground Floor, Metro Plaza, Sector 18',
    city: 'Noida',
    phone: '+91 98765 43212',
    gstin: '09AAAAA0000A3Z7',
    isMain: false
  }
];

export const initialUsers: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Jiya Sharma (Super Admin)',
    username: 'admin',
    role: 'Admin',
    shopId: 'all',
    phone: '9876543210'
  },
  {
    id: 'user-cashier-1',
    name: 'Rohan Verma',
    username: 'rohan_s1',
    role: 'Cashier',
    shopId: 'shop-1',
    phone: '9811223344'
  },
  {
    id: 'user-optom-1',
    name: 'Dr. Suresh Kumar (B.Optom)',
    username: 'suresh_optom',
    role: 'Optometrist',
    shopId: 'shop-1',
    phone: '9871122334'
  },
  {
    id: 'user-manager-2',
    name: 'Pooja Malhotra (Shop 2 Mgr)',
    username: 'pooja_s2',
    role: 'Shop Manager',
    shopId: 'shop-2',
    phone: '9876500222'
  },
  {
    id: 'user-cashier-2',
    name: 'Vikas Gupta (Cashier Shop 2)',
    username: 'vikas_s2',
    role: 'Cashier',
    shopId: 'shop-2',
    phone: '9876500111'
  }
];

export const initialWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: 'tmpl-1',
    name: '6-Month Vision Follow-up',
    category: 'Eye Checkup Reminder',
    body: 'Namaste {name}, it has been 6 months since your last eye refraction at {store_name} ({shop_name}). Regular vision checks ensure comfortable computer work and eye wellness. Visit us for a complimentary checkup! 👓 Contact: {phone}',
    isDefault: true
  },
  {
    id: 'tmpl-2',
    name: '1-Year Annual Eye Checkup Due',
    category: 'Eye Checkup Reminder',
    body: 'Namaste {name}, your annual eye examination at {store_name} is due on {due_date}. Please schedule your computerized refraction with our optometrist to keep your power updated. 👓 {shop_name} - Ph: {phone}',
    isDefault: true
  },
  {
    id: 'tmpl-3',
    name: 'Spectacles Ready for Delivery',
    category: 'Order Ready',
    body: 'Namaste {name}, your customized eyewear order for Invoice #{invoice_no} is ready for delivery at {store_name} ({shop_name})! 👓 Balance Payable: ₹{amount}. Please bring this message for pickup. Ph: {phone}',
    isDefault: true
  },
  {
    id: 'tmpl-4',
    name: 'Invoice & Bill Confirmation',
    category: 'Invoice Share',
    body: 'Namaste {name}, thank you for choosing {store_name}! Your invoice #{invoice_no} for ₹{amount} is confirmed. Please keep this bill for 6-month free service & warranty. 👓 {shop_name}',
    isDefault: true
  },
  {
    id: 'tmpl-5',
    name: 'Outstanding Balance Reminder',
    category: 'Payment Due Reminder',
    body: 'Namaste {name}, this is a gentle reminder from {store_name} ({shop_name}) regarding balance due of ₹{amount} on Invoice #{invoice_no}. UPI ID: {phone}@upi or pay at counter.',
    isDefault: true
  },
  {
    id: 'tmpl-6',
    name: 'Festive & Blue-Cut Lens Offer',
    category: 'Promotional / Festive',
    body: '🎉 Special Offer at {store_name}! Upgrade to premium Blue-Cut Anti-Glare lenses with flat 20% discount on branded Ray-Ban & Vogue frames this week. Visit {shop_name} or call {phone}.',
    isDefault: true
  }
];

export const initialFollowUps: FollowUpReminder[] = [
  {
    id: 'fol-1',
    customerId: 'cust-201',
    customerName: 'Rahul Sharma',
    customerMobile: '9811223344',
    shopId: 'shop-1',
    type: '6-Month Vision Review',
    dueDate: new Date().toISOString().split('T')[0], // Due Today!
    status: 'Pending',
    notes: 'Prescribed progressive anti-glare lenses. 6-month adaptation review due.'
  },
  {
    id: 'fol-2',
    customerId: 'cust-202',
    customerName: 'Ananya Verma',
    customerMobile: '9818833445',
    shopId: 'shop-2',
    type: 'Annual Eye Checkup',
    dueDate: new Date().toISOString().split('T')[0], // Due Today!
    status: 'Pending',
    notes: 'Annual computerized eye test due for high cylinder power check.'
  },
  {
    id: 'fol-3',
    customerId: 'cust-203',
    customerName: 'Vikram Mehta',
    customerMobile: '9871122334',
    shopId: 'shop-1',
    type: 'Spectacle Delivery',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Pending',
    notes: 'Rimless frame ready for fitting. Notify customer for trial & pickup.'
  }
];

export const initialStoreProfile: StoreProfile = {
  name: 'JIYA OPTICALS',
  tagline: 'Eyewear Studio & Optometry Clinic',
  addressLine1: 'Shop No. 12-14, Ground Floor, Central Commercial Complex',
  addressLine2: 'M.G. Road, Opp. Civil Hospital',
  city: 'New Delhi',
  state: 'Delhi (07)',
  pincode: '110001',
  phone: '+91 98765 43210',
  email: 'contact@jiyaopticals.com',
  gstin: '07AAAAA0000A1Z5',
  panNo: 'AAAAA0000A',
  drugLicenseNo: 'DL-OPT-2024-8899',
  upiId: 'jiyaopticals@upi',
  upiName: 'Jiya Opticals',
  bankName: 'HDFC Bank Ltd.',
  bankAccountNo: '50200088997766',
  bankIfsc: 'HDFC0001234',
  invoicePrefix: 'JIYA/25-26/',
  openAccess: true,
  currencySymbol: '₹',
  termsAndConditions: [
    'Goods once sold cannot be returned. Frame exchange permitted within 7 days in original condition.',
    'Lenses ordered specifically as per custom prescription cannot be cancelled or exchanged.',
    'Please verify your vision power and fitting comfort before leaving the counter.',
    'Free frame adjustment and nose pad replacement service valid for 6 months.',
    'Subject to Delhi Jurisdiction only.'
  ]
};

export const initialProducts: Product[] = [
  {
    id: 'prod-101',
    shopId: 'shop-1',
    barcode: '890123450001',
    name: 'Ray-Ban Wayfarer Classic Black',
    category: 'Spectacle Frame',
    brand: 'Ray-Ban',
    modelNo: 'RB-2140',
    color: 'Matte Black',
    frameType: 'Full Rim',
    size: '50-22-150',
    hsnCode: '90031100',
    purchasePrice: 3200,
    mrp: 6590,
    salePrice: 5900,
    gstRate: 12,
    stockQty: 8,
    minStockAlert: 3,
    location: 'Rack A-1'
  },
  {
    id: 'prod-102',
    shopId: 'shop-1',
    barcode: '890123450002',
    name: 'Titan Eye+ Titanium Rimless Sleek',
    category: 'Spectacle Frame',
    brand: 'Titan Eye+',
    modelNo: 'TE-8840',
    color: 'Gunmetal Silver',
    frameType: 'Rimless',
    size: '52-18-140',
    hsnCode: '90031100',
    purchasePrice: 1400,
    mrp: 3299,
    salePrice: 2899,
    gstRate: 12,
    stockQty: 12,
    minStockAlert: 4,
    location: 'Rack A-2'
  },
  {
    id: 'prod-103',
    shopId: 'shop-2',
    barcode: '890123450003',
    name: 'Fastrack Cat Eye Gradient Acetate',
    category: 'Spectacle Frame',
    brand: 'Fastrack',
    modelNo: 'FT-3092',
    color: 'Tortoise Brown',
    frameType: 'Full Rim',
    size: '51-17-142',
    hsnCode: '90031100',
    purchasePrice: 750,
    mrp: 1899,
    salePrice: 1650,
    gstRate: 12,
    stockQty: 15,
    minStockAlert: 5,
    location: 'Rack A-3'
  },
  {
    id: 'prod-104',
    shopId: 'shop-2',
    barcode: '890123450004',
    name: 'Oakley Holbrook Polarized Sunglasses',
    category: 'Sunglasses',
    brand: 'Oakley',
    modelNo: 'OO-9102',
    color: 'Polished Black / Prizm Sapphire',
    frameType: 'Full Rim',
    size: '55-18-137',
    hsnCode: '90041000',
    purchasePrice: 4200,
    mrp: 8990,
    salePrice: 7990,
    gstRate: 18,
    stockQty: 4,
    minStockAlert: 2,
    location: 'Display Case 1'
  },
  {
    id: 'prod-105',
    shopId: 'shop-1',
    barcode: '890123450005',
    name: 'Crizal Easy UV 1.56 Blue-Cut (Pair)',
    category: 'Ophthalmic Lens',
    brand: 'Essilor Crizal',
    modelNo: '1.56 Blue UV',
    color: 'Clear Green Reflection',
    frameType: 'N/A',
    size: '70mm Blanks',
    hsnCode: '90015000',
    purchasePrice: 600,
    mrp: 1800,
    salePrice: 1450,
    gstRate: 12,
    stockQty: 24,
    minStockAlert: 6,
    location: 'Lens Drawer L-1'
  },
  {
    id: 'prod-106',
    shopId: 'shop-3',
    barcode: '890123450006',
    name: 'Zeiss Progressive Light 3D 1.60 HMC (Pair)',
    category: 'Ophthalmic Lens',
    brand: 'Carl Zeiss',
    modelNo: 'Prog-1.60',
    color: 'Clear Blue Coat',
    frameType: 'N/A',
    size: '75mm',
    hsnCode: '90015000',
    purchasePrice: 2800,
    mrp: 7500,
    salePrice: 6200,
    gstRate: 12,
    stockQty: 6,
    minStockAlert: 2,
    location: 'Lens Drawer L-2'
  },
  {
    id: 'prod-107',
    shopId: 'shop-2',
    barcode: '890123450007',
    name: 'Acuvue Oasys Monthly Contact Lenses (6pk)',
    category: 'Contact Lens',
    brand: 'Johnson & Johnson',
    modelNo: 'AO-Hydraclear',
    color: 'Clear Tint',
    size: '8.4 BC / 14.0 DIA',
    hsnCode: '90013000',
    purchasePrice: 950,
    mrp: 1950,
    salePrice: 1750,
    gstRate: 12,
    stockQty: 18,
    minStockAlert: 5,
    location: 'CL Box 3'
  },
  {
    id: 'prod-108',
    shopId: 'all',
    barcode: '890123450008',
    name: 'Bausch & Lomb Renu Fresh Solution 355ml',
    category: 'Lens Solution',
    brand: 'Bausch & Lomb',
    modelNo: 'Renu-355',
    color: 'Bottle',
    hsnCode: '33079090',
    purchasePrice: 220,
    mrp: 480,
    salePrice: 420,
    gstRate: 18,
    stockQty: 30,
    minStockAlert: 10,
    location: 'Front Shelf 2'
  },
  {
    id: 'prod-109',
    shopId: 'shop-1',
    barcode: '890123450009',
    name: 'Vogue Eyewear Butterfly Metal Frame',
    category: 'Spectacle Frame',
    brand: 'Vogue',
    modelNo: 'VO-4177',
    color: 'Rose Gold / Pink',
    frameType: 'Full Rim',
    size: '52-16-135',
    hsnCode: '90031100',
    purchasePrice: 1900,
    mrp: 4390,
    salePrice: 3950,
    gstRate: 12,
    stockQty: 2, // Low stock demo
    minStockAlert: 4,
    location: 'Rack B-1'
  },
  {
    id: 'prod-110',
    shopId: 'all',
    barcode: '890123450010',
    name: 'Microfiber Optical Cleaning Spray & Cloth Kit',
    category: 'Optical Accessory',
    brand: 'OptiCare',
    modelNo: 'Kit-Pro',
    color: 'Blue Spray 60ml',
    hsnCode: '34029099',
    purchasePrice: 45,
    mrp: 150,
    salePrice: 120,
    gstRate: 18,
    stockQty: 50,
    minStockAlert: 15,
    location: 'Billing Counter'
  }
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-201',
    name: 'Rahul Sharma',
    mobile: '9811223344',
    email: 'rahul.sharma@example.com',
    address: 'B-402, Green Park Extension',
    city: 'New Delhi',
    createdAt: '2026-07-10',
    totalSpent: 8350,
    outstandingBalance: 0,
    lastVisit: '2026-08-18',
    prescriptions: [
      {
        id: 'rx-501',
        customerId: 'cust-201',
        customerName: 'Rahul Sharma',
        customerMobile: '9811223344',
        date: '2026-08-18',
        doctorName: 'Dr. A. K. Verma (MS Ophth)',
        optometristName: 'Suresh Kumar (B.Optom)',
        rightEye: { sph: '-1.75', cyl: '-0.50', axis: '90', add: '+1.50', dv: '6/6', nv: 'N6' },
        leftEye: { sph: '-2.00', cyl: '-0.75', axis: '85', add: '+1.50', dv: '6/6', nv: 'N6' },
        pdMm: '63',
        fittingHeight: '18mm',
        lensType: 'Progressive',
        lensCoating: 'Blue Cut + Photochromic',
        lensIndex: '1.60',
        notes: 'Screen glare strain reported. Prescribed progressive anti-fatigue.',
        nextCheckupDate: '2027-08-18'
      }
    ]
  },
  {
    id: 'cust-202',
    name: 'Priya Mehra',
    mobile: '9873456789',
    email: 'priya.mehra@example.com',
    address: 'H-12, Sector 15, Rohini',
    city: 'Delhi',
    createdAt: '2026-08-01',
    totalSpent: 4549,
    outstandingBalance: 1500,
    lastVisit: '2026-08-19',
    prescriptions: [
      {
        id: 'rx-502',
        customerId: 'cust-202',
        customerName: 'Priya Mehra',
        customerMobile: '9873456789',
        date: '2026-08-19',
        doctorName: 'Dr. Neha Kapoor (Eye Clinic)',
        optometristName: 'Suresh Kumar (B.Optom)',
        rightEye: { sph: '-0.75', cyl: '0.00', axis: '0', add: '0.00', dv: '6/6', nv: 'N6' },
        leftEye: { sph: '-1.00', cyl: '-0.25', axis: '180', add: '0.00', dv: '6/6', nv: 'N6' },
        pdMm: '60',
        fittingHeight: '16mm',
        lensType: 'Single Vision',
        lensCoating: 'Blue Cut / Blue Block',
        lensIndex: '1.56',
        notes: 'Laptop usage 8+ hours. Zero add required.',
        nextCheckupDate: '2027-08-19'
      }
    ]
  },
  {
    id: 'cust-203',
    name: 'Vikramaditya Roy',
    mobile: '9899112233',
    email: 'v.roy@business.in',
    address: 'Flat 101, Golf Links Residency',
    city: 'New Delhi',
    createdAt: '2026-08-12',
    totalSpent: 7990,
    outstandingBalance: 0,
    lastVisit: '2026-08-12',
    prescriptions: []
  }
];

export const initialInvoices: Invoice[] = [
  {
    id: 'inv-301',
    invoiceNo: 'JIYA/25-26/1042',
    date: '2026-08-18',
    time: '14:30',
    customerId: 'cust-201',
    customerName: 'Rahul Sharma',
    customerMobile: '9811223344',
    doctorName: 'Dr. A. K. Verma (MS Ophth)',
    salesmanName: 'Vikas Gupta',
    items: [
      {
        productId: 'prod-101',
        barcode: '890123450001',
        name: 'Ray-Ban Wayfarer Classic Black',
        category: 'Spectacle Frame',
        hsnCode: '90031100',
        qty: 1,
        unitPrice: 5900,
        discountPercent: 10,
        taxableAmount: 4741.07,
        gstRate: 12,
        cgstAmount: 284.46,
        sgstAmount: 284.47,
        igstAmount: 0,
        totalAmount: 5310,
        frameModel: 'RB-2140'
      },
      {
        productId: 'prod-106',
        barcode: '890123450006',
        name: 'Zeiss Progressive Light 3D 1.60 HMC (Pair)',
        category: 'Ophthalmic Lens',
        hsnCode: '90015000',
        qty: 1,
        unitPrice: 6200,
        discountPercent: 15,
        taxableAmount: 4705.36,
        gstRate: 12,
        cgstAmount: 282.32,
        sgstAmount: 282.32,
        igstAmount: 0,
        totalAmount: 5270,
        lensDetails: 'Progressive Blue Cut + Photochromic'
      }
    ],
    subtotal: 12100,
    totalDiscount: 1520,
    totalTax: 1133.57,
    cgstTotal: 566.78,
    sgstTotal: 566.79,
    igstTotal: 0,
    fittingTotal: 150,
    grandTotal: 10730,
    roundOff: 0,
    netPayable: 10730,
    advancePaid: 10730,
    balanceDue: 0,
    paymentMode: 'UPI / QR',
    paymentRef: 'UPI/9811/TXN988123',
    orderStatus: 'Delivered',
    deliveryDate: '2026-08-18'
  },
  {
    id: 'inv-302',
    invoiceNo: 'JIYA/25-26/1043',
    date: '2026-08-19',
    time: '18:15',
    customerId: 'cust-202',
    customerName: 'Priya Mehra',
    customerMobile: '9873456789',
    doctorName: 'Dr. Neha Kapoor (Eye Clinic)',
    salesmanName: 'Vikas Gupta',
    items: [
      {
        productId: 'prod-103',
        barcode: '890123450003',
        name: 'Fastrack Cat Eye Gradient Acetate',
        category: 'Spectacle Frame',
        hsnCode: '90031100',
        qty: 1,
        unitPrice: 1650,
        discountPercent: 5,
        taxableAmount: 1399.55,
        gstRate: 12,
        cgstAmount: 83.97,
        sgstAmount: 83.98,
        igstAmount: 0,
        totalAmount: 1567.5,
        frameModel: 'FT-3092'
      },
      {
        productId: 'prod-105',
        barcode: '890123450005',
        name: 'Crizal Easy UV 1.56 Blue-Cut (Pair)',
        category: 'Ophthalmic Lens',
        hsnCode: '90015000',
        qty: 1,
        unitPrice: 1450,
        discountPercent: 0,
        taxableAmount: 1294.64,
        gstRate: 12,
        cgstAmount: 77.68,
        sgstAmount: 77.68,
        igstAmount: 0,
        totalAmount: 1450,
        lensDetails: 'Single Vision 1.56 Blue Cut'
      }
    ],
    subtotal: 3100,
    totalDiscount: 82.5,
    totalTax: 323.31,
    cgstTotal: 161.65,
    sgstTotal: 161.66,
    igstTotal: 0,
    fittingTotal: 100,
    grandTotal: 3117.5,
    roundOff: 0.5,
    netPayable: 3118,
    advancePaid: 1618,
    balanceDue: 1500,
    paymentMode: 'Cash',
    orderStatus: 'Order Booked',
    deliveryDate: '2026-08-22',
    notes: 'Urgent fitting for Friday evening pick-up.'
  },
  {
    id: 'inv-303',
    invoiceNo: 'JIYA/25-26/1044',
    date: '2026-08-20',
    time: '11:45',
    customerId: 'cust-203',
    customerName: 'Vikramaditya Roy',
    customerMobile: '9899112233',
    salesmanName: 'Pooja Verma',
    items: [
      {
        productId: 'prod-104',
        barcode: '890123450004',
        name: 'Oakley Holbrook Polarized Sunglasses',
        category: 'Sunglasses',
        hsnCode: '90041000',
        qty: 1,
        unitPrice: 7990,
        discountPercent: 0,
        taxableAmount: 6771.19,
        gstRate: 18,
        cgstAmount: 609.41,
        sgstAmount: 609.40,
        igstAmount: 0,
        totalAmount: 7990
      }
    ],
    subtotal: 7990,
    totalDiscount: 0,
    totalTax: 1218.81,
    cgstTotal: 609.41,
    sgstTotal: 609.40,
    igstTotal: 0,
    fittingTotal: 0,
    grandTotal: 7990,
    roundOff: 0,
    netPayable: 7990,
    advancePaid: 7990,
    balanceDue: 0,
    paymentMode: 'Credit / Debit Card',
    paymentRef: 'POS-HDFC-9921',
    orderStatus: 'Direct Sale',
    deliveryDate: '2026-08-20'
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: 'supp-401',
    name: 'Luxottica India Eyewear Pvt Ltd',
    contactPerson: 'Anand Saxena',
    mobile: '9820011223',
    email: 'orders.india@luxottica.com',
    address: 'DLF Cyber City, Tower B, Phase 2',
    city: 'Gurugram',
    gstin: '06AACCL9988H1Z8',
    openingBalance: 25000,
    currentBalance: 32500,
    category: 'Ray-Ban & Oakley Frames / Sunglasses'
  },
  {
    id: 'supp-402',
    name: 'Essilor India Optical Labs',
    contactPerson: 'Ramesh Chander',
    mobile: '9810998877',
    email: 'delhi.lab@essilor.co.in',
    address: 'Okhla Industrial Area Phase 1',
    city: 'New Delhi',
    gstin: '07AAACE4455K1ZK',
    openingBalance: 12000,
    currentBalance: 14800,
    category: 'Crizal, Eyezen & Varilux Rx Lenses'
  },
  {
    id: 'supp-403',
    name: 'Titan Company Eyewear Division',
    contactPerson: 'Deepak Bhatt',
    mobile: '9845012345',
    email: 'eyewear.orders@titan.co.in',
    address: 'Electronics City, Hosur Road',
    city: 'Bengaluru',
    gstin: '29AAACT2702E1ZP',
    openingBalance: 0,
    currentBalance: 8200,
    category: 'Titan Frames & Fastrack Collection'
  }
];

export const initialDoctors: Doctor[] = [
  {
    id: 'doc-601',
    name: 'Dr. A. K. Verma',
    clinicName: 'Verma Eye Care & Retina Institute',
    qualification: 'MS (Ophthalmology), FICO',
    mobile: '9810012345',
    email: 'drverma.eyecare@gmail.com',
    commissionPercent: 10,
    totalReferrals: 42,
    isActive: true
  },
  {
    id: 'doc-602',
    name: 'Dr. Neha Kapoor',
    clinicName: 'Kapoor Netralaya & Vision Clinic',
    qualification: 'MBBS, DOMS, DNB (Ophth)',
    mobile: '9818833445',
    email: 'drneha.vision@gmail.com',
    commissionPercent: 10,
    totalReferrals: 28,
    isActive: true
  },
  {
    id: 'doc-603',
    name: 'Dr. Suresh Kumar',
    clinicName: 'In-House Optometry (Jiya Opticals)',
    qualification: 'B.Optom, Clinical Optometrist',
    mobile: '9871122334',
    email: 'optom.suresh@jiyaopticals.com',
    commissionPercent: 5,
    totalReferrals: 95,
    isActive: true
  }
];

export const initialExpenses: Expense[] = [
  {
    id: 'exp-801',
    date: '2026-08-20',
    category: 'Tea & Refreshments',
    amount: 180,
    paymentMode: 'Cash',
    paidTo: 'Sharma Tea Stall',
    remarks: 'Daily staff tea & customer refreshments'
  },
  {
    id: 'exp-802',
    date: '2026-08-19',
    category: 'Lab Fitting Charges',
    amount: 450,
    paymentMode: 'UPI',
    paidTo: 'Precision Lens Glazing Works',
    remarks: 'Fitting of 3 rimless frame orders'
  },
  {
    id: 'exp-803',
    date: '2026-08-15',
    category: 'Packaging & Printing',
    amount: 1200,
    paymentMode: 'Cash',
    paidTo: 'PrintPoint Graphics',
    remarks: '1000 branded optical cases and cleaning cloths'
  }
];

export const initialPurchases: Purchase[] = [
  {
    id: 'pur-901',
    purchaseNo: 'PUR-2026-0045',
    supplierId: 'supp-401',
    supplierName: 'Luxottica India Eyewear Pvt Ltd',
    supplierBillNo: 'LUX/INV/8892',
    billDate: '2026-08-14',
    items: [
      {
        productId: 'prod-101',
        name: 'Ray-Ban Wayfarer Classic Black',
        barcode: '890123450001',
        category: 'Spectacle Frame',
        hsnCode: '90031100',
        qty: 10,
        purchaseRate: 3200,
        mrp: 6590,
        salePrice: 5900,
        gstRate: 12,
        total: 35840
      }
    ],
    subtotal: 32000,
    taxAmount: 3840,
    grandTotal: 35840,
    paidAmount: 20000,
    balanceDue: 15840,
    paymentMode: 'Bank Transfer'
  }
];
