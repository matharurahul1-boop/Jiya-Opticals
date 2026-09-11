import { supabase } from '../lib/supabase';
import { getLanguage,setLocale } from '../lib/i18n';
import { applyStockMovement, catalogKey, expandCatalog, transferCatalogStock, updateCatalogProduct } from '../lib/catalog';
import { Snapshot, useCloudSave } from '../lib/workspace';
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Customer,
  Doctor,
  EmailModalPayload,
  Expense,
  FollowUpReminder,
  Invoice,
  OrderStatus,
  Prescription,
  Product,
  PaymentReceipt,
  Purchase,
  ShopBranch,
  StoreProfile,
  Supplier,
  UserAccount,
  UserRole,
  WhatsAppTemplate,
} from '../types';
import {
  initialCustomers,
  initialDoctors,
  initialExpenses,
  initialFollowUps,
  initialInvoices,
  initialProducts,
  initialPurchases,
  initialShops,
  initialStoreProfile,
  initialSuppliers,
  initialUsers,
  initialWhatsAppTemplates,
} from '../data/initialData';

export type NavTab = 
  | 'profile'
  | 'dashboard'
  | 'billing'
  | 'eyetesting'
  | 'inventory'
  | 'customers'
  | 'followups'
  | 'broadcast'
  | 'purchases'
  | 'daybook'
  | 'masters'
  | 'settings'
  | 'shops'
  | 'team'
  | 'drishti';

interface AppContextType {
  saveMyProfile: (details:{name:string;username:string;phone:string}) => Promise<void>;
  ownerId?: string;
  isCloud: boolean;
  saveStatus: string;
  payments: PaymentReceipt[];
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  language: 'EN' | 'HI';
  setLanguage: (lang: 'EN' | 'HI') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  
  // Multi-Shop & Multi-Role
  shops: ShopBranch[];
  addShop: (shop: Omit<ShopBranch, 'id'>) => ShopBranch;
  updateShop: (shop: ShopBranch) => void;
  deleteShop: (id: string) => void;
  users: UserAccount[];
  currentUser: UserAccount;
  setCurrentUser: (u: UserAccount) => void;
  addUser: (u: Omit<UserAccount, 'id'>) => void;
  updateUser: (u: UserAccount) => void;
  selectedShopFilter: string; // 'all' or 'shop-1', 'shop-2', etc.
  setSelectedShopFilter: (shopId: string) => void;
  activeShop: ShopBranch;
  canAccessTab: (tab: NavTab) => boolean;

  // Data States
  storeProfile: StoreProfile;
  updateStoreProfile: (profile: StoreProfile) => void;
  products: Product[];
  allProducts: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  addMultipleProducts: (newProductsList: Omit<Product, 'id'>[]) => number;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, newQty: number) => void;
  transferStock: (id: string, targetShopId: string, qty: number) => void;

  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'outstandingBalance' | 'prescriptions'>) => Customer;
  updateCustomer: (customer: Customer) => void;
  addPrescriptionToCustomer: (prescription: Omit<Prescription, 'id'>) => Prescription;
  receiveCustomerPayment: (customerId: string, amount: number, paymentMode: string, invoiceId?: string) => void;

  invoices: Invoice[];
  createInvoice: (invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'date' | 'time'>) => Invoice;
  updateOrderStatus: (invoiceId: string, newStatus: OrderStatus) => void;
  collectInvoiceBalance: (invoiceId: string, amount: number, paymentMode: string) => void;

  suppliers: Supplier[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'currentBalance'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  paySupplier: (supplierId: string, amount: number) => void;

  doctors: Doctor[];
  addDoctor: (doctor: Omit<Doctor, 'id' | 'totalReferrals'>) => void;
  updateDoctor: (doctor: Doctor) => void;
  deleteDoctor: (id: string) => void;


  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  deleteExpense: (id: string) => void;

  purchases: Purchase[];
  addPurchase: (purchase: Omit<Purchase, 'id' | 'purchaseNo'>) => void;

  // WhatsApp Templates & Broadcast
  whatsappTemplates: WhatsAppTemplate[];
  addWhatsAppTemplate: (tmpl: Omit<WhatsAppTemplate, 'id'>) => WhatsAppTemplate;
  updateWhatsAppTemplate: (tmpl: WhatsAppTemplate) => void;
  deleteWhatsAppTemplate: (id: string) => void;
  formatWhatsAppMessage: (
    template: WhatsAppTemplate, 
    data: { 
      name: string; 
      invoiceNo?: string; 
      amount?: number | string; 
      deliveryDate?: string; 
      dueDate?: string; 
      notes?: string; 
      shopId?: string;
    }
  ) => string;

  // Follow-ups & Reminders
  followUps: FollowUpReminder[];
  addFollowUp: (fol: Omit<FollowUpReminder, 'id' | 'status'>) => FollowUpReminder;
  updateFollowUpStatus: (id: string, status: 'Pending' | 'Sent' | 'Completed' | 'Dismissed') => void;
  deleteFollowUp: (id: string) => void;
  sendFollowUpWhatsApp: (fol: FollowUpReminder, customMsg?: string) => void;
  dueFollowUpsCount: number;

  // Global modals & quick actions
  selectedInvoiceForPrint: Invoice | null;
  setSelectedInvoiceForPrint: (inv: Invoice | null) => void;
  selectedPrescriptionForPrint: Prescription | null;
  setSelectedPrescriptionForPrint: (rx: Prescription | null) => void;
  selectedProductForBarcode: Product | null;
  setSelectedProductForBarcode: (prod: Product | null) => void;

  showQuickClientModal: boolean;
  setShowQuickClientModal: (v: boolean) => void;
  showCameraScannerModal: boolean;
  setShowCameraScannerModal: (v: boolean) => void;
  openCameraScanner: (onScanned: (barcode: string) => void) => void;
  closeCameraScanner: () => void;
  onBarcodeScannedCallback: ((barcode: string) => void) | null;
  triggerBarcodeScan: (barcode: string) => void;

  showShopSelectModal: boolean;
  setShowShopSelectModal: (v: boolean) => void;
  promptShopSelect: (actionTitle: string, callback: (shopId: string) => void) => void;
  shopSelectPromptTitle: string;
  confirmShopSelection: (shopId: string) => void;

  selectedCustomerForAction: Customer | null;
  setSelectedCustomerForAction: (c: Customer | null) => void;
  showQuickEyeTestModal: boolean;
  setShowQuickEyeTestModal: (v: boolean) => void;

  // Manual Email Share Modal
  emailModalData: EmailModalPayload | null;
  openEmailModal: (data: EmailModalPayload) => void;
  closeEmailModal: () => void;

  // Helpers
  generateNextInvoiceNo: () => string;
  resetToFactoryDefaults: () => void;

  // Cloud workspace controls (surfaced in the profile menu)
  cloudError: string;
  retryCloudSave: () => void;
  downloadBackup: () => void;
  cloudIsDirty: () => boolean;
  switchWorkspace: () => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const localDate = () => new Date().toLocaleDateString('en-CA');

const LOCAL_STORAGE_KEY = 'JIYA_OPTICALS_ERP_V2';

export const AppProvider: React.FC<{ children: React.ReactNode; ownerId?: string; initialSnapshot?: Snapshot; initialVersion?: number; authenticatedUser?: UserAccount }> = ({ children, ownerId, initialSnapshot = {}, initialVersion = 0, authenticatedUser }) => {
  const readSaved = (key: string) => {
    if (ownerId) {
      if (key.endsWith('_current_user')) return JSON.stringify(authenticatedUser);
      if (key.endsWith('_shop_filter')) return null;
      return initialSnapshot[key] === undefined ? (key.endsWith('_profile') ? null : '[]') : JSON.stringify(initialSnapshot[key]);
    }
    return localStorage.getItem(key);
  };
  const [activeTab, setActiveTabState] = useState<NavTab>('dashboard');
  const [language, setLanguageState] = useState<'EN' | 'HI'>(getLanguage);
  const setLanguage=(value:'EN'|'HI')=>{setLocale(value);setLanguageState(value);};
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(() => {
    try { return localStorage.getItem('JIYA_SIDEBAR_COLLAPSED') === '1'; } catch { return false; }
  });
  const setSidebarCollapsed = (v: boolean) => {
    setSidebarCollapsedState(v);
    try { localStorage.setItem('JIYA_SIDEBAR_COLLAPSED', v ? '1' : '0'); } catch { /* ignore */ }
  };
  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // Modals
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedPrescriptionForPrint, setSelectedPrescriptionForPrint] = useState<Prescription | null>(null);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);

  // Quick Action Modals
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [onBarcodeScannedCallback, setOnBarcodeScannedCallback] = useState<((barcode: string) => void) | null>(null);
  const [showQuickEyeTestModal, setShowQuickEyeTestModal] = useState(false);
  const [selectedCustomerForAction, setSelectedCustomerForAction] = useState<Customer | null>(null);

  // Manual Email Modal State
  const [emailModalData, setEmailModalData] = useState<EmailModalPayload | null>(null);
  const openEmailModal = (data: EmailModalPayload) => {
    setEmailModalData(data);
  };
  const closeEmailModal = () => {
    setEmailModalData(null);
  };

  // Shop Prompt Modal
  const [showShopSelectModal, setShowShopSelectModal] = useState(false);
  const [shopSelectPromptTitle, setShopSelectPromptTitle] = useState('Select Shop / Branch');
  const [pendingShopCallback, setPendingShopCallback] = useState<((shopId: string) => void) | null>(null);

  // Multi-Shop and Users State
  const [shops, setShops] = useState<ShopBranch[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_shops`);
    return saved ? JSON.parse(saved) : initialShops;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_users`);
    return saved ? JSON.parse(saved) : initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_current_user`);
    return saved ? JSON.parse(saved) : initialUsers[0];
  });

  const [selectedShopFilter, setSelectedShopFilterState] = useState<string>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_shop_filter`);
    return saved || 'all';
  });

  // Storage loading for other entities
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_profile`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.name.toLowerCase().includes('joy')) {
          parsed.name = 'JIYA OPTICALS';
          parsed.email = parsed.email?.replace(/joy/gi, 'jiya') || 'contact@jiyaopticals.com';
          parsed.upiId = parsed.upiId?.replace(/joy/gi, 'jiya') || 'jiyaopticals@upi';
          parsed.upiName = parsed.upiName?.replace(/joy/gi, 'Jiya') || 'Jiya Opticals';
          if (parsed.invoicePrefix && parsed.invoicePrefix.includes('JOY')) {
            parsed.invoicePrefix = parsed.invoicePrefix.replace(/JOY/g, 'JIYA');
          }
        }
        return parsed;
      } catch {
        return initialStoreProfile;
      }
    }
    return initialStoreProfile;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_customers`);
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_invoices`);
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_doctors`);
    return saved ? JSON.parse(saved) : initialDoctors;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_purchases`);
    return saved ? JSON.parse(saved) : initialPurchases;
  });

  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_wa_templates`);
    return saved ? JSON.parse(saved) : initialWhatsAppTemplates;
  });

  const [followUps, setFollowUps] = useState<FollowUpReminder[]>(() => {
    const saved = readSaved(`${LOCAL_STORAGE_KEY}_followups`);
    return saved ? JSON.parse(saved) : initialFollowUps;
  });

  const [payments, setPayments] = useState<PaymentReceipt[]>(() => {
    const saved=readSaved(LOCAL_STORAGE_KEY+'_payments'); return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    if(currentUser.role!=='Admin')return;
    const expanded=expandCatalog(products,shops.map(s=>s.id));
    if(JSON.stringify(expanded)!==JSON.stringify(products))setProducts(expanded);
  },[products,shops,currentUser.role]);
  useEffect(() => { if (!ownerId) localStorage.setItem(LOCAL_STORAGE_KEY+'_payments',JSON.stringify(payments)); },[payments]);

  const cloud = useCloudSave(ownerId, initialVersion, {
    [LOCAL_STORAGE_KEY + '_shops']: shops,
    [LOCAL_STORAGE_KEY + '_users']: users,
    [LOCAL_STORAGE_KEY + '_profile']: storeProfile,
    [LOCAL_STORAGE_KEY + '_products']: products,
    [LOCAL_STORAGE_KEY + '_customers']: customers,
    [LOCAL_STORAGE_KEY + '_invoices']: invoices,
    [LOCAL_STORAGE_KEY + '_suppliers']: suppliers,
    [LOCAL_STORAGE_KEY + '_doctors']: doctors,
    // `staff` is reserved by the cloud workspace schema but has no UI yet; send an
    // empty array so optical_team_save's array validation for every key still passes.
    [LOCAL_STORAGE_KEY + '_staff']: [],
    [LOCAL_STORAGE_KEY + '_expenses']: expenses,
    [LOCAL_STORAGE_KEY + '_purchases']: purchases,
    [LOCAL_STORAGE_KEY + '_wa_templates']: whatsappTemplates,
    [LOCAL_STORAGE_KEY + '_followups']: followUps,
    [LOCAL_STORAGE_KEY + '_payments']: payments,
  }, (remote) => {
    setShops(remote[LOCAL_STORAGE_KEY+'_shops'] as ShopBranch[]);
    setUsers(remote[LOCAL_STORAGE_KEY+'_users'] as UserAccount[]);
    setStoreProfile(remote[LOCAL_STORAGE_KEY+'_profile'] as StoreProfile);
    setProducts(remote[LOCAL_STORAGE_KEY+'_products'] as Product[]);
    setCustomers(remote[LOCAL_STORAGE_KEY+'_customers'] as Customer[]);
    setInvoices(remote[LOCAL_STORAGE_KEY+'_invoices'] as Invoice[]);
    setSuppliers(remote[LOCAL_STORAGE_KEY+'_suppliers'] as Supplier[]);
    setDoctors(remote[LOCAL_STORAGE_KEY+'_doctors'] as Doctor[]);
    setExpenses(remote[LOCAL_STORAGE_KEY+'_expenses'] as Expense[]);
    setPurchases(remote[LOCAL_STORAGE_KEY+'_purchases'] as Purchase[]);
    setWhatsappTemplates(remote[LOCAL_STORAGE_KEY+'_wa_templates'] as WhatsAppTemplate[]);
    setFollowUps(remote[LOCAL_STORAGE_KEY+'_followups'] as FollowUpReminder[]);
    setPayments(remote[LOCAL_STORAGE_KEY+'_payments'] as PaymentReceipt[]);
    const allowedShops = remote[LOCAL_STORAGE_KEY+'_shops'] as ShopBranch[];
    if (selectedShopFilter !== 'all' && !allowedShops.some(shop=>shop.id===selectedShopFilter)) setSelectedShopFilterState('all');
  });

  // Sync to local storage
  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_shops`, JSON.stringify(shops));
  }, [shops]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_current_user`, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_shop_filter`, selectedShopFilter);
  }, [selectedShopFilter]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_profile`, JSON.stringify(storeProfile));
  }, [storeProfile]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_products`, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_customers`, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_invoices`, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_doctors`, JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_expenses`, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_purchases`, JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_wa_templates`, JSON.stringify(whatsappTemplates));
  }, [whatsappTemplates]);

  useEffect(() => {
    if (!ownerId) localStorage.setItem(`${LOCAL_STORAGE_KEY}_followups`, JSON.stringify(followUps));
  }, [followUps]);

  // When currentUser changes, enforce shop filtering if not Admin
  const handleSetCurrentUser = (u: UserAccount) => {
    if (ownerId) return;
    setCurrentUser(u);
    if (u.role !== 'Admin' && u.shopId !== 'all') {
      setSelectedShopFilterState(u.shopId);
    }
  };

  const setSelectedShopFilter = (shopId: string) => {
    if (shopId !== 'all' && !shops.some(s => s.id === shopId)) return;
    if (!ownerId && currentUser.role !== 'Admin' && currentUser.shopId !== 'all' && shopId !== currentUser.shopId) {
      alert(`As ${currentUser.name} (${currentUser.role}), you can only access ${currentUser.shopId}.`);
      return;
    }
    setSelectedShopFilterState(shopId);
  };

  const activeShop: ShopBranch = 
    shops.find((s) => s.id === selectedShopFilter) || shops[0] || initialShops[0];

  const canAccessTab = (tab: NavTab): boolean => {
    if(tab==='profile')return true;
    const role = currentUser.role;
    if (ownerId && role !== 'Admin') return ['dashboard','billing','eyetesting','inventory','customers','followups','daybook'].includes(tab);
    if (role === 'Admin') return true;
    if (role === 'Shop Manager') {
      return ['dashboard', 'billing', 'eyetesting', 'inventory', 'customers', 'followups', 'broadcast', 'daybook', 'masters'].includes(tab);
    }
    if (role === 'Optometrist') {
      return ['dashboard', 'eyetesting', 'customers', 'followups'].includes(tab);
    }
    if (role === 'Cashier') {
      return ['dashboard', 'billing', 'customers', 'daybook', 'followups'].includes(tab);
    }
    if (role === 'Lab Technician') {
      return ['dashboard', 'inventory'].includes(tab);
    }
    return true;
  };

  const setActiveTab = (tab: NavTab) => { if (canAccessTab(tab)) setActiveTabState(tab); };
  const assertAdmin = () => { if (ownerId && currentUser.role !== 'Admin') throw new Error('Admin access required'); };
  const resolveShop = (requested?: string) => {
    let id = requested || (selectedShopFilter !== 'all' ? selectedShopFilter : shops[0]?.id);
    // 'all' is a valid shared allocation locally, but a cloud workspace stores every
    // record against one real branch, so map it to the first branch when signed in.
    if (id === 'all') id = ownerId ? shops[0]?.id : 'all';
    if (id === 'all') return 'all';
    if (!id || !shops.some(s=>s.id===id)) throw new Error('Create and select a shop first');
    return id;
  };

  // Shop Prompt Helper
  const promptShopSelect = (actionTitle: string, callback: (shopId: string) => void) => {
    if (selectedShopFilter !== 'all') {
      callback(selectedShopFilter);
      return;
    }
    setShopSelectPromptTitle(actionTitle);
    setPendingShopCallback(() => callback);
    setShowShopSelectModal(true);
  };

  const confirmShopSelection = (shopId: string) => {
    setShowShopSelectModal(false);
    if (pendingShopCallback) {
      pendingShopCallback(shopId);
      setPendingShopCallback(null);
    }
  };

  // Camera Barcode Scanner
  const openCameraScanner = (onScanned: (barcode: string) => void) => {
    setOnBarcodeScannedCallback(() => onScanned);
    setShowCameraScannerModal(true);
  };

  const closeCameraScanner = () => {
    setShowCameraScannerModal(false);
    setOnBarcodeScannedCallback(null);
  };

  const triggerBarcodeScan = (barcode: string) => {
    if (onBarcodeScannedCallback) {
      onBarcodeScannedCallback(barcode);
    }
    closeCameraScanner();
  };

  // WhatsApp Message Formatter
  const formatWhatsAppMessage = (
    template: WhatsAppTemplate,
    data: { 
      name: string; 
      invoiceNo?: string; 
      amount?: number | string; 
      deliveryDate?: string; 
      dueDate?: string; 
      notes?: string;
      shopId?: string;
    }
  ) => {
    const shop = shops.find((s) => s.id === data.shopId) || activeShop;
    let msg = template.body;
    msg = msg.replace(/{name}/g, data.name || 'Valued Customer');
    msg = msg.replace(/{store_name}/g, storeProfile.name || 'Jiya Opticals');
    msg = msg.replace(/{shop_name}/g, shop.name || storeProfile.name);
    msg = msg.replace(/{invoice_no}/g, data.invoiceNo || 'N/A');
    msg = msg.replace(/{amount}/g, String(data.amount ?? '0'));
    msg = msg.replace(/{delivery_date}/g, data.deliveryDate || 'Tomorrow');
    msg = msg.replace(/{due_date}/g, data.dueDate || new Date().toISOString().split('T')[0]);
    msg = msg.replace(/{phone}/g, shop.phone || storeProfile.phone);
    return msg;
  };

  // Follow-up WhatsApp Sender
  const sendFollowUpWhatsApp = (fol: FollowUpReminder, customMsg?: string) => {
    const shop = shops.find((s) => s.id === fol.shopId) || activeShop;
    let text = customMsg;
    if (!text) {
      text = `Namaste *${fol.customerName}*, greetings from *${storeProfile.name}* (${shop.name}). ` +
        `This is a friendly reminder for your *${fol.type}* scheduled on *${fol.dueDate}*. ` +
        `Regular eye checkups keep your vision crystal clear! 👓\n\n` +
        `📍 Visit: ${shop.address}\n📞 Call: ${shop.phone}`;
    }
    const cleanPhone = fol.customerMobile.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    updateFollowUpStatus(fol.id, 'Sent');
  };

  // Due Followups
  const todayStr = new Date().toISOString().split('T')[0];
  const dueFollowUpsCount = followUps.filter(
    (f) => f.status === 'Pending' && (selectedShopFilter === 'all' || f.shopId === selectedShopFilter)
  ).length;

  const updateStoreProfile = (profile: StoreProfile) => {
    assertAdmin();
    setStoreProfile(profile);
  };

  const addShop = (shopData: Omit<ShopBranch, 'id'>): ShopBranch => {
    assertAdmin();
    const newShop: ShopBranch = {
      ...shopData,
      id: `shop-${Date.now()}`
    };
    setShops((prev) => [...prev, newShop]);
    setProducts(prev=>expandCatalog(prev,[...shops.map(s=>s.id),newShop.id]));
    return newShop;
  };

  const updateShop = (shop: ShopBranch) => {
    assertAdmin();
    setShops((prev) => prev.map((s) => (s.id === shop.id ? shop : s)));
  };

  const deleteShop = (id: string) => {
    assertAdmin();
    if ([...products,...customers,...invoices,...expenses,...purchases,...followUps,...payments].some(record=>record.shopId===id)) {
      alert('This shop has business records and cannot be deleted.'); return;
    }
    if (shops.length <= 1) {
      alert('You must have at least one shop branch.');
      return;
    }
    setShops((prev) => prev.filter((s) => s.id !== id));
    if (selectedShopFilter === id) {
      setSelectedShopFilterState('all');
    }
  };

  const addUser = (userData: Omit<UserAccount, 'id'>) => {
    assertAdmin();
    const newUser: UserAccount = {
      ...userData,
      id: `user-${Date.now()}`
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const updateUser = (user: UserAccount) => {
    assertAdmin();
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    if (currentUser.id === user.id) {
      setCurrentUser(user);
    }
  };

  const saveMyProfile = async (details:{name:string;username:string;phone:string}) => {
    const clean={name:details.name.trim(),username:details.username.trim(),phone:details.phone.trim()};
    if(!clean.name||!clean.username)throw new Error('Name and username are required.');
    if(ownerId && supabase){const {error}=await supabase.rpc('optical_user_sync',{display_name:clean.name,uname:clean.username,phone:clean.phone});if(error)throw error;}
    const updated={...currentUser,...clean};setCurrentUser(updated);
    if(!ownerId)setUsers(prev=>prev.map(u=>u.id===updated.id?updated:u));
  };

  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    assertAdmin();
    if(products.some(p=>p.barcode===productData.barcode)) throw new Error('This barcode already exists in the shared catalogue. Select the shop to receive or adjust its stock.');
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      shopId: resolveShop(productData.shopId)
    };
    newProduct.catalogId = `catalog-${newProduct.id}`;
    setProducts((prev) => expandCatalog([newProduct, ...prev],shops.map(s=>s.id)));
    return newProduct;
  };

  const addMultipleProducts = (newProductsList: Omit<Product, 'id'>[]): number => {
    assertAdmin();
    const seen = new Set(products.map(p=>p.barcode));
    for(const p of newProductsList) { if(seen.has(p.barcode)) throw new Error(`Barcode ${p.barcode} already exists. Import only new materials.`); seen.add(p.barcode); }
    const formatted: Product[] = newProductsList.map((p, idx) => ({
      ...p,
      id: `prod-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      shopId: resolveShop(p.shopId)
    }));
    setProducts((prev) => expandCatalog([...formatted, ...prev],shops.map(s=>s.id)));
    return formatted.length;
  };

  const updateProduct = (product: Product) => {
    assertAdmin();
    if(products.some(p=>catalogKey(p)!==catalogKey(product)&&p.barcode===product.barcode))throw new Error('Barcode belongs to another material.');
    const updated=updateCatalogProduct(products,product);
    setProducts(updated);
  };

  const deleteProduct = (id: string) => {
    assertAdmin();
    const material=products.find(p=>p.id===id); if(!material)return;
    const ids=products.filter(p=>catalogKey(p)===catalogKey(material)).map(p=>p.id);
    if(products.some(p=>ids.includes(p.id)&&p.stockQty!==0)||[...invoices,...purchases].some(doc=>doc.items.some(i=>ids.includes(i.productId)))){
      alert('Material with stock or transaction history cannot be deleted.');return;
    }
    setProducts(prev=>prev.filter(p=>!ids.includes(p.id)));
  };

  const adjustStock = (id: string, newQty: number) => {
    if(!Number.isInteger(newQty)||newQty<0)throw new Error('Stock must be a non-negative whole number.');
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stockQty: Math.max(0, newQty) } : p))
    );
  };

  const transferStock = (id:string,targetShopId:string,qty:number) => {
    const updated=transferCatalogStock(products,id,targetShopId,qty);
    setProducts(updated);
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'outstandingBalance' | 'prescriptions'>): Customer => {
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      totalSpent: 0,
      outstandingBalance: 0,
      prescriptions: [],
      shopId: resolveShop(customerData.shopId)
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
  };

  const addPrescriptionToCustomer = (rxData: Omit<Prescription, 'id'>): Prescription => {
    const newRx: Prescription = {
      ...rxData,
      id: `rx-${Date.now()}`,
      shopId: resolveShop(rxData.shopId)
    };

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === rxData.customerId) {
          return {
            ...c,
            prescriptions: [newRx, ...c.prescriptions],
            lastVisit: newRx.date,
            nextFollowUpDate: newRx.nextCheckupDate
          };
        }
        return c;
      })
    );

    // Auto create follow-up reminder if nextCheckupDate exists
    if (newRx.nextCheckupDate) {
      addFollowUp({
        customerId: rxData.customerId,
        customerName: rxData.customerName,
        customerMobile: rxData.customerMobile,
        shopId: newRx.shopId!,
        type: newRx.followUpInterval === '6 Months' ? '6-Month Vision Review' : 'Annual Eye Checkup',
        dueDate: newRx.nextCheckupDate,
        notes: `Vision follow-up for Rx power: ${newRx.notes || 'Periodic test'}`,
        prescriptionId: newRx.id
      });
    }

    if (rxData.doctorName) {
      setDoctors((prev) =>
        prev.map((d) =>
          d.name === rxData.doctorName ? { ...d, totalReferrals: d.totalReferrals + 1 } : d
        )
      );
    }

    return newRx;
  };

  const generateNextInvoiceNo = () => {
    const prefix = storeProfile.invoicePrefix || 'JIYA/25-26/';
    const currentMax = invoices.reduce((max, inv) => {
      const match = inv.invoiceNo.match(/\d+$/);
      if (match) {
        const num = parseInt(match[0], 10);
        return num > max ? num : max;
      }
      return max;
    }, 1040);
    return `${prefix}${currentMax + 1}`;
  };

  const createInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoiceNo' | 'date' | 'time'>): Invoice => {
    const now = new Date();
    const dateStr = localDate();
    const timeStr = now.toTimeString().slice(0, 5);
    const invoiceNo = ownerId ? `${storeProfile.invoicePrefix}${crypto.randomUUID().slice(0,8).toUpperCase()}` : generateNextInvoiceNo();
    const chosenShopId = resolveShop(invoiceData.shopId);
    const stockAfterSale=applyStockMovement(products,chosenShopId,invoiceData.items,-1);
    if (!customers.some(c => c.id === invoiceData.customerId && c.shopId === chosenShopId) || invoiceData.items.some(item => !products.some(p => p.id === item.productId && p.shopId === chosenShopId))) {
      throw new Error('Invoice customer and products must belong to the billing shop');
    }
    const shopObj = shops.find((s) => s.id === chosenShopId) || activeShop;

    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      shopId: chosenShopId,
      shopName: shopObj.name,
      invoiceNo,
      date: dateStr,
      time: timeStr
    };

    // 1. Deduct Product stock
    setProducts(stockAfterSale);

    // 2. Update customer spent & balance
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === invoiceData.customerId) {
          return {
            ...c,
            totalSpent: c.totalSpent + invoiceData.grandTotal,
            outstandingBalance: c.outstandingBalance + invoiceData.balanceDue,
            lastVisit: dateStr
          };
        }
        return c;
      })
    );

    if (newInvoice.advancePaid > 0) setPayments(prev => [...prev, {
      id:crypto.randomUUID(),shopId:chosenShopId,customerId:newInvoice.customerId,invoiceId:newInvoice.id,
      date:localDate(),amount:newInvoice.advancePaid,paymentMode:newInvoice.paymentMode,
    }]);
    setInvoices((prev) => [newInvoice, ...prev]);
    return newInvoice;
  };

  const updateOrderStatus = (invoiceId: string, newStatus: OrderStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, orderStatus: newStatus } : inv))
    );
  };

  const collectInvoiceBalance = (invoiceId: string, amount: number, paymentMode: string) => {
    const target=invoices.find(i=>i.id===invoiceId);
    if (!target || target.orderStatus==='Cancelled' || !Number.isFinite(amount) || amount<=0 || amount>target.balanceDue) {
      alert('Enter a positive amount no greater than the pending invoice balance.'); return;
    }
    const shopId=resolveShop(target.shopId);
    setInvoices(prev=>prev.map(inv=>inv.id===invoiceId ? {...inv,advancePaid:inv.advancePaid+amount,balanceDue:Math.max(0,inv.balanceDue-amount)}:inv));
    setCustomers(prev=>prev.map(c=>c.id===target.customerId?{...c,outstandingBalance:Math.max(0,c.outstandingBalance-amount)}:c));
    setPayments(prev=>[...prev,{id:crypto.randomUUID(),shopId,customerId:target.customerId,invoiceId,date:localDate(),amount,paymentMode}]);
  };

  const receiveCustomerPayment = (customerId: string, amount: number, paymentMode: string, invoiceId?: string) => {
    if(invoiceId){
      if(invoices.find(i=>i.id===invoiceId)?.customerId!==customerId){alert('Invoice does not belong to this customer.');return;}
      collectInvoiceBalance(invoiceId,amount,paymentMode);return;
    }
    const customer=customers.find(c=>c.id===customerId);
    if(!customer || !Number.isFinite(amount) || amount<=0 || amount>customer.outstandingBalance){alert('Enter a positive amount within the customer balance.');return;}
    const shopId=resolveShop(customer.shopId);
    let remaining=amount;
    const allocations=new Map<string,number>();
    const receipts:PaymentReceipt[]=[];
    for(const inv of [...invoices].filter(i=>i.customerId===customerId && i.shopId===shopId && i.orderStatus!=='Cancelled' && i.balanceDue>0).sort((a,b)=>a.date.localeCompare(b.date))){
      const paid=Math.min(remaining,inv.balanceDue); if(paid<=0)break;
      allocations.set(inv.id,paid); remaining-=paid;
      receipts.push({id:crypto.randomUUID(),shopId,customerId,invoiceId:inv.id,date:localDate(),amount:paid,paymentMode});
    }
    if(remaining>0)receipts.push({id:crypto.randomUUID(),shopId,customerId,date:localDate(),amount:remaining,paymentMode});
    setInvoices(prev=>prev.map(inv=>allocations.has(inv.id)?{...inv,advancePaid:inv.advancePaid+allocations.get(inv.id)!,balanceDue:Math.max(0,inv.balanceDue-allocations.get(inv.id)!)}:inv));
    setCustomers(prev=>prev.map(c=>c.id===customerId?{...c,outstandingBalance:Math.max(0,c.outstandingBalance-amount)}:c));
    setPayments(prev=>[...prev,...receipts]);
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'currentBalance'>) => {
    const newSupplier: Supplier = {
      ...supplierData,
      id: `supp-${Date.now()}`,
      currentBalance: supplierData.openingBalance
    };
    setSuppliers((prev) => [newSupplier, ...prev]);
  };

  const updateSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)));
  };

  const paySupplier = (supplierId: string, amount: number) => {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId ? { ...s, currentBalance: Math.max(0, s.currentBalance - amount) } : s
      )
    );
  };

  const addDoctor = (doctorData: Omit<Doctor, 'id' | 'totalReferrals'>) => {
    const newDoc: Doctor = {
      ...doctorData,
      id: `doc-${Date.now()}`,
      totalReferrals: 0
    };
    setDoctors((prev) => [newDoc, ...prev]);
  };

  const updateDoctor = (doctor: Doctor) => {
    setDoctors((prev) => prev.map((d) => (d.id === doctor.id ? doctor : d)));
  };

  const deleteDoctor = (id: string) => {
    setDoctors((prev) => prev.filter((d) => d.id !== id));
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      shopId: resolveShop(expenseData.shopId),
      date: localDate()
    };
    setExpenses((prev) => [newExp, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addPurchase = (purchaseData: Omit<Purchase, 'id' | 'purchaseNo'>) => {
    const shopId=resolveShop(purchaseData.shopId);
    const received=applyStockMovement(products,shopId,purchaseData.items,1);
    const purchaseNo = `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(4, '0')}`;
    const newPurchase: Purchase = {
      ...purchaseData,
      id: `pur-${Date.now()}`,
      shopId,
      purchaseNo
    };

    setProducts(
      received.map((p) => {
        const item = purchaseData.items.find((it) => it.productId === p.id);
        if (item) {
          return {
            ...p,
            purchasePrice: item.purchaseRate,
          };
        }
        return p;
      })
    );

    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === purchaseData.supplierId
          ? { ...s, currentBalance: s.currentBalance + purchaseData.balanceDue }
          : s
      )
    );

    setPurchases((prev) => [newPurchase, ...prev]);
  };

  const addWhatsAppTemplate = (tmplData: Omit<WhatsAppTemplate, 'id'>): WhatsAppTemplate => {
    const newTmpl: WhatsAppTemplate = {
      ...tmplData,
      id: `tmpl-${Date.now()}`
    };
    setWhatsappTemplates((prev) => [...prev, newTmpl]);
    return newTmpl;
  };

  const updateWhatsAppTemplate = (tmpl: WhatsAppTemplate) => {
    setWhatsappTemplates((prev) => prev.map((t) => (t.id === tmpl.id ? tmpl : t)));
  };

  const deleteWhatsAppTemplate = (id: string) => {
    setWhatsappTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const addFollowUp = (folData: Omit<FollowUpReminder, 'id' | 'status'>): FollowUpReminder => {
    const newFol: FollowUpReminder = {
      ...folData,
      id: `fol-${Date.now()}`,
      status: 'Pending'
    };
    setFollowUps((prev) => [newFol, ...prev]);
    return newFol;
  };

  const updateFollowUpStatus = (id: string, status: 'Pending' | 'Sent' | 'Completed' | 'Dismissed') => {
    setFollowUps((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              status,
              lastContactedAt: status === 'Sent' ? new Date().toISOString().split('T')[0] : f.lastContactedAt
            }
          : f
      )
    );
  };

  const deleteFollowUp = (id: string) => {
    setFollowUps((prev) => prev.filter((f) => f.id !== id));
  };

  const resetToFactoryDefaults = () => {
    if (ownerId) { alert('Demo reset is disabled for cloud stores.'); return; }
    if (!window.confirm('Reset all store data to demo defaults? This also replaces the cloud data when connected.')) return;
    if (!ownerId) Object.keys(localStorage).filter(key => key.startsWith(LOCAL_STORAGE_KEY)).forEach(key => localStorage.removeItem(key));
    setStoreProfile(initialStoreProfile);
    setProducts(initialProducts);
    setCustomers(initialCustomers);
    setInvoices(initialInvoices);
    setSuppliers(initialSuppliers);
    setDoctors(initialDoctors);
    setExpenses(initialExpenses);
    setPurchases(initialPurchases);
    setShops(initialShops);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setSelectedShopFilterState('all');
    setWhatsappTemplates(initialWhatsAppTemplates);
    setFollowUps(initialFollowUps);
    setPayments([]);
  };

  const scoped = <T extends { shopId?: string },>(records: T[]) => selectedShopFilter === 'all' ? records : records.filter(r=>r.shopId===selectedShopFilter);
  return (
    <AppContext.Provider
      value={{
        ownerId, isCloud:!!ownerId, saveStatus:cloud.status, payments:scoped(payments),
        saveMyProfile,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        searchQuery,
        setSearchQuery,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,

        shops,
        addShop,
        updateShop,
        deleteShop,
        users,
        currentUser,
        setCurrentUser: handleSetCurrentUser,
        addUser,
        updateUser,
        selectedShopFilter,
        setSelectedShopFilter,
        activeShop,
        canAccessTab,

        storeProfile,
        updateStoreProfile,
        products:scoped(products),
        allProducts:products,
        addProduct,
        addMultipleProducts,
        updateProduct,
        deleteProduct,
        adjustStock,
        transferStock,
        customers:scoped(customers),
        addCustomer,
        updateCustomer,
        addPrescriptionToCustomer,
        receiveCustomerPayment,
        invoices:scoped(invoices),
        createInvoice,
        updateOrderStatus,
        collectInvoiceBalance,
        suppliers,
        addSupplier,
        updateSupplier,
        paySupplier,
        doctors,
        addDoctor,
        updateDoctor,
        deleteDoctor,
        expenses:scoped(expenses),
        addExpense,
        deleteExpense,
        purchases:scoped(purchases),
        addPurchase,

        whatsappTemplates,
        addWhatsAppTemplate,
        updateWhatsAppTemplate,
        deleteWhatsAppTemplate,
        formatWhatsAppMessage,

        followUps:scoped(followUps),
        addFollowUp,
        updateFollowUpStatus,
        deleteFollowUp,
        sendFollowUpWhatsApp,
        dueFollowUpsCount,

        selectedInvoiceForPrint,
        setSelectedInvoiceForPrint,
        selectedPrescriptionForPrint,
        setSelectedPrescriptionForPrint,
        selectedProductForBarcode,
        setSelectedProductForBarcode,

        showQuickClientModal,
        setShowQuickClientModal,
        showCameraScannerModal,
        setShowCameraScannerModal,
        openCameraScanner,
        closeCameraScanner,
        onBarcodeScannedCallback,
        triggerBarcodeScan,

        showShopSelectModal,
        setShowShopSelectModal,
        promptShopSelect,
        shopSelectPromptTitle,
        confirmShopSelection,

        selectedCustomerForAction,
        setSelectedCustomerForAction,
        showQuickEyeTestModal,
        setShowQuickEyeTestModal,

        emailModalData,
        openEmailModal,
        closeEmailModal,

        generateNextInvoiceNo,
        resetToFactoryDefaults,

        cloudError: cloud.error,
        retryCloudSave: cloud.retry,
        downloadBackup: cloud.download,
        cloudIsDirty: cloud.isDirty,
        switchWorkspace: () => {
          if (cloud.isDirty()) { alert('Wait for changes to save before switching businesses.'); return; }
          location.reload();
        },
        signOut: async () => {
          if (cloud.isDirty()) { alert('Please wait for changes to save, or download a backup before leaving.'); return; }
          const { error } = await supabase!.auth.signOut();
          if (error) alert(error.message);
        },
      }}
    >
      {ownerId && cloud.error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm flex flex-wrap items-center gap-3" role="alert">
          <span className="text-red-700 font-medium">{cloud.error}</span>
          <button className="underline" onClick={cloud.retry}>Retry save</button>
          <button className="underline" onClick={cloud.download}>Download unsaved data</button>
          <button className="underline" onClick={() => { if (confirm('Reload and discard unsaved changes? Download a backup first.')) location.reload(); }}>Reload</button>
        </div>
      )}
      {cloud.locked ? <div className="p-10 text-center">Store access or data changed. Download any unsaved data from the banner above, then reload.</div> : children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
