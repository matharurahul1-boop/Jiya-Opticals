import React, { useState } from 'react';
import { 
  Building, 
  Check, 
  FilePlus, 
  Package, 
  Plus, 
  Receipt, 
  Search, 
  Truck, 
  Wallet 
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, PurchaseItem, Supplier } from '../types';

export const PurchasesManager: React.FC = () => {
  const { 
    purchases, 
    suppliers, 
    allProducts,
    shops,
    selectedShopFilter,
    addPurchase, 
    addSupplier 
  } = useApp();
  const [receivingShopId,setReceivingShopId]=useState(selectedShopFilter!=='all'?selectedShopFilter:shops.length===1?shops[0].id:'');
  const products=allProducts.filter(p=>p.shopId===receivingShopId);

  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Purchase Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierBillNo, setSupplierBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');

  // Inline Item Picker for purchase
  const [pickedProductId, setPickedProductId] = useState('');
  const [itemQty, setItemQty] = useState(10);
  const [itemRate, setItemRate] = useState(1000);
  const [itemMrp, setItemMrp] = useState(2500);
  const [itemSale, setItemSale] = useState(1999);

  // New Supplier Form
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppContact, setNewSuppContact] = useState('');
  const [newSuppMobile, setNewSuppMobile] = useState('');
  const [newSuppGstin, setNewSuppGstin] = useState('');
  const [newSuppCategory, setNewSuppCategory] = useState('Frames & Sunglasses');

  const handleAddItemToPurchase = () => {
    const prod = products.find((p) => p.id === pickedProductId);
    if (!prod) {
      alert('Please select a product');
      return;
    }

    const itemTotal = itemQty * itemRate * (1 + prod.gstRate / 100);
    const newItem: PurchaseItem = {
      productId: prod.id,
      name: prod.name,
      barcode: prod.barcode,
      category: prod.category,
      hsnCode: prod.hsnCode,
      qty: itemQty,
      purchaseRate: itemRate,
      mrp: itemMrp,
      salePrice: itemSale,
      gstRate: prod.gstRate,
      total: Number(itemTotal.toFixed(2))
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setPickedProductId('');
  };

  const handleProductSelect = (id: string) => {
    setPickedProductId(id);
    const p = products.find((prod) => prod.id === id);
    if (p) {
      setItemRate(p.purchasePrice);
      setItemMrp(p.mrp);
      setItemSale(p.salePrice);
    }
  };

  const purchaseSubtotal = purchaseItems.reduce((sum, it) => sum + it.purchaseRate * it.qty, 0);
  const purchaseGrandTotal = purchaseItems.reduce((sum, it) => sum + it.total, 0);
  const purchaseTaxAmount = purchaseGrandTotal - purchaseSubtotal;
  const balanceDue = Math.max(0, purchaseGrandTotal - paidAmount);

  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if(!receivingShopId){alert('Choose the shop receiving this purchase.');return;}
    if (!selectedSupplierId) {
      alert('Please select a supplier');
      return;
    }
    if (purchaseItems.length === 0) {
      alert('Please add at least one item to this purchase invoice');
      return;
    }

    const supp = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supp) return;

    try { addPurchase({
      shopId:receivingShopId,
      supplierId: supp.id,
      supplierName: supp.name,
      supplierBillNo,
      billDate,
      items: purchaseItems,
      subtotal: purchaseSubtotal,
      taxAmount: purchaseTaxAmount,
      grandTotal: purchaseGrandTotal,
      paidAmount,
      balanceDue,
      paymentMode
    }); } catch(error) {alert(error instanceof Error?error.message:'Could not record purchase');return;}

    alert('Purchase recorded! Product inventory stocks updated.');
    setShowAddPurchaseModal(false);
    setPurchaseItems([]);
    setSupplierBillNo('');
    setPaidAmount(0);
  };

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppName.trim()) return;

    addSupplier({
      name: newSuppName.trim(),
      contactPerson: newSuppContact.trim(),
      mobile: newSuppMobile.trim(),
      gstin: newSuppGstin.trim(),
      openingBalance: 0,
      category: newSuppCategory
    });

    alert('Supplier added successfully!');
    setShowAddSupplierModal(false);
    setNewSuppName('');
    setNewSuppContact('');
    setNewSuppMobile('');
    setNewSuppGstin('');
  };

  const filteredPurchases = purchases.filter(
    (pur) =>
      pur.purchaseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pur.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pur.supplierBillNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="purchases-manager-container" className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Supplier Purchases & Inward Stock
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                PURCHASE REGISTER
              </span>
            </h1>
            <p className="text-xs text-stone-500">
              Record vendor bills and manage supplier ledgers.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddSupplierModal(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold"
          >
            + New Supplier
          </button>
          <button
            onClick={() => setShowAddPurchaseModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Record Purchase Bill
          </button>
        </div>
      </div>

      {/* Supplier Ledger Summary */}
      <div className="bg-white border border-amber-200/80 rounded-xl p-4 space-y-3 shadow-xs">
        <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
          Registered Suppliers ({suppliers.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {suppliers.map((s) => (
            <div key={s.id} className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-1 text-xs">
              <div className="font-bold text-stone-900 flex items-center justify-between">
                <span>{s.name}</span>
                <span className="text-[10px] text-amber-800 font-mono">GST: {s.gstin || 'N/A'}</span>
              </div>
              <div className="text-[11px] text-stone-600">
                Contact: {s.contactPerson} ({s.mobile})
              </div>
              <div className="text-[10px] text-stone-500">{s.category}</div>
              <div className="pt-1 flex justify-between border-t border-stone-200 text-[11px]">
                <span className="text-stone-500">Outstanding:</span>
                <span className="font-bold text-rose-600">₹{s.currentBalance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Invoices Register */}
      <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-xs space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-700 uppercase">
            Inward Purchase Bills ({purchases.length})
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search supplier or bill #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-xs rounded-lg pl-8 pr-3 py-1.5 text-stone-800 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-600 uppercase text-[10px] font-semibold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Purchase #</th>
                <th className="py-2.5 px-2">Date</th>
                <th className="py-2.5 px-2">Supplier Name</th>
                <th className="py-2.5 px-2">Vendor Bill #</th>
                <th className="py-2.5 px-2 text-center">Items Qty</th>
                <th className="py-2.5 px-2 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-2 text-right">Paid (₹)</th>
                <th className="py-2.5 px-3 text-right">Balance Due (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPurchases.map((pur) => (
                <tr key={pur.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-stone-900 font-mono">{pur.purchaseNo}<span className="block mt-1 font-sans font-normal text-xs text-stone-500">{shops.find(s=>s.id===pur.shopId)?.name || 'Unallocated'}</span></td>
                  <td className="py-3 px-2 text-stone-500">{pur.billDate}</td>
                  <td className="py-3 px-2 font-semibold text-stone-800">{pur.supplierName}</td>
                  <td className="py-3 px-2 font-mono text-stone-600">{pur.supplierBillNo}</td>
                  <td className="py-3 px-2 text-center">
                    <span className="px-2 py-0.5 rounded bg-stone-100 font-bold text-stone-700">
                      {pur.items.reduce((s, it) => s + it.qty, 0)} Units
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-bold text-stone-900">₹{pur.grandTotal}</td>
                  <td className="py-3 px-2 text-right text-emerald-600 font-medium">₹{pur.paidAmount}</td>
                  <td className="py-3 px-3 text-right font-bold text-rose-600">₹{pur.balanceDue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {showAddPurchaseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                Record Supplier Inward Purchase Bill
              </h3>
              <button onClick={() => setShowAddPurchaseModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <label className="block p-4 bg-amber-50 rounded-xl text-amber-900 font-semibold">Receiving shop
                <select required value={receivingShopId} onChange={e=>{setReceivingShopId(e.target.value);setPurchaseItems([]);setPickedProductId('');}} className="mt-2 w-full rounded-lg border border-amber-200 bg-white p-2.5"><option value="">Choose a shop</option>{shops.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
                <span className="block mt-2 font-normal">Stock increases only in this shop. Changing shops clears the selected items.</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1">Select Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800"
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1">Supplier Bill / Invoice #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LUX/2026/892"
                    value={supplierBillNo}
                    onChange={(e) => setSupplierBillNo(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 mb-1">Bill Date</label>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800"
                  />
                </div>
              </div>

              {/* Add Items Box */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
                <span className="text-xs font-bold text-amber-800 block">Add Product Line Item</span>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-stone-500 text-[10px]">Product</label>
                    <select
                      value={pickedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-800 text-xs"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.brand})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-500 text-[10px]">Qty Inward</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-800 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-500 text-[10px]">Cost Rate (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={itemRate}
                      onChange={(e) => setItemRate(Number(e.target.value))}
                      className="w-full bg-white border border-stone-200 rounded p-1.5 text-stone-800 text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItemToPurchase}
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* Items Added Table */}
                {purchaseItems.length > 0 && (
                  <table className="w-full text-left text-xs border border-stone-200">
                    <thead className="bg-stone-100 text-stone-600 text-[10px]">
                      <tr>
                        <th className="p-1.5">Item Name</th>
                        <th className="p-1.5 text-center">Qty</th>
                        <th className="p-1.5 text-right">Cost</th>
                        <th className="p-1.5 text-right">Total (Inc. GST)</th>
                        <th className="p-1.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {purchaseItems.map((it, idx) => (
                        <tr key={idx}>
                          <td className="p-1.5 font-medium text-stone-800">{it.name}</td>
                          <td className="p-1.5 text-center font-bold text-stone-900">{it.qty}</td>
                          <td className="p-1.5 text-right">₹{it.purchaseRate}</td>
                          <td className="p-1.5 text-right font-bold text-amber-800">₹{it.total}</td>
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:underline"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-3 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <span className="text-stone-500 block text-[10px]">Total Bill Amount:</span>
                  <span className="text-lg font-bold text-stone-900">₹{purchaseGrandTotal.toFixed(2)}</span>
                </div>

                <div>
                  <label className="block text-stone-500 text-[10px] mb-0.5">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    max={purchaseGrandTotal}
                    placeholder="0"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full bg-white border border-stone-200 rounded p-1 font-bold text-amber-800 text-xs"
                  />
                </div>

                <div>
                  <span className="text-stone-500 block text-[10px]">Balance Due:</span>
                  <span className="text-lg font-bold text-rose-600">₹{balanceDue.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseItems.length === 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Inward Purchase & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-600" />
                Add Optical Supplier / Distributor
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carl Zeiss Optical India"
                  value={newSuppName}
                  onChange={(e) => setNewSuppName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Sales Rep Name"
                    value={newSuppContact}
                    onChange={(e) => setNewSuppContact(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1">Mobile / Phone</label>
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={newSuppMobile}
                    onChange={(e) => setNewSuppMobile(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  placeholder="15-digit GSTIN"
                  value={newSuppGstin}
                  onChange={(e) => setNewSuppGstin(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2 text-stone-800 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="px-3 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
