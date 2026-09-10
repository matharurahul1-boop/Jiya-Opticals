export type LensType = 'Single Vision' | 'Bifocal' | 'Progressive' | 'Zero Power / Plano' | 'Contact Lens';

export type LensCoating = 
  | 'Standard UC (Uncoated)'
  | 'HMC (Anti-Reflective)'
  | 'Blue Cut / Blue Block'
  | 'Photochromic / Transition'
  | 'Blue Cut + Photochromic'
  | 'Polycarbonate Anti-Impact'
  | 'Drivewear / Polarized';

export interface EyePower {
  sph: string;
  cyl: string;
  axis: string;
  add: string;
  dv: string; // Distant vision e.g. 6/6
  nv: string; // Near vision e.g. N6
  prism?: string;
  base?: string;
}

export interface Prescription {
  id: string;
  shopId?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  date: string;
  doctorName: string;
  optometristName?: string;
  rightEye: EyePower; // OD
  leftEye: EyePower;  // OS
  pdMm: string; // Pupillary distance e.g. 62
  fittingHeight?: string;
  lensType: LensType;
  lensCoating: LensCoating;
  lensIndex: string; // 1.56, 1.61, 1.67, 1.74
  notes?: string;
  nextCheckupDate?: string;
  followUpInterval?: string; // '1 Month' | '3 Months' | '6 Months' | '1 Year'
}

export type ProductCategory = 
  | 'Spectacle Frame'
  | 'Sunglasses'
  | 'Ophthalmic Lens'
  | 'Contact Lens'
  | 'Lens Solution'
  | 'Optical Accessory'
  | 'Reading Glasses'
  | 'Equipment / Battery';

export interface Product {
  id: string;
  /** Shared material identity. id continues identifying this shop's stock row. */
  catalogId?: string;
  shopId?: string;
  barcode: string;
  qrCode?: string;
  drishtiSourceId?: string;
  drishtiItemId?: string;
  drishtiHash?: string;
  drishtiStockQty?: number;
  drishtiSyncedAt?: string;
  name: string;
  category: ProductCategory;
  brand: string;
  modelNo: string;
  color: string;
  frameType?: 'Full Rim' | 'Half Rim' | 'Rimless' | 'Supra' | 'N/A';
  size?: string;
  hsnCode: string;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
  gstRate: number; // e.g. 12 (12%)
  stockQty: number;
  minStockAlert: number;
  supplierId?: string;
  location?: string; // Shelf / Rack
}

export type PaymentMode = 'Cash' | 'UPI / QR' | 'Credit / Debit Card' | 'Customer Credit' | 'Split Payment';

export interface InvoiceItem {
  productId: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  hsnCode: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  // Specific optical attachment if any
  eyePrescriptionId?: string;
  frameModel?: string;
  lensDetails?: string;
  fittingCharge?: number;
}

export type OrderStatus = 'Direct Sale' | 'Order Booked' | 'In Progress' | 'Fitting Done' | 'Ready for Delivery' | 'Delivered' | 'Cancelled';

export interface Invoice {
  id: string;
  shopId?: string;
  shopName?: string;
  invoiceNo: string;
  date: string;
  time: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGstin?: string;
  doctorName?: string;
  salesmanName?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxableTotal?: number;
  totalDiscount: number;
  totalTax: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  fittingTotal: number;
  grandTotal: number;
  roundOff: number;
  netPayable: number;
  advancePaid: number;
  balanceDue: number;
  paymentMode: PaymentMode;
  paymentRef?: string;
  orderStatus: OrderStatus;
  deliveryDate?: string;
  prescription?: Prescription;
  notes?: string;
}

export interface PaymentReceipt {
  id: string;
  shopId: string;
  customerId: string;
  invoiceId?: string;
  date: string;
  amount: number;
  paymentMode: string;
}

export interface Customer {
  id: string;
  shopId?: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  gstin?: string;
  birthday?: string;
  anniversary?: string;
  createdAt: string;
  totalSpent: number;
  outstandingBalance: number;
  prescriptions: Prescription[];
  lastVisit?: string;
  nextFollowUpDate?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email?: string;
  address?: string;
  city?: string;
  gstin: string;
  openingBalance: number;
  currentBalance: number;
  category: string; // e.g. Frames, Essilor Lenses, Accessories
}

export interface Doctor {
  id: string;
  name: string;
  clinicName?: string;
  qualification: string; // e.g. MBBS, MS (Ophthalmology) or Optometrist (B.Optom)
  mobile: string;
  email?: string;
  commissionPercent: number;
  totalReferrals: number;
  isActive: boolean;
}

export interface Expense {
  id: string;
  shopId?: string;
  date: string;
  category: 'Shop Rent' | 'Electricity' | 'Staff Salary' | 'Lab Fitting Charges' | 'Tea & Refreshments' | 'Packaging & Printing' | 'Maintenance' | 'Miscellaneous';
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer';
  paidTo: string;
  remarks?: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  barcode: string;
  category: ProductCategory;
  hsnCode: string;
  qty: number;
  purchaseRate: number;
  mrp: number;
  salePrice: number;
  gstRate: number;
  total: number;
}

export interface Purchase {
  id: string;
  shopId?: string;
  purchaseNo: string;
  supplierId: string;
  supplierName: string;
  supplierBillNo: string;
  billDate: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: string;
}

export interface StoreProfile {
  name: string;
  tagline: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  panNo: string;
  drugLicenseNo?: string;
  upiId: string;
  upiName: string;
  /** Optional uploaded UPI QR image (data URL). When set, it is shown instead of an auto-generated QR. */
  upiQrDataUrl?: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  invoicePrefix: string;
  /** When true, any confirmed sign-in joins this store with access to every shop
   *  (no per-person setup). Turn off to grant access shop-by-shop from Team & Access. */
  openAccess?: boolean;
  termsAndConditions: string[];
  currencySymbol: string;
  /** Default GST % per product category. Used as the billing/stock default; per-item value can still be overridden. */
  categoryGstRates?: Partial<Record<ProductCategory, number>>;
}

export interface ShopBranch {
  id: string;
  name: string;
  code: string; // e.g. 'SHOP-1', 'SHOP-2'
  tagline?: string;
  address: string;
  city: string;
  phone: string;
  gstin?: string;
  isMain?: boolean;
}

export type UserRole = 'Admin' | 'Shop Manager' | 'Optometrist' | 'Cashier' | 'Lab Technician';

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  /** Login email — only required for cloud team access. */
  email?: string;
  role: UserRole;
  shopId: string; // 'all' for Super Admin, or specific 'shop-1', 'shop-2'
  phone: string;
  avatar?: string;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'Eye Checkup Reminder' | 'Order Ready' | 'Invoice Share' | 'Payment Due Reminder' | 'Promotional / Festive' | 'Custom';
  body: string; // contains variables like {name}, {store_name}, {invoice_no}, {amount}, {delivery_date}, {due_date}, {phone}, {shop_name}
  isDefault?: boolean;
}

export interface FollowUpReminder {
  id: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  shopId: string;
  type: 'Annual Eye Checkup' | '6-Month Vision Review' | 'Contact Lens Refill' | 'Spectacle Delivery' | 'Balance Payment';
  dueDate: string; // YYYY-MM-DD
  status: 'Pending' | 'Sent' | 'Completed' | 'Dismissed';
  notes?: string;
  prescriptionId?: string;
  invoiceId?: string;
  lastContactedAt?: string;
}

export interface DayBookSummary {
  date: string;
  openingCash: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  creditRecovered: number;
  totalIncome: number;
  expensesTotal: number;
  supplierPayments: number;
  closingCashInHand: number;
}

export interface EmailModalPayload {
  recipientEmail?: string;
  recipientName?: string;
  recipientMobile?: string;
  subject: string;
  body: string;
  documentType?: 'Tax Invoice' | 'Eye Prescription' | 'Job Card Delivery Alert' | 'Payment Due Reminder' | 'Eye Checkup Reminder' | 'Broadcast Announcement' | 'Follow-up Reminder' | 'Broadcast Email' | string;
}
