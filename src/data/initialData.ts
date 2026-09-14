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

// A brand-new deployment starts empty. Add real shops from Masters & Settings > Shop Branches.
export const initialShops: ShopBranch[] = [];

// Local (non-Supabase) mode still needs one signed-in user to exist; this generic
// placeholder is it. Real staff accounts are created from Masters & Settings > Users
// (local mode) or by signing up + Team & Access (cloud mode).
export const initialUsers: UserAccount[] = [
  {
    id: 'user-admin',
    name: 'Admin',
    username: 'admin',
    role: 'Admin',
    shopId: 'all',
    phone: ''
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
    body: '🎉 Special Offer at {store_name}! Upgrade to premium Blue-Cut Anti-Glare lenses with a flat 20% discount this week. Visit {shop_name} or call {phone}.',
    isDefault: true
  }
];

// A brand-new deployment starts with no follow-ups; they get created from real
// eye tests and orders.
export const initialFollowUps: FollowUpReminder[] = [];

// Starting profile for a brand-new store. Only structural/non-identifying defaults
// are pre-filled; every business-identifying field (address, tax IDs, bank/UPI
// details) starts blank so nobody bills under a placeholder GSTIN or account by
// mistake. Fill these in from Masters & Settings > Store Profile & GSTIN.
export const initialStoreProfile: StoreProfile = {
  name: 'JIYA OPTICALS',
  tagline: 'Eyewear Studio & Optometry Clinic',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
  panNo: '',
  drugLicenseNo: '',
  upiId: '',
  upiName: '',
  bankName: '',
  bankAccountNo: '',
  bankIfsc: '',
  invoicePrefix: 'INV/25-26/',
  openAccess: true,
  currencySymbol: '₹',
  termsAndConditions: [
    'Goods once sold cannot be returned. Frame exchange permitted within 7 days in original condition.',
    'Lenses ordered specifically as per custom prescription cannot be cancelled or exchanged.',
    'Please verify your vision power and fitting comfort before leaving the counter.',
    'Free frame adjustment and nose pad replacement service valid for 6 months.'
  ]
};


// A brand-new deployment has no inventory yet. Add materials from Inventory >
// Create Material (once each, shared across every shop), or import a CSV.
export const initialProducts: Product[] = [];

// No demo clients. Add real ones from Customers > + Add Client, or during billing.
export const initialCustomers: Customer[] = [];

// No demo invoices. The first real bill appears here after a POS sale.
export const initialInvoices: Invoice[] = [];

// No demo suppliers. Add real ones from Purchases > + New Supplier.
export const initialSuppliers: Supplier[] = [];

// No demo doctors/optometrists. Add real ones from Masters & Settings > Doctors & Optometrists.
export const initialDoctors: Doctor[] = [];

// No demo expenses. Log real ones from Day Book > Expenses.
export const initialExpenses: Expense[] = [];

// No demo purchase bills. Record real ones from Purchases > Record Purchase Bill.
export const initialPurchases: Purchase[] = [];
