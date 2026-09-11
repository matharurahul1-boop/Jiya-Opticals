import { t } from '../lib/i18n';
import { NumberInput } from './NumberInput';
import { QuickAddPerson } from './QuickAddPerson';
import { findScannedProduct } from '../lib/barcodes';
import { applyStockMovement } from '../lib/catalog';
import React, { useEffect, useRef, useState } from 'react';
import { 
  Calculator, 
  Check, 
  Eye, 
  Glasses, 
  Plus, 
  Printer, 
  QrCode, 
  Receipt, 
  RotateCcw, 
  Search, 
  Send, 
  ShoppingBag, 
  Trash2, 
  User, 
  UserPlus 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { resolveUpiQr } from '../lib/upiQr';
import { categoryGst } from '../lib/gst';
import {
  Customer,
  EyePower,
  InvoiceItem,
  OrderStatus,
  PaymentMode,
  Prescription,
  Product,
  ProductCategory
} from '../types';

export const BillingPOS: React.FC = () => {
  const { 
    storeProfile, 
    products, 
    customers, 
    doctors,
    addCustomer,
    createInvoice, 
    setSelectedInvoiceForPrint,
    openCameraScanner,
    selectedCustomerForAction,
    setSelectedCustomerForAction,
    selectedShopFilter,
    setSelectedShopFilter,
    promptShopSelect,
    currentUser,
    shops
  } = useApp();

  // Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    return selectedCustomerForAction?.id || '';
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustCity, setNewCustCity] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Auto-sync if selectedCustomerForAction changes
  useEffect(() => {
    if (selectedCustomerForAction) {
      setSelectedCustomerId(selectedCustomerForAction.id);
    }
  }, [selectedCustomerForAction]);

  // Cart & Line Items
  const [cartItems, setCartItems] = useState<InvoiceItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const previousBillingShop=useRef(selectedShopFilter);
  useEffect(()=>{
    if(previousBillingShop.current===selectedShopFilter)return;
    previousBillingShop.current=selectedShopFilter;
    setCartItems([]); setSelectedCustomerId(''); setBarcodeInput(''); setProductSearch('');
  },[selectedShopFilter]);

  // Doctor & Sales Staff
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [showQuickDoctor, setShowQuickDoctor] = useState(false);

  // Prescription Attachment
  const [attachPrescription, setAttachPrescription] = useState(false);
  const [rightEye, setRightEye] = useState<EyePower>({ sph: '', cyl: '', axis: '', add: '', dv: '6/6', nv: 'N6' });
  const [leftEye, setLeftEye] = useState<EyePower>({ sph: '', cyl: '', axis: '', add: '', dv: '6/6', nv: 'N6' });
  const [pdMm, setPdMm] = useState('');
  const [lensNotes, setLensNotes] = useState('');

  // Order Details & Payment
  const [orderType, setOrderType] = useState<'Direct' | 'Order'>('Direct');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [fittingCharge, setFittingCharge] = useState<number>(0);
  const [flatDiscount, setFlatDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI / QR');
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiQrSrc, setUpiQrSrc] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Auto-fill customer prescription if available
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.prescriptions.length > 0) {
      const latestRx = selectedCustomer.prescriptions[0];
      setRightEye(latestRx.rightEye);
      setLeftEye(latestRx.leftEye);
      setPdMm(latestRx.pdMm);
      if (latestRx.doctorName) setSelectedDoctor(latestRx.doctorName);
    }
  }, [selectedCustomerId]);

  // Handle Quick Barcode Scan
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = findScannedProduct(products, barcodeInput);

    if (found) {
      addProductToCart(found);
      setBarcodeInput('');
    } else {
      alert(`Product with barcode "${barcodeInput}" not uniquely matched in this shop. Check sync and duplicate codes.`);
    }
  };

  const addProductToCart = (product: Product) => {
    const existingIndex = cartItems.findIndex((it) => it.productId === product.id);

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].qty += 1;
      recalcLineItem(updated[existingIndex]);
      setCartItems(updated);
    } else {
      const gstRate = categoryGst(storeProfile, product.category, product.gstRate);
      const gstFraction = gstRate / (100 + gstRate);
      const taxable = product.salePrice - product.salePrice * gstFraction;
      const taxTotal = product.salePrice - taxable;

      const newItem: InvoiceItem = {
        productId: product.id,
        barcode: product.barcode,
        name: `${product.brand} ${product.modelNo} - ${product.name}`,
        category: product.category,
        hsnCode: product.hsnCode,
        qty: 1,
        unitPrice: product.salePrice,
        discountPercent: 0,
        taxableAmount: Number(taxable.toFixed(2)),
        gstRate,
        cgstAmount: Number((taxTotal / 2).toFixed(2)),
        sgstAmount: Number((taxTotal / 2).toFixed(2)),
        igstAmount: 0,
        totalAmount: product.salePrice,
        frameModel: product.modelNo
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const recalcLineItem = (item: InvoiceItem) => {
    const gross = item.unitPrice * item.qty;
    const discounted = gross - (gross * item.discountPercent) / 100;
    const gstFraction = item.gstRate / (100 + item.gstRate);
    const taxable = discounted - discounted * gstFraction;
    const taxTotal = discounted - taxable;

    item.taxableAmount = Number(taxable.toFixed(2));
    item.cgstAmount = Number((taxTotal / 2).toFixed(2));
    item.sgstAmount = Number((taxTotal / 2).toFixed(2));
    item.totalAmount = Number(discounted.toFixed(2));
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCartItems(cartItems.filter((_, i) => i !== index));
      return;
    }
    const updated = [...cartItems];
    updated[index].qty = newQty;
    recalcLineItem(updated[index]);
    setCartItems(updated);
  };

  const updateItemDiscount = (index: number, discountPercent: number) => {
    const updated = [...cartItems];
    updated[index].discountPercent = Math.max(0, Math.min(100, discountPercent));
    recalcLineItem(updated[index]);
    setCartItems(updated);
  };

  const removeItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Calculations
  const itemsSubtotal = cartItems.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
  const itemsDiscountTotal = cartItems.reduce(
    (sum, it) => sum + (it.unitPrice * it.qty * it.discountPercent) / 100,
    0
  );
  const totalCgst = cartItems.reduce((sum, it) => sum + it.cgstAmount, 0);
  const totalSgst = cartItems.reduce((sum, it) => sum + it.sgstAmount, 0);
  const totalTax = totalCgst + totalSgst;

  const rawGrandTotal = itemsSubtotal - itemsDiscountTotal - flatDiscount + fittingCharge;
  const netPayable = Math.max(0, Math.round(rawGrandTotal));
  const roundOff = Number((netPayable - rawGrandTotal).toFixed(2));

  // Sync advance payment
  useEffect(() => {
    if (orderType === 'Direct') {
      setAdvancePaid(netPayable);
    } else if (advancePaid === 0 || advancePaid > netPayable) {
      setAdvancePaid(Math.min(500, netPayable));
    }
  }, [orderType, netPayable]);

  const balanceDue = Math.max(0, netPayable - advancePaid);

  // Resolve the UPI QR shown in the "Scan to Pay" modal: uploaded image wins,
  // otherwise generate one from the UPI ID for the amount being collected.
  const upiAmount = orderType === 'Order' ? advancePaid : netPayable;
  useEffect(() => {
    if (!showUpiModal) return;
    let active = true;
    resolveUpiQr(storeProfile, upiAmount).then((src) => {
      if (active) setUpiQrSrc(src);
    });
    return () => {
      active = false;
    };
  }, [showUpiModal, upiAmount, storeProfile.upiId, storeProfile.upiName, storeProfile.upiQrDataUrl]);

  // Filtered Products Catalog for POS Grid
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      productSearch === '' ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch) ||
      p.modelNo.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.brand.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustMobile.trim()) {
      alert('Please provide customer name and mobile number.');
      return;
    }
    const created = addCustomer({
      name: newCustName.trim(),
      mobile: newCustMobile.trim(),
      email: newCustEmail.trim() || undefined,
      city: newCustCity.trim() || 'Local',
      address: newCustAddress.trim()
    });
    setSelectedCustomerId(created.id);
    setShowNewCustomerModal(false);
    setNewCustName('');
    setNewCustMobile('');
    setNewCustEmail('');
    setNewCustCity('');
    setNewCustAddress('');
  };

  const handleCheckout = (andPrint: boolean = true) => {
    if (!selectedCustomerId) {
      alert('Please select or create a Customer before checking out.');
      return;
    }
    if (cartItems.length === 0) {
      alert('Cart is empty. Please add items to generate invoice.');
      return;
    }

    const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
    if (!currentCustomer) return;
    const billingShopId = selectedShopFilter !== 'all' ? selectedShopFilter : shops[0]?.id;
    if (!billingShopId || currentCustomer.shopId !== billingShopId || cartItems.some(item => products.find(p => p.id === item.productId)?.shopId !== billingShopId)) {
      alert('Choose a customer and products from the selected shop.'); return;
    }
    if (!Number.isFinite(advancePaid) || advancePaid < 0 || advancePaid > netPayable) {
      alert('Received amount must be between zero and the bill total.'); return;
    }

    let attachedRx: Prescription | undefined = undefined;
    if (attachPrescription && (rightEye.sph || leftEye.sph)) {
      attachedRx = {
        shopId: billingShopId,
        id: `rx-${Date.now()}`,
        customerId: currentCustomer.id,
        customerName: currentCustomer.name,
        customerMobile: currentCustomer.mobile,
        date: new Date().toISOString().split('T')[0],
        doctorName: selectedDoctor || 'In-House Optometrist',
        rightEye,
        leftEye,
        pdMm,
        lensType: 'Single Vision',
        lensCoating: 'Blue Cut / Blue Block',
        lensIndex: '1.56',
        notes: lensNotes
      };
    }

    const status: OrderStatus = orderType === 'Direct' ? 'Direct Sale' : 'Order Booked';
    try { applyStockMovement(products,billingShopId,cartItems,-1); }
    catch(error) {alert(error instanceof Error?error.message:'Check shop stock before billing.');return;}

    const invoice = createInvoice({
      shopId: billingShopId,
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerMobile: currentCustomer.mobile,
      customerEmail: currentCustomer.email,
      customerAddress: currentCustomer.address,
      doctorName: selectedDoctor,
      salesmanName: currentUser?.name || '',
      items: cartItems,
      subtotal: itemsSubtotal,
      totalDiscount: itemsDiscountTotal + flatDiscount,
      totalTax,
      cgstTotal: totalCgst,
      sgstTotal: totalSgst,
      igstTotal: 0,
      fittingTotal: fittingCharge,
      grandTotal: rawGrandTotal,
      roundOff,
      netPayable,
      advancePaid,
      balanceDue,
      paymentMode,
      paymentRef,
      orderStatus: status,
      deliveryDate: orderType === 'Order' ? deliveryDate : undefined,
      prescription: attachedRx,
      notes: orderNotes
    });

    if (andPrint) {
      setSelectedInvoiceForPrint(invoice);
    } else {
      alert(`Invoice ${invoice.invoiceNo} successfully generated!`);
    }

    // Reset POS form
    setCartItems([]);
    setFlatDiscount(0);
    setFittingCharge(0);
    setOrderNotes('');
    setPaymentRef('');
    setAttachPrescription(false);
  };

  const categoriesList: ProductCategory[] = [
    'Spectacle Frame',
    'Sunglasses',
    'Ophthalmic Lens',
    'Contact Lens',
    'Lens Solution',
    'Optical Accessory'
  ];

  if(selectedShopFilter==='all' && shops.length>1) return <div className="max-w-3xl mx-auto p-8 space-y-5"><h1 className="text-2xl font-semibold text-stone-900">{t("Which shop is making this sale?")}</h1><p className="text-stone-500">{t("The material catalogue is shared. Stock and revenue will be recorded against the shop you choose.")}</p><div className="grid sm:grid-cols-2 gap-4">{shops.map(shop=><button key={shop.id} onClick={()=>setSelectedShopFilter(shop.id)} className="p-6 bg-white border border-stone-200 hover:border-amber-400 rounded-2xl text-left shadow-sm"><strong className="block text-lg">{shop.name}</strong><span className="text-sm text-stone-500">{shop.address}</span></button>)}</div></div>;

  return (
    <div id="billing-pos-container" className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* POS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              {t("Billing POS Counter ")}<span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                {t("GST BILLING ")}</span>
            </h1>
            <p className="text-xs text-stone-500">
              {t("Scan barcode or select frames, lenses, and attach prescription. ")}</p>
          </div>
        </div>

        {/* Barcode Quick Entry & Camera Scan Button */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            id="btn-pos-camera-scan"
            onClick={() => {
              openCameraScanner((scannedCode) => {
                const found = findScannedProduct(products, scannedCode);
                if (found) {
                  addProductToCart(found);
                } else {
                  alert(`Item with barcode "${scannedCode}" not uniquely matched in this shop. Check sync and duplicate codes.`);
                }
              });
            }}
            className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
            title={t("Scan with Camera")}
          >
            <QrCode className="w-4 h-4" />
            <span>{t("Scan Camera")}</span>
          </button>

          <form onSubmit={handleBarcodeSubmit} className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={t("Scan Barcode...")}
                className="bg-stone-50 border border-stone-200 focus:border-amber-500 text-xs rounded-lg pl-8 pr-3 py-2 text-stone-800 placeholder-stone-400 w-36 md:w-56 outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              {t("Add ")}</button>
          </form>
        </div>
      </div>

      {/* Main Grid: Left Cart & Billing summary, Right Products & Customer picker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Columns: Active Bill Cart & Pricing & Prescription */}
        <div className="lg:col-span-7 space-y-4">
          {/* Customer Selection Card */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-stone-700 uppercase">
                <User className="w-4 h-4 text-amber-600" />
                <span>{t("Customer & Patient")}</span>
              </div>
              <button
                onClick={() => setShowNewCustomerModal(true)}
                className="text-xs text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 font-semibold"
              >
                <UserPlus className="w-3.5 h-3.5" /> {t("+ New Customer ")}</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-stone-50 border border-stone-200 text-xs text-stone-800 rounded-lg p-2.5 outline-none focus:border-amber-500 font-medium"
              >
                <option value="">{t("-- Select Customer --")}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile}) {c.outstandingBalance > 0 ? `[Dues: ₹${c.outstandingBalance}]` : ''}
                  </option>
                ))}
              </select>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="bg-stone-50 border border-stone-200 text-xs text-stone-700 rounded-lg p-2.5 outline-none focus:border-amber-500 flex-1"
                >
                  <option value="">{t("-- Attending Doctor / Optometrist --")}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.qualification})
                    </option>
                  ))}
                </select>
                <button type="button" aria-label={t('Add doctor')} title={t('Add doctor')} onClick={() => setShowQuickDoctor(true)} className="shrink-0 rounded-lg bg-amber-100 text-amber-800 p-2.5 hover:bg-amber-200"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {selectedCustomer && (
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs text-stone-700">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-stone-900">{selectedCustomer.name}</span>
                    <span>• 📞 {selectedCustomer.mobile}</span>
                    {selectedCustomer.email && (
                      <span className="text-sky-700 font-medium">✉️ {selectedCustomer.email}</span>
                    )}
                  </div>
                  <span className="text-stone-500 block text-[11px] mt-0.5">
                    {selectedCustomer.address || 'Address not listed'} • {selectedCustomer.city}
                  </span>
                </div>
                {selectedCustomer.outstandingBalance > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                    {t("Khata Balance: ₹")}{selectedCustomer.outstandingBalance}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                {t("Cart Items (")}{cartItems.length})
              </span>
              {cartItems.length > 0 && (
                <button
                  onClick={() => setCartItems([])}
                  className="text-[11px] text-rose-600 hover:underline font-medium"
                >
                  {t("Clear Cart ")}</button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs border border-dashed border-stone-200 rounded-lg">
                {t("No items added yet. Click any product from catalog or scan barcode. ")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                    <tr>
                      <th className="py-2 px-2">{t("Item Description")}</th>
                      <th className="py-2 px-2 text-center">{t("Qty")}</th>
                      <th className="py-2 px-2 text-right">{t("Rate")}</th>
                      <th className="py-2 px-2 text-center">{t("Disc %")}</th>
                      <th className="py-2 px-2 text-right">{t("GST %")}</th>
                      <th className="py-2 px-2 text-right">{t("Total")}</th>
                      <th className="py-2 px-1 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="py-2.5 px-2">
                          <div className="font-semibold text-stone-900">{item.name}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {t("HSN: ")}{item.hsnCode} {t("• Barcode: ")}{item.barcode}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <div className="inline-flex items-center border border-stone-300 rounded bg-white">
                            <button
                              onClick={() => updateItemQty(idx, item.qty - 1)}
                              className="px-2 py-0.5 hover:bg-stone-100 text-stone-600"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-stone-900 text-xs">{item.qty}</span>
                            <button
                              onClick={() => updateItemQty(idx, item.qty + 1)}
                              className="px-2 py-0.5 hover:bg-stone-100 text-stone-600"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right font-medium text-stone-800">
                          ₹{item.unitPrice}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <NumberInput
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discountPercent || ''}
                            onChange={(e) => updateItemDiscount(idx, Number(e.target.value))}
                            className="w-12 bg-stone-50 border border-stone-200 text-center rounded text-xs py-0.5 text-stone-800"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right text-stone-500">
                          {item.gstRate}%
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-amber-700">
                          ₹{item.totalAmount}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <button
                            onClick={() => removeItem(idx)}
                            className="text-stone-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Prescription & Optical Refraction Accordion */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={attachPrescription}
                  onChange={(e) => setAttachPrescription(e.target.checked)}
                  className="rounded bg-white border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Glasses className="w-4 h-4 text-amber-600" />
                  {t("Attach Eye Power / Prescription to this Bill (OD / OS) ")}</span>
              </label>
            </div>

            {attachPrescription && (
              <div className="space-y-3 pt-2 border-t border-stone-200 text-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead>
                      <tr className="bg-stone-50 text-stone-600 uppercase text-[10px] border-b border-stone-200">
                        <th className="py-1.5 px-2 text-left">{t("Eye")}</th>
                        <th className="py-1.5 px-1">{t("SPH")}</th>
                        <th className="py-1.5 px-1">{t("CYL")}</th>
                        <th className="py-1.5 px-1">{t("AXIS")}</th>
                        <th className="py-1.5 px-1">{t("ADD")}</th>
                        <th className="py-1.5 px-1">{t("DV")}</th>
                        <th className="py-1.5 px-1">{t("NV")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="py-1.5 px-2 text-left font-bold text-amber-800">{t("Right (OD)")}</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-1.50"
                            value={rightEye.sph}
                            onChange={(e) => setRightEye({ ...rightEye, sph: e.target.value })}
                            className="w-16 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.50"
                            value={rightEye.cyl}
                            onChange={(e) => setRightEye({ ...rightEye, cyl: e.target.value })}
                            className="w-16 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="90°"
                            value={rightEye.axis}
                            onChange={(e) => setRightEye({ ...rightEye, axis: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+1.50"
                            value={rightEye.add}
                            onChange={(e) => setRightEye({ ...rightEye, add: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={rightEye.dv}
                            onChange={(e) => setRightEye({ ...rightEye, dv: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={rightEye.nv}
                            onChange={(e) => setRightEye({ ...rightEye, nv: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2 text-left font-bold text-amber-800">{t("Left (OS)")}</td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-1.75"
                            value={leftEye.sph}
                            onChange={(e) => setLeftEye({ ...leftEye, sph: e.target.value })}
                            className="w-16 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="-0.75"
                            value={leftEye.cyl}
                            onChange={(e) => setLeftEye({ ...leftEye, cyl: e.target.value })}
                            className="w-16 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="85°"
                            value={leftEye.axis}
                            onChange={(e) => setLeftEye({ ...leftEye, axis: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            placeholder="+1.50"
                            value={leftEye.add}
                            onChange={(e) => setLeftEye({ ...leftEye, add: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={leftEye.dv}
                            onChange={(e) => setLeftEye({ ...leftEye, dv: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                        <td className="py-1 px-1">
                          <input
                            type="text"
                            value={leftEye.nv}
                            onChange={(e) => setLeftEye({ ...leftEye, nv: e.target.value })}
                            className="w-14 bg-stone-50 border border-stone-200 rounded text-center py-1 text-stone-800 text-xs"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("Pupillary Distance (PD mm) e.g. 62")}
                    value={pdMm}
                    onChange={(e) => setPdMm(e.target.value)}
                    className="w-48 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-800 text-xs"
                  />
                  <input
                    type="text"
                    placeholder={t("Lens instructions / Remarks")}
                    value={lensNotes}
                    onChange={(e) => setLensNotes(e.target.value)}
                    className="flex-1 bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-800 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Product Selector & Checkout Summary */}
        <div className="lg:col-span-5 space-y-4">
          {/* Product Quick Pick Grid */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase">{t("Quick Add Products")}</span>
              <span className="text-[10px] text-amber-700 font-medium">{filteredProducts.length} {t("Items")}</span>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedCategory('All')}
                className={`px-2.5 py-1 rounded whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === 'All'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {t("All ")}</button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded whitespace-nowrap font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {cat.replace('Spectacle ', '').replace('Ophthalmic ', '')}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder={t("Search brand, model, barcode...")}
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 text-xs rounded-lg px-3 py-1.5 text-stone-800 outline-none focus:border-amber-500"
            />

            {/* Product List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => addProductToCart(p)}
                  className="p-2 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-semibold text-xs text-stone-800">{p.name}</div>
                    <div className="text-[10px] text-stone-500">
                      {p.brand} {t("• Stock: ")}<span className={p.stockQty <= p.minStockAlert ? 'text-amber-600 font-bold' : 'text-emerald-600'}>{p.stockQty}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-stone-900">₹{p.salePrice}</span>
                    <span className="text-[10px] text-amber-700 block font-medium">{t("+ Add")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Invoice Generation Panel */}
          <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-4 shadow-xs">
            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider block border-b border-stone-200 pb-2">
              {t("Payment & Checkout Summary ")}</span>

            {/* Sale Type Selector: Direct vs Order */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('Direct')}
                className={`py-2 rounded-lg font-bold border transition-all ${
                  orderType === 'Direct'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {t("Direct Sale (Delivered) ")}</button>
              <button
                type="button"
                onClick={() => setOrderType('Order')}
                className={`py-2 rounded-lg font-bold border transition-all ${
                  orderType === 'Order'
                    ? 'bg-amber-100/70 border-amber-500 text-amber-900 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
                }`}
              >
                {t("Advance / Delivery Order ")}</button>
            </div>

            {orderType === 'Order' && (
              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-900 font-medium">{t("Estimated Delivery Date:")}</span>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="bg-white border border-stone-200 text-stone-800 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Discount & Fitting adjustments */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-stone-500 text-[11px] block mb-1">{t("Fitting Charges (₹)")}</label>
                <NumberInput
                  type="number"
                  min="0"
                  placeholder="0"
                  value={fittingCharge || ''}
                  onChange={(e) => setFittingCharge(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                />
              </div>
              <div>
                <label className="text-stone-500 text-[11px] block mb-1">{t("Flat Discount (₹)")}</label>
                <NumberInput
                  type="number"
                  min="0"
                  placeholder="0"
                  value={flatDiscount || ''}
                  onChange={(e) => setFlatDiscount(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5 text-xs">
              <label className="text-stone-500 text-[11px] block">{t("Payment Method")}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['UPI / QR', 'Cash', 'Credit / Debit Card'] as PaymentMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-colors ${
                      paymentMode === mode
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === 'UPI / QR' && (
              <div className="p-2.5 bg-stone-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-800 font-bold block">{t("UPI ID: ")}{storeProfile.upiId}</span>
                  <span className="text-stone-500 text-[10px]">{t("Show Dynamic QR to Customer")}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpiModal(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5" /> {t("Show QR ")}</button>
              </div>
            )}

            {/* Advance & Balance split */}
            {orderType === 'Order' && (
              <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                <div>
                  <label className="text-stone-600 text-[10px] block font-semibold">{t("Advance Token (₹)")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    max={netPayable}
                    placeholder="0"
                    value={advancePaid || ''}
                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                    className="w-full bg-white border border-stone-300 rounded px-2 py-1 font-bold text-amber-800 text-xs"
                  />
                </div>
                <div>
                  <label className="text-stone-600 text-[10px] block font-semibold">{t("Balance Due")}</label>
                  <div className="font-bold text-rose-600 text-sm mt-1">₹{balanceDue}</div>
                </div>
              </div>
            )}

            {/* Financial Totals */}
            <div className="space-y-1.5 text-xs border-t border-stone-200 pt-3 text-stone-600">
              <div className="flex justify-between">
                <span>{t("Items Subtotal:")}</span>
                <span>₹{itemsSubtotal.toFixed(2)}</span>
              </div>
              {itemsDiscountTotal + flatDiscount > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>{t("Total Discount:")}</span>
                  <span>-₹{(itemsDiscountTotal + flatDiscount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-500 text-[11px]">
                <span>{t("Total GST Included:")}</span>
                <span>₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-stone-900 border-t border-stone-200 pt-2">
                <span>{t("Net Payable:")}</span>
                <span className="text-amber-800">₹{netPayable}</span>
              </div>
            </div>

            {/* Main Action Buttons */}
            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleCheckout(true)}
                disabled={cartItems.length === 0}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {t("SAVE & PRINT TAX INVOICE ")}</button>

              <button
                type="button"
                onClick={() => handleCheckout(false)}
                disabled={cartItems.length === 0}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
              >
                {t("Save Bill Only (Without Print) ")}</button>
            </div>
          </div>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-600" />
                {t("Register New Customer / Patient ")}</h3>
              <button
                onClick={() => setShowNewCustomerModal(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">{t("Customer Full Name *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Ramesh Chandra")}
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">{t("Mobile Number *")}</label>
                <input
                  type="tel"
                  required
                  placeholder={t("10-digit mobile number")}
                  value={newCustMobile}
                  onChange={(e) => setNewCustMobile(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">
                  {t("Email Address ")}<span className="text-[10px] text-stone-400 font-normal">{t("(for Digital Tax Invoices & Rx)")}</span>
                </label>
                <input
                  type="email"
                  placeholder={t("e.g. client@gmail.com")}
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1">{t("City")}</label>
                  <input
                    type="text"
                    placeholder={t("e.g. New Delhi")}
                    value={newCustCity}
                    onChange={(e) => setNewCustCity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">{t("Address / Landmark")}</label>
                  <input
                    type="text"
                    placeholder={t("Locality")}
                    value={newCustAddress}
                    onChange={(e) => setNewCustAddress(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs"
                >
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  {t("Save & Select Customer ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic UPI QR Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-xs w-full shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="text-xs font-bold text-amber-800">{t("Scan to Pay via UPI")}</span>
              <button onClick={() => setShowUpiModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block border border-stone-200 shadow-xs">
              <div className="w-48 h-48 bg-white border-2 border-stone-300 rounded-lg flex flex-col items-center justify-center p-2 text-stone-800">
                {upiQrSrc ? (
                  <img src={upiQrSrc} alt="UPI payment QR" className="w-36 h-36 object-contain" />
                ) : (
                  <QrCode className="w-32 h-32 text-stone-300" />
                )}
                <span className="text-[11px] font-mono font-bold mt-1 text-stone-900">
                  ₹{upiAmount}
                </span>
              </div>
            </div>
            {storeProfile.upiQrDataUrl && (
              <p className="text-[10px] text-stone-400 -mt-2">{t("Enter ₹")}{upiAmount} {t("in your UPI app after scanning.")}</p>
            )}

            <div className="text-xs text-stone-700 space-y-0.5">
              <div className="font-bold text-stone-900">{storeProfile.upiName}</div>
              <div className="text-amber-800 font-mono text-[11px]">{storeProfile.upiId}</div>
              <div className="text-[10px] text-stone-500">{t("Supports GPay, PhonePe, Paytm & any UPI app")}</div>
            </div>

            <button
              onClick={() => setShowUpiModal(false)}
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
            >
              {t("Payment Confirmed ")}</button>
          </div>
        </div>
      )}
      {showQuickDoctor && <QuickAddPerson kind="doctor" onClose={() => setShowQuickDoctor(false)} onAdded={setSelectedDoctor} />}
    </div>
  );
};
