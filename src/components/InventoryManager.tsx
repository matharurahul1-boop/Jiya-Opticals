import React, { useState, useRef } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Check,
  ChevronRight,
  Download,
  Edit,
  FileSpreadsheet,
  Filter,
  Package,
  Plus,
  ScanLine,
  Search,
  SlidersHorizontal,
  Store,
  Tag,
  Trash2,
  Upload
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory } from '../types';
import { catalogKey } from '../lib/catalog';

export const InventoryManager: React.FC = () => {
  const { 
    allProducts: products,
    addProduct, 
    addMultipleProducts,
    updateProduct, 
    deleteProduct, 
    adjustStock, 
    transferStock,
    currentUser,
    setSelectedProductForBarcode,
    shops,
    selectedShopFilter,
    setSelectedShopFilter,
    setActiveTab,
    isCloud,
    invoices,
    purchases
  } = useApp();

  // A shared material auto-gets a zero-stock row in every shop; a row for a shop that
  // never carried the item is not "low stock". Only rows with stock now, or with sale/
  // purchase history, count as genuine low-stock alerts.
  const carriedProductIds = new Set<string>([
    ...invoices.flatMap((i) => i.items.map((it) => it.productId)),
    ...purchases.flatMap((pur) => pur.items.map((it) => it.productId)),
  ]);
  const isLowStockRow = (p: Product) =>
    p.stockQty <= p.minStockAlert && (p.stockQty > 0 || carriedProductIds.has(p.id));

  // Material is common; this branch receives the opening quantity only.
  const defaultAllocationShop = () =>
    inventoryShopFilter !== 'all' ? inventoryShopFilter : shops[0]?.id ?? '';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [inventoryShopFilter, setInventoryShopFilter] = useState<string>(selectedShopFilter);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [newStockInput, setNewStockInput] = useState<number>(0);

  // Transfer Modal
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [transferToShopId, setTransferToShopId] = useState<string>('shop-2');
  const [transferQty, setTransferQty] = useState<number>(1);

  // Bulk Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTargetShop, setImportTargetShop] = useState<string>('all');
  const [importText, setImportText] = useState('');
  const [parsedImportItems, setParsedImportItems] = useState<Omit<Product, 'id'>[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    barcode: '',
    name: '',
    category: 'Spectacle Frame',
    brand: '',
    modelNo: '',
    color: 'Black',
    frameType: 'Full Rim',
    size: '52-18-140',
    hsnCode: '90031100',
    purchasePrice: 1000,
    mrp: 2499,
    salePrice: 1999,
    gstRate: 12,
    stockQty: 10,
    minStockAlert: 3,
    location: 'Rack A-1',
    shopId: 'all'
  });

  const categories: ProductCategory[] = [
    'Spectacle Frame',
    'Sunglasses',
    'Ophthalmic Lens',
    'Contact Lens',
    'Lens Solution',
    'Optical Accessory',
    'Reading Glasses',
    'Equipment / Battery'
  ];

  const filteredProducts = products.filter((p) => {
    const matchesShop =
      inventoryShopFilter === 'all' ||
      !p.shopId ||
      p.shopId === 'all' ||
      p.shopId === inventoryShopFilter;
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.modelNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesLowStock = !showLowStockOnly || isLowStockRow(p);

    return matchesShop && matchesCategory && matchesSearch && matchesLowStock;
  });
  const materialGroups = Array.from(new Set(filteredProducts.map(catalogKey))).map(id=>({
    id, rows:filteredProducts.filter(p=>catalogKey(p)===id),
  }));

  const totalStockCount = filteredProducts.reduce((sum, p) => sum + p.stockQty, 0);
  const totalStockValuation = filteredProducts.reduce((sum, p) => sum + p.purchasePrice * p.stockQty, 0);
  const totalRetailValuation = filteredProducts.reduce((sum, p) => sum + p.salePrice * p.stockQty, 0);
  const lowStockCount = filteredProducts.filter(isLowStockRow).length;

  const handleOpenAdd = () => {
    const randomBarcode = `890${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFormData({
      barcode: randomBarcode,
      name: '',
      category: 'Spectacle Frame',
      brand: '',
      modelNo: '',
      color: 'Black',
      frameType: 'Full Rim',
      size: '52-18-140',
      hsnCode: '90031100',
      purchasePrice: 1000,
      mrp: 2499,
      salePrice: 1999,
      gstRate: 12,
      stockQty: 10,
      minStockAlert: 3,
      location: 'Rack A-1',
      shopId: defaultAllocationShop()
    });
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      brand: p.brand,
      modelNo: p.modelNo,
      color: p.color,
      frameType: p.frameType || 'Full Rim',
      size: p.size || '',
      hsnCode: p.hsnCode,
      purchasePrice: p.purchasePrice,
      mrp: p.mrp,
      salePrice: p.salePrice,
      gstRate: p.gstRate,
      stockQty: p.stockQty,
      minStockAlert: p.minStockAlert,
      location: p.location || 'Rack 1',
      shopId: shops.some(s=>s.id===p.shopId)?p.shopId:shops[0]?.id || ''
    });
    setShowAddModal(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('Name and Barcode are required');
      return;
    }
    if (!formData.shopId || formData.shopId === 'all') {
      alert('Select the shop receiving the opening stock. Material details are shared across all shops.');
      return;
    }

    try {
      if (editingProduct) {
        updateProduct({
          ...editingProduct,
          ...formData,
          id: editingProduct.id
        });
      } else {
        addProduct(formData);
      }
      setShowAddModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save this item. Please try again.');
    }
  };

  const handleOpenStockAdjust = (p: Product) => {
    setAdjustingProduct(p);
    setNewStockInput(p.stockQty);
  };

  const handleSaveStockAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try { adjustStock(adjustingProduct.id, newStockInput); setAdjustingProduct(null); }
    catch(error) { alert(error instanceof Error?error.message:'Could not adjust stock'); }
  };

  // Stock Transfer between Shops
  const handleOpenTransfer = (p: Product) => {
    setTransferProduct(p);
    const otherShop = shops.find((s) => s.id !== (p.shopId || 'shop-1')) || shops[1] || shops[0];
    setTransferToShopId(otherShop?.id || 'shop-2');
    setTransferQty(1);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProduct) return;
    if (transferQty > transferProduct.stockQty) {
      alert(`Transfer quantity (${transferQty}) cannot exceed current stock (${transferProduct.stockQty})`);
      return;
    }

    try { transferStock(transferProduct.id,transferToShopId,transferQty); }
    catch(error) { alert(error instanceof Error?error.message:'Could not transfer stock');return; }

    const destShopName = shops.find((s) => s.id === transferToShopId)?.name || transferToShopId;
    alert(`Successfully transferred ${transferQty} unit(s) of "${transferProduct.name}" to ${destShopName}!`);
    setTransferProduct(null);
  };

  // CSV Import Parsing
  const parseCSVText = (csvString: string) => {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const items: Omit<Product, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Handle commas inside quotes or simple split
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 2) continue;

      const name = cols[0] || `Imported Item ${i}`;
      const category = (categories.find((c) => c.toLowerCase() === (cols[1] || '').toLowerCase()) || 'Spectacle Frame') as ProductCategory;
      const brand = cols[2] || '';
      const modelNo = cols[3] || '';
      const color = cols[4] || 'Standard';
      const frameType = cols[5] || 'Full Rim';
      const size = cols[6] || '';
      const hsnCode = cols[7] || '90031100';
      const purchasePrice = parseFloat(cols[8]) || 500;
      const mrp = parseFloat(cols[9]) || purchasePrice * 2;
      const salePrice = parseFloat(cols[10]) || mrp * 0.9;
      const gstRate = parseInt(cols[11], 10) || 12;
      const stockQty = parseInt(cols[12], 10) || 10;
      const minStockAlert = parseInt(cols[13], 10) || 3;
      const location = cols[14] || 'Rack 1';
      const barcode = cols[15] && cols[15].length > 4 ? cols[15] : `890${Math.floor(100000000 + Math.random() * 900000000)}`;

      items.push({
        barcode,
        name,
        category,
        brand,
        modelNo,
        color,
        frameType: frameType as any,
        size,
        hsnCode,
        purchasePrice,
        mrp,
        salePrice,
        gstRate,
        stockQty,
        minStockAlert,
        location,
        shopId: importTargetShop
      });
    }

    setParsedImportItems(items);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      parseCSVText(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCSV = () => {
    const csvContent =
      'Name,Category,Brand,ModelNo,Color,FrameType,Size,HSNCode,PurchasePrice,MRP,SalePrice,GSTRate,StockQty,MinStockAlert,Location,Barcode\n' +
      'Ray-Ban Aviator Classic Green,Spectacle Frame,Ray-Ban,RB-3025,Gold / Green,Full Rim,58-14-135,90031100,3200,6590,5900,12,10,3,Rack A-1,890123450099\n' +
      'Essilor Crizal Sapphire 1.60 Blue,Ophthalmic Lens,Essilor,Sapphire-1.60,Clear Blue,N/A,70mm,90015000,1400,3800,3200,12,20,5,Lens Box 2,890123450098\n' +
      'Acuvue Moist Daily Contact Lenses 30pk,Contact Lens,Johnson & Johnson,Moist-30,Clear Tint,N/A,8.5 BC,90013000,1200,2400,2100,12,15,4,CL Cabinet,890123450097\n' +
      'Fastrack Square Acetate Glossy,Spectacle Frame,Fastrack,FT-2210,Matte Grey,Full Rim,53-17-140,90031100,650,1699,1499,12,12,4,Rack B-2,890123450096';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Jiya_Opticals_Material_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteBulkImport = () => {
    if (parsedImportItems.length === 0) {
      alert('No valid items found to import.');
      return;
    }

    const target = importTargetShop === 'all' ? shops[0]?.id ?? '' : importTargetShop;
    if (!target || target === 'all') {
      alert('Select the shop receiving the imported stock. Material details will be available in all shops.');
      return;
    }

    const itemsToSave = parsedImportItems.map((p) => ({
      ...p,
      shopId: target
    }));

    try { addMultipleProducts(itemsToSave); }
    catch(error) {alert(error instanceof Error?error.message:'Could not import materials.');return;}
    setImportSuccessMsg(`Successfully imported ${itemsToSave.length} material(s) into inventory!`);
    setTimeout(() => {
      setShowImportModal(false);
      setImportSuccessMsg('');
      setParsedImportItems([]);
      setImportText('');
    }, 1500);
  };

  const handleExportInventoryCSV = () => {
    if (filteredProducts.length === 0) {
      alert('No products to export.');
      return;
    }

    let csv = 'Barcode,Name,Category,Brand,ModelNo,Color,FrameType,Size,HSNCode,PurchasePrice,MRP,SalePrice,GSTRate,StockQty,MinStockAlert,Location,ShopBranch\n';
    filteredProducts.forEach((p) => {
      const shopName = shops.find((s) => s.id === p.shopId)?.name || 'All Branches';
      csv += `"${p.barcode}","${p.name.replace(/"/g, '""')}","${p.category}","${p.brand}","${p.modelNo}","${p.color}","${p.frameType || ''}","${p.size || ''}","${p.hsnCode}",${p.purchasePrice},${p.mrp},${p.salePrice},${p.gstRate},${p.stockQty},${p.minStockAlert},"${p.location || ''}","${shopName}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Jiya_Opticals_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <button
        onClick={() => setActiveTab('drishti')}
        className="w-full flex items-center justify-between gap-3 bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 transition-colors p-3.5 rounded-xl shadow-xs text-left cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
            <ScanLine className="w-4.5 h-4.5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-stone-900">Drishti Desktop Sync</span>
            <span className="block text-xs text-stone-500">Import items & QR codes from the Drishti software · open setup</span>
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-stone-400" />
      </button>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              Item Master & Material Inventory
            </h1>
            <p className="text-xs text-stone-500">
              One material catalogue. Separate stock, purchases and sales for each shop.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowImportModal(true)}
            disabled={currentUser.role!=='Admin'}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-300 cursor-pointer shadow-xs"
            title="Import materials via CSV / Excel"
          >
            <Upload className="w-3.5 h-3.5 text-amber-700" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportInventoryCSV}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-300 cursor-pointer shadow-xs"
            title="Export full inventory to Excel/CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            disabled={currentUser.role!=='Admin'}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Material
          </button>
        </div>
      </div>

      {/* Multi-Shop Branch Filter Bar */}
      <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-amber-800 shrink-0" />
          <span className="font-bold text-stone-800">Branch Stock View:</span>
          <select
            value={inventoryShopFilter}
            onChange={(e) => setInventoryShopFilter(e.target.value)}
            className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 font-bold text-stone-900 outline-none focus:border-amber-600"
          >
            <option value="all">🏢 All Shops & Warehouses (Consolidated)</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                📍 {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-stone-600">
          Showing <span className="font-bold text-stone-900">{materialGroups.length}</span> materials in{' '}
          <span className="font-bold text-amber-800">
            {inventoryShopFilter === 'all'
              ? 'All Branches'
              : shops.find((s) => s.id === inventoryShopFilter)?.name}
          </span>
        </div>
      </div>

      {/* Stock Valuation Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">Unique SKUs</span>
          <div className="text-xl font-bold text-stone-900 mt-1">{materialGroups.length} Materials</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">Physical Stock</span>
          <div className="text-xl font-bold text-amber-800 mt-1">{totalStockCount} Units</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">Cost Valuation</span>
          <div className="text-xl font-bold text-stone-800 mt-1">₹{totalStockValuation.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">Retail Value</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">₹{totalRetailValuation.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-amber-200/80 p-3.5 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCategory === 'All'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All ({materialGroups.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {cat.replace('Spectacle ', '').replace('Ophthalmic ', '')}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              showLowStockOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock ({lowStockCount})
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, brand, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 bg-stone-50 border border-stone-300 text-xs rounded-lg pl-8 pr-3 py-1.5 text-stone-900 outline-none focus:border-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-amber-200/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100 text-stone-700 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">Material / Item Details</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-2">Barcode</th>
                <th className="py-2.5 px-2">Shop Branch</th>
                <th className="py-2.5 px-2 text-right">Cost (₹)</th>
                <th className="py-2.5 px-2 text-right">Sale (₹)</th>
                <th className="py-2.5 px-2 text-center">GST</th>
                <th className="py-2.5 px-2 text-center">Stock</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {materialGroups.map(({id,rows}) => {
                const p=rows[0],total=rows.reduce((sum,row)=>sum+row.stockQty,0);
                return <tr key={id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-5 px-4"><div className="font-semibold text-stone-900 text-sm">{p.name}</div><div className="text-xs text-stone-500 mt-1">{p.brand} · {p.modelNo} · {p.color}</div></td>
                  <td className="px-2 text-xs text-stone-500">{p.category}</td>
                  <td className="px-2 font-mono text-xs">{p.barcode}</td>
                  <td className="px-2 py-3"><div className="space-y-2">{rows.map(row=><div key={row.id} className="flex items-center gap-2">
                    <button onClick={()=>handleOpenStockAdjust(row)} className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 hover:border-amber-400" title="Adjust this shop's stock">
                      <span className="text-xs whitespace-nowrap">{(shops.find(s=>s.id===row.shopId)?.name || 'Unallocated').split(' - ')[0]}</span><strong className={isLowStockRow(row)?'text-rose-600':row.stockQty===0?'text-stone-400':'text-emerald-700'}>{row.stockQty}</strong>
                    </button>
                    <button disabled={shops.length<2} onClick={()=>handleOpenTransfer(row)} className="p-2 text-stone-500 hover:text-amber-700 disabled:opacity-30" title="Transfer from this shop"><ArrowLeftRight className="w-4 h-4"/></button>
                  </div>)}</div></td>
                  <td className="px-2 text-right text-stone-500">{rows.every(r=>r.purchasePrice===p.purchasePrice)?'₹'+p.purchasePrice:'Shop-wise'}</td>
                  <td className="px-2 text-right font-semibold">{rows.every(r=>r.salePrice===p.salePrice)?'₹'+p.salePrice:'Varies'}</td>
                  <td className="px-2 text-center">{p.gstRate}%</td>
                  <td className="px-2 text-center"><span className="text-base font-bold text-stone-900">{total}</span><span className="block text-[10px] text-stone-400">TOTAL UNITS</span></td>
                  <td className="px-3 text-right whitespace-nowrap">
                    <button onClick={()=>setSelectedProductForBarcode(p)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title="Print material code"><Tag className="w-4 h-4"/></button>
                    {currentUser.role==='Admin' && <><button onClick={()=>handleOpenEdit(p)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title="Edit shared material"><Edit className="w-4 h-4"/></button><button onClick={()=>{if(confirm('Delete '+p.name+' from the shared catalogue?'))deleteProduct(p.id);}} className="p-2 text-stone-400 hover:text-rose-600 rounded-lg" title="Delete material"><Trash2 className="w-4 h-4"/></button></>}
                  </td>
                </tr>;
              })}
              {materialGroups.length===0 && <tr><td colSpan={9} className="p-12 text-center text-stone-500">No materials yet. Create a material once to make it available in every shop.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                {editingProduct ? 'Edit Master Material' : 'Create New Material / Item'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer text-base">✕</button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs"><p className="bg-amber-50 text-amber-800 rounded-xl p-3 leading-relaxed">Material details and selling price are shared across shops. Opening quantity, cost and rack belong to the selected shop.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Opening stock shop *</label>
                  <select
                    disabled={!!editingProduct && shops.some(s=>s.id===editingProduct.shopId)} value={formData.shopId || shops[0]?.id || ''}
                    onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                    className="w-full bg-amber-50/60 border border-amber-300 rounded-lg p-2 text-stone-900 font-medium"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        📍 {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Barcode / SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">Material / Product Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ray-Ban Aviator Classic Green G-15"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Brand / Manufacturer</label>
                  <input
                    type="text"
                    placeholder="Ray-Ban, Titan, Zeiss..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Model / Article No.</label>
                  <input
                    type="text"
                    placeholder="RB-3025 / 1.56 HMC"
                    value={formData.modelNo}
                    onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Color / Shade</label>
                  <input
                    type="text"
                    placeholder="Matte Black / Clear"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Frame Type</label>
                  <select
                    value={formData.frameType}
                    onChange={(e) => setFormData({ ...formData, frameType: e.target.value as any })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    <option value="Full Rim">Full Rim</option>
                    <option value="Half Rim">Half Rim (Supra)</option>
                    <option value="Rimless">Rimless</option>
                    <option value="N/A">N/A (Lens / Accessory)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Size Specs / Base Curve</label>
                  <input
                    type="text"
                    placeholder="52-18-140 / 8.5 BC"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Purchase Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">MRP (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Sale Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-emerald-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">GST %</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12% (Frames & Lenses)</option>
                    <option value={18}>18% (Sunglasses & Care)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Initial Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Low Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">Rack / Shelf Location</label>
                  <input
                    type="text"
                    placeholder="Rack A-1, Drawer 3"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Create Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Between Shops Modal */}
      {transferProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-700" />
                Inter-Branch Stock Transfer
              </h4>
              <button onClick={() => setTransferProduct(null)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg text-xs border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900">{transferProduct.name}</div>
              <div className="text-[11px] text-stone-500">
                Current Location: <span className="font-bold text-stone-800">{shops.find(s => s.id === transferProduct.shopId)?.name || 'All Branches'}</span> • Current Stock: <span className="font-bold text-amber-800">{transferProduct.stockQty} units</span>
              </div>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Destination Branch *</label>
                <select
                  value={transferToShopId}
                  onChange={(e) => setTransferToShopId(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2.5 text-stone-900 font-medium"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name} ({s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Quantity to Transfer (Max {transferProduct.stockQty})</label>
                <input
                  type="number"
                  min="1"
                  max={transferProduct.stockQty}
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 font-bold text-amber-800 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setTransferProduct(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  Transfer Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                Bulk Material Import (CSV / Excel)
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            {importSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                {importSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Step 1: Download Sample */}
                <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-stone-900">Step 1: Download Sample Excel / CSV Template</div>
                    <div className="text-[11px] text-stone-500">
                      Use our formatted template with columns for Frames, Rx Lenses, Contact Lenses, and Solutions.
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadSampleCSV}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample CSV
                  </button>
                </div>

                {/* Step 2: Choose Target Branch */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Step 2: Assign Imported Stock to Shop Branch:
                  </label>
                  <select
                    value={importTargetShop === 'all' ? shops[0]?.id ?? '' : importTargetShop}
                    onChange={(e) => setImportTargetShop(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900 font-medium"
                  >
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        📍 {s.name} ({s.city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Upload File or Paste */}
                <div className="space-y-2">
                  <label className="block text-stone-700 font-semibold">
                    Step 3: Upload CSV File or Paste Data Below:
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".csv,text/csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-800 font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-stone-600" />
                      Browse CSV File
                    </button>
                    <span className="text-[11px] text-stone-500">or paste CSV text directly in the box:</span>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="Name,Category,Brand,ModelNo,Color,FrameType,Size,HSNCode,PurchasePrice,MRP,SalePrice,GSTRate,StockQty,MinStockAlert,Location,Barcode&#10;Ray-Ban Aviator,Spectacle Frame,Ray-Ban,RB-3025,Gold,Full Rim,58-14-135,90031100,3200,6590,5900,12,10,3,Rack A-1,890123450099"
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      parseCSVText(e.target.value);
                    }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 font-mono text-[11px] text-stone-800 outline-none focus:border-amber-600"
                  />
                </div>

                {/* Parsed Items Preview */}
                {parsedImportItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">
                        Parsed Materials Preview ({parsedImportItems.length} items found)
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold">Ready to Import</span>
                    </div>

                    <div className="border border-stone-200 rounded-lg max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-stone-100 text-stone-600 font-bold sticky top-0">
                          <tr>
                            <th className="p-2">Name</th>
                            <th className="p-2">Category</th>
                            <th className="p-2">Brand</th>
                            <th className="p-2 text-right">Cost</th>
                            <th className="p-2 text-right">Sale</th>
                            <th className="p-2 text-center">Stock</th>
                            <th className="p-2">Barcode</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                          {parsedImportItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-stone-50">
                              <td className="p-2 font-medium text-stone-900">{item.name}</td>
                              <td className="p-2 text-stone-600">{item.category}</td>
                              <td className="p-2 text-stone-600">{item.brand}</td>
                              <td className="p-2 text-right text-stone-600">₹{item.purchasePrice}</td>
                              <td className="p-2 text-right font-bold text-stone-900">₹{item.salePrice}</td>
                              <td className="p-2 text-center font-bold text-amber-800">{item.stockQty}</td>
                              <td className="p-2 font-mono text-[10px] text-stone-500">{item.barcode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-3 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={parsedImportItems.length === 0}
                    onClick={handleExecuteBulkImport}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Import {parsedImportItems.length} Material(s)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-stone-200 rounded-xl p-5 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="text-xs font-bold text-stone-900">Adjust Physical Stock Quantity</h4>
              <button onClick={() => setAdjustingProduct(null)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <div className="text-xs text-stone-700">
              <div className="font-bold text-stone-900">{adjustingProduct.name}</div>
              <div className="text-[11px] text-stone-500 font-mono">Barcode: {adjustingProduct.barcode}</div>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">New Physical Stock Count (Units)</label>
                <input
                  type="number"
                  min="0"
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-center text-lg font-bold text-amber-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs cursor-pointer"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
