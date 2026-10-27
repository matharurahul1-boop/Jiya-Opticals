import { t } from '../lib/i18n';
import { NumberInput } from './NumberInput';
import React, { useEffect, useState, useRef } from 'react';
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
import { findScannedProduct, scannedUnitCode } from '../lib/barcodes';
import { PRODUCT_CATEGORIES, SUGGESTED_CONTACT_LENS_BRANDS, SUGGESTED_EYEWEAR_BRANDS, defaultHsn, DEFAULT_HSN } from '../lib/gst';
import { isPlaceholderSku, skuPrefix, suggestSku } from '../lib/sku';
import { Row, useAsk } from './ConfirmDialog';
import { COATINGS, INDEXES, LENS_COMPANIES, LENS_TYPES, isLensCategory, lensVariantKey } from '../lib/lens';

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
    setTagDisabled,
    shops,
    selectedShopFilter,
    setSelectedShopFilter,
    setActiveTab,
    isCloud,
    invoices,
    purchases,
    openCameraScanner,
    storeProfile
  } = useApp();

  // Scan a piece tag (scanner, camera or typed code) to see which material it is.
  const [scanInput, setScanInput] = useState('');
  const [scanMsg, setScanMsg] = useState('');
  const [scanned, setScanned] = useState<{ product: Product; unit?: string } | null>(null);
  const [scanMiss, setScanMiss] = useState('');
  const [ask, askDialog] = useAsk();
  // More colour codes of the same model, each with its own barcode and opening stock.
  // Frames etc.: colour codes. Contact lenses: the same product with another MRP / expiry (code unused).
  const [extraColors, setExtraColors] = useState<{ code: string; qty: number; mrp: number; sale: number; expiry: string; index: string }[]>([]);
  // While true the SKU is generated from category, brand, model and colour; typing in the field switches it off.
  const [skuAuto, setSkuAuto] = useState(true);
  const lookupCode = (raw: string) => {
    const found = findScannedProduct(products, raw);
    if (!found) { setScanMsg(`No material found for code "${raw.trim()}".`); setScanMiss(raw.trim()); setScanned(null); return; }
    setScanMsg(''); setScanMiss('');
    setScanned({ product: found, unit: scannedUnitCode(products, raw) });
  };

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
  const [showAddFrameType, setShowAddFrameType] = useState(false);
  const [newFrameType, setNewFrameType] = useState('');
  const [addedFrameTypes, setAddedFrameTypes] = useState<string[]>([]);
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
    category: 'Frames',
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

  const categories: ProductCategory[] = PRODUCT_CATEGORIES;

  useEffect(() => {
    if (!showAddModal || editingProduct || !skuAuto) return;
    const next = suggestSku({ prefix: skuPrefix(storeProfile.name), category: formData.category, brand: formData.brand, modelNo: formData.modelNo, name: formData.name, color: isLensCategory(formData.category) ? lensVariantKey(formData.lensIndex || '', formData.coating || '') : formData.color, mrp: formData.mrp }, products.map((p) => p.barcode));
    setFormData((f) => (f.barcode === next ? f : { ...f, barcode: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddModal, editingProduct, skuAuto, formData.category, formData.brand, formData.modelNo, formData.name, formData.color, formData.mrp, formData.lensIndex, formData.coating]);

  // Older materials saved with a numeric placeholder (890xxxxxxxxx) can be re-coded to the common SKU style.
  // Anything with printed tags or tagged sales keeps its code, because the stickers already carry it.
  const placeholderCatalogs = (() => {
    const byCatalog = new Map<string, Product[]>();
    for (const p of products) byCatalog.set(catalogKey(p), [...(byCatalog.get(catalogKey(p)) || []), p]);
    return Array.from(byCatalog.values()).filter((rows) => isPlaceholderSku(rows[0].barcode) && rows.every((r) => (r.nextSerial || 1) <= 1 && !(r.soldUnitCodes?.length) && !(r.disabledUnitCodes?.length)));
  })();
  // Deleting a material: say clearly what will happen, instead of a bare browser popup.
  const handleDeleteMaterial = async (p: Product) => {
    const rows = products.filter((r) => catalogKey(r) === catalogKey(p));
    const ids = new Set(rows.map((r) => r.id));
    const onBills = [...invoices, ...purchases].some((doc) => doc.items.some((i) => ids.has(i.productId)));
    const stock = rows.filter((r) => r.stockQty > 0).map((r) => ({ shop: (shops.find((s) => s.id === r.shopId)?.name || 'Shop').split(' - ')[0], qty: r.stockQty }));
    const total = stock.reduce((sum, x) => sum + x.qty, 0);
    const summary = (
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-1.5">
        <Row label="Item" value={p.name} strong />
        {(p.brand || p.modelNo) && <Row label="Brand / model" value={[p.brand, p.modelNo].filter(Boolean).join(' · ')} />}
        <Row label="Barcode" value={<span className="font-mono text-xs">{p.barcode}</span>} />
      </div>
    );
    if (onBills) {
      await ask({
        title: 'This item cannot be deleted',
        notice: true,
        body: (
          <>
            {summary}
            <p>It is on saved bills or purchases, and those records point to it. To stop using it, set its stock to <strong>0</strong> (tap the quantity in the shop box). It will stay in the list for your records.</p>
          </>
        ),
      });
      return;
    }
    const ok = await ask({
      title: total > 0 ? 'Delete this item with its stock?' : 'Delete this item?',
      danger: true,
      confirmLabel: total > 0 ? 'Delete with stock' : 'Delete item',
      body: (
        <>
          {summary}
          {total > 0 ? (
            <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-800 p-3 space-y-1">
              <p className="font-semibold">This item still has {total} unit{total === 1 ? '' : 's'} in stock. They will be removed too:</p>
              {stock.map((x) => <p key={x.shop} className="flex justify-between"><span>{x.shop}</span><strong>{x.qty}</strong></p>)}
            </div>
          ) : (
            <p>It will be removed from every shop.</p>
          )}
          <p className="text-stone-500">This cannot be undone.</p>
        </>
      ),
    });
    if (!ok) return;
    try { deleteProduct(p.id, { withStock: total > 0 }); }
    catch (e) { await ask({ title: 'Could not delete this item', notice: true, body: <p>{e instanceof Error ? e.message : 'Please try again.'}</p> }); }
  };

  const handleStandardiseSkus = async () => {
    if (!placeholderCatalogs.length) return;
    const go = await ask({
      title: 'Make SKU codes consistent?',
      confirmLabel: 'Re-code',
      body: (
        <>
          <p>{placeholderCatalogs.length} material{placeholderCatalogs.length === 1 ? '' : 's'} will get a code in the common style, for example <span className="font-mono text-xs">JIYA-FRAMES-ARMANI-2232-C1</span>.</p>
          <p>Only items whose tags have not been printed are changed. If you already stuck old codes on stock, skip this.</p>
        </>
      ),
    });
    if (!go) return;
    const taken = new Set(products.map((p) => p.barcode));
    const prefix = skuPrefix(storeProfile.name);
    try {
      for (const rows of placeholderCatalogs) {
        const p = rows[0];
        const barcode = suggestSku({ prefix, category: p.category, brand: p.brand, modelNo: p.modelNo, name: p.name, color: p.color, mrp: p.mrp }, taken);
        taken.add(barcode);
        updateProduct({ ...p, barcode });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not re-code the materials.');
    }
  };

  const handleCategoryChange = (category: ProductCategory) => {
    setFormData((f) => {
      const hsnWasDefault = !f.hsnCode.trim() || f.hsnCode === DEFAULT_HSN[f.category];
      return {
        ...f,
        category,
        hsnCode: hsnWasDefault ? defaultHsn(category) : f.hsnCode,
        ...(category === 'Contact Lens' || isLensCategory(category) ? { frameType: 'N/A', size: '', ...(isLensCategory(category) ? { color: '' } : {}) } : (f.category === 'Contact Lens' || isLensCategory(f.category)) ? { frameType: 'Full Rim', size: '52-18-140' } : {})
      };
    });
  };
  const frameTypes = ['Full Rim', 'Half Rim', 'Rimless', 'N/A', ...products.map(p => p.frameType), ...addedFrameTypes, formData.frameType]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.findIndex(other => other.toLowerCase() === value.toLowerCase()) === index)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));

  const handleAddFrameType = () => {
    const name = newFrameType.trim().replace(/\s+/g, ' ');
    if (!name) return;
    const value = frameTypes.find(type => type.toLowerCase() === name.toLowerCase()) || name;
    setAddedFrameTypes(previous => previous.includes(value) ? previous : [...previous, value]);
    setFormData(previous => ({ ...previous, frameType: value }));
    setNewFrameType('');
    setShowAddFrameType(false);
  };

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
      (p.color || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesLowStock = !showLowStockOnly || isLowStockRow(p);

    return matchesShop && matchesCategory && matchesSearch && matchesLowStock;
  }).sort((a, b) => a.name.trim().localeCompare(b.name.trim(), 'en', { sensitivity: 'base', numeric: true }));
  const materialGroups = Array.from(new Set(filteredProducts.map(catalogKey))).map(id=>({
    id, rows:filteredProducts.filter(p=>catalogKey(p)===id),
  }));

  // Brand → model number → colour codes: materials of one model sit together under a model heading.
  const modelGroups = (() => {
    const order: string[] = [];
    const map = new Map<string, { key: string; category: string; brand: string; modelNo: string; materials: typeof materialGroups }>();
    for (const m of materialGroups) {
      const p = m.rows[0];
      const label = (p.modelNo || '').trim() || (p.category === 'Contact Lens' || isLensCategory(p.category) ? (p.name || '').trim() : '');
      const key = label ? [p.category, p.brand, label].map((x) => (x || '').trim().toLowerCase()).join('|') : 'single:' + m.id;
      if (!map.has(key)) { map.set(key, { key, category: p.category, brand: p.brand, modelNo: label, materials: [] }); order.push(key); }
      map.get(key)!.materials.push(m);
    }
    return order.map((k) => map.get(k)!);
  })();

  const totalStockCount = filteredProducts.reduce((sum, p) => sum + p.stockQty, 0);
  const totalStockValuation = filteredProducts.reduce((sum, p) => sum + p.purchasePrice * p.stockQty, 0);
  const totalRetailValuation = filteredProducts.reduce((sum, p) => sum + p.salePrice * p.stockQty, 0);
  const lowStockCount = filteredProducts.filter(isLowStockRow).length;

  const handleOpenAdd = () => {
    setShowAddFrameType(false);
    setNewFrameType('');
    setSkuAuto(true);
    setFormData({
      barcode: '',
      name: '',
      category: 'Frames',
      brand: '',
      modelNo: '',
      color: 'Black',
      frameType: 'Full Rim',
      size: '52-18-140',
      hsnCode: defaultHsn('Frames'),
      purchasePrice: 0,
      mrp: 0,
      salePrice: 0,
      gstRate: 12,
      stockQty: 0,
      minStockAlert: 0,
      location: 'Rack A-1',
      shopId: defaultAllocationShop()
    });
    setEditingProduct(null);
    setExtraColors([]);
    setShowAddModal(true);
  };

  // Another colour of an existing model: same brand, model and prices, new barcode, empty colour and stock.
  const handleOpenAddColour = (p: Product) => {
    setShowAddFrameType(false);
    setNewFrameType('');
    setSkuAuto(true);
    setFormData({
      barcode: '',
      baseCurve: p.baseCurve, diameter: p.diameter, packSize: p.packSize,
      lensType: p.lensType, lensIndex: p.lensIndex, coating: p.coating, powerRange: p.powerRange,
      name: p.name,
      category: p.category,
      brand: p.brand,
      modelNo: p.modelNo,
      color: '',
      frameType: p.frameType || 'Full Rim',
      size: p.size || '',
      hsnCode: p.hsnCode?.trim() || defaultHsn(p.category),
      purchasePrice: p.purchasePrice,
      mrp: p.category === 'Contact Lens' ? 0 : p.mrp,
      salePrice: p.salePrice,
      gstRate: p.gstRate,
      stockQty: 0,
      minStockAlert: p.minStockAlert,
      location: p.location || 'Rack A-1',
      shopId: defaultAllocationShop()
    });
    setEditingProduct(null);
    setExtraColors([]);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setShowAddFrameType(false);
    setNewFrameType('');
    setEditingProduct(p);
    setExtraColors([]);
    setSkuAuto(false);
    setFormData({
      barcode: p.barcode,
      baseCurve: p.baseCurve, diameter: p.diameter, packSize: p.packSize, expiry: p.expiry, batchNo: p.batchNo,
      lensType: p.lensType, lensIndex: p.lensIndex, coating: p.coating, powerRange: p.powerRange,
      name: p.name,
      category: p.category,
      brand: p.brand,
      modelNo: p.modelNo,
      color: p.color,
      frameType: p.frameType || 'Full Rim',
      size: p.size || '',
      hsnCode: p.hsnCode?.trim() || defaultHsn(p.category),
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
    if (!Number.isFinite(formData.salePrice) || formData.salePrice < 0) {
      alert(t('Sale price must be zero or greater.'));
      return;
    }

    const buildVariants = () => {
      const taken = new Set(products.map((p) => p.barcode));
      taken.add(formData.barcode);
      const prefix = skuPrefix(storeProfile.name);
      const lensVariants = isLensCategory(formData.category)
        ? extraColors.filter((x) => x.index.trim() || x.code.trim()).map((x) => ({ index: x.index.trim() || formData.lensIndex || '', coating: x.code.trim() || formData.coating || '', mrp: x.mrp > 0 ? x.mrp : formData.mrp, sale: x.sale > 0 ? x.sale : formData.salePrice, qty: x.qty }))
        : [];
      if (isLensCategory(formData.category)) {
        return lensVariants.map((r) => {
          const barcode = suggestSku({ prefix, category: formData.category, brand: formData.brand, modelNo: formData.modelNo, name: formData.name, color: lensVariantKey(r.index, r.coating), mrp: r.mrp }, taken);
          taken.add(barcode);
          return { ...formData, lensIndex: r.index, coating: r.coating, mrp: r.mrp, salePrice: r.sale, stockQty: Math.max(0, Math.floor(Number(r.qty) || 0)), barcode, hsnCode: formData.hsnCode.trim() || defaultHsn(formData.category) };
        });
      }
      const rows = formData.category === 'Contact Lens'
        ? extraColors.filter((x) => x.mrp > 0 || x.expiry).map((x) => ({ color: formData.color, mrp: x.mrp > 0 ? x.mrp : 0, sale: x.sale > 0 ? x.sale : formData.salePrice === formData.mrp ? (x.mrp > 0 ? x.mrp : 0) : formData.salePrice, expiry: x.expiry || undefined, qty: x.qty }))
        : extraColors.filter((x) => x.code.trim() && x.code.trim().toLowerCase() !== (formData.color || '').trim().toLowerCase()).map((x) => ({ color: x.code.trim(), mrp: formData.mrp, sale: formData.salePrice, expiry: formData.expiry, qty: x.qty }));
      return rows.map((r) => {
        const barcode = suggestSku({ prefix, category: formData.category, brand: formData.brand, modelNo: formData.modelNo, name: formData.name, color: r.color, mrp: r.mrp }, taken);
        taken.add(barcode);
        return { ...formData, color: r.color, mrp: r.mrp, salePrice: r.sale, expiry: r.expiry, stockQty: Math.max(0, Math.floor(Number(r.qty) || 0)), barcode, hsnCode: formData.hsnCode.trim() || defaultHsn(formData.category) };
      });
    };

    try {
      if (editingProduct) {
        updateProduct({
          ...editingProduct,
          ...formData,
          id: editingProduct.id
        });
        const more = buildVariants();
        if (more.length) addMultipleProducts(more);
      } else {
        const created = addProduct(formData);
        const more = buildVariants();
        if (more.length) addMultipleProducts(more);
        // Offer the QR tag labels right away; scanning a tag adds this item to a bill.
        if (!isLensCategory(created.category)) setSelectedProductForBarcode(created);
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
      const category = (categories.find((c) => c.toLowerCase() === (cols[1] || '').toLowerCase()) || 'Frames') as ProductCategory;
      const brand = cols[2] || '';
      const modelNo = cols[3] || '';
      const color = cols[4] || 'Standard';
      const frameType = cols[5] || 'Full Rim';
      const size = cols[6] || '';
      const hsnCode = cols[7] || '90031100';
      const purchasePrice = Number(cols[8] || 0);
      const mrp = Number(cols[9] || 0);
      const salePrice = Number(cols[10] || 0);
      const gstRate = Number(cols[11] || 0);
      const stockQty = Number(cols[12] || 0);
      const minStockAlert = Number(cols[13] || 0);
      if([purchasePrice,mrp,salePrice,gstRate,stockQty,minStockAlert].some(v=>!Number.isFinite(v)||v<0)||!Number.isInteger(stockQty)||!Number.isInteger(minStockAlert)){alert('Invalid numeric value in CSV row '+(i+1));setParsedImportItems([]);return;}
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
      'Ray-Ban Aviator Classic Green,Frames,Ray-Ban,RB-3025,Gold / Green,Full Rim,58-14-135,90031100,3200,6590,5900,12,10,3,Rack A-1,890123450099\n' +
      'Essilor Crizal Sapphire 1.60 Blue,Eyewear Lens,Essilor,Sapphire-1.60,Clear Blue,N/A,70mm,90015000,1400,3800,3200,12,20,5,Lens Box 2,890123450098\n' +
      'Acuvue Moist Daily Contact Lenses 30pk,Contact Lens,Johnson & Johnson,Moist-30,Clear Tint,N/A,8.5 BC,90013000,1200,2400,2100,12,15,4,CL Cabinet,890123450097\n' +
      'Fastrack Square Acetate Glossy,Frames,Fastrack,FT-2210,Matte Grey,Full Rim,53-17-140,90031100,650,1699,1499,12,12,4,Rack B-2,890123450096';

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
      {/* Drishti Desktop Sync entry disabled for now: items get the app's own QR tags
          (Create Material -> Print Tag), and scanning a tag adds the item to a bill.
      <button
        onClick={() => setActiveTab('drishti')}
        className="w-full flex items-center justify-between gap-3 bg-white border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 transition-colors p-3.5 rounded-xl shadow-xs text-left cursor-pointer"
      >
        <span className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
            <ScanLine className="w-4.5 h-4.5" />
          </span>
          <span>
            <span className="block text-sm font-bold text-stone-900">{t("Drishti Desktop Sync")}</span>
            <span className="block text-xs text-stone-500">{t("Import items & QR codes from the Drishti software · open setup")}</span>
          </span>
        </span>
        <ChevronRight className="w-4 h-4 text-stone-400" />
      </button>
      */}
      <div className="flex gap-2 items-center bg-white border border-stone-200 rounded-xl p-2.5 shadow-xs">
        <form className="flex-1 flex gap-2 min-w-0" onSubmit={(e) => { e.preventDefault(); if (scanInput.trim()) { lookupCode(scanInput); setScanInput(''); } }}>
          <div className="relative flex-1 min-w-0">
            <ScanLine className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={scanInput} onChange={(e) => setScanInput(e.target.value)} placeholder={t("Scan item tag or type its code to see details…")} className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg font-mono" />
          </div>
          <button className="px-3 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg">{t("Find")}</button>
        </form>
        <button type="button" onClick={() => openCameraScanner(lookupCode)} className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5"><ScanLine className="w-4 h-4" />{t("Camera")}</button>
      </div>
      {scanMsg && (() => {
        // Show valid codes: materials that resemble what was typed, otherwise the first few in the catalogue.
        const words = scanMiss.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
        const seen = new Set<string>();
        const unique = products.filter((p) => p.barcode && !seen.has(catalogKey(p)) && !!seen.add(catalogKey(p)));
        const similar = unique.filter((p) => words.some((w) => (p.barcode + ' ' + p.name + ' ' + p.brand + ' ' + p.modelNo).toLowerCase().includes(w)));
        const list = (similar.length ? similar : unique).slice(0, 8);
        return <div role="alert" className="text-sm space-y-2">
          <p className="text-rose-700">{scanMsg}</p>
          {list.length > 0 && <div><p className="text-xs text-stone-600 mb-1">{similar.length ? t("Did you mean one of these valid codes?") : t("Valid codes in your catalogue (tap one):")}</p>
            <div className="flex flex-wrap gap-2">{list.map((p) => <button key={catalogKey(p)} type="button" onClick={() => lookupCode(p.barcode)} className="text-left bg-white border border-stone-300 hover:border-amber-500 rounded-lg px-3 py-1.5"><span className="block font-mono text-xs break-all">{p.barcode}</span><span className="block text-[11px] text-stone-500">{p.name}</span></button>)}</div></div>}
        </div>;
      })()}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              {t("Item Master & Material Inventory ")}</h1>
            <p className="text-xs text-stone-500">
              {t("One material catalogue. Separate stock, purchases and sales for each shop. ")}</p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start sm:self-auto">
          {currentUser.role === 'Admin' && placeholderCatalogs.length > 0 && (
            <button onClick={handleStandardiseSkus} className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-300 cursor-pointer shadow-xs" title={t("Make old numeric SKUs match the common style")}>
              {t("Make SKUs consistent")} ({placeholderCatalogs.length})
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            disabled={currentUser.role!=='Admin'}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-300 cursor-pointer shadow-xs"
            title={t("Import materials via CSV / Excel")}
          >
            <Upload className="w-3.5 h-3.5 text-amber-700" />
            <span>{t("Import CSV")}</span>
          </button>

          <button
            onClick={handleExportInventoryCSV}
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-300 cursor-pointer shadow-xs"
            title={t("Export full inventory to Excel/CSV")}
          >
            <Download className="w-3.5 h-3.5 text-stone-600" />
            <span>{t("Export CSV")}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            disabled={currentUser.role!=='Admin' && currentUser.role!=='Shop Manager'}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t("Create Material ")}</button>
        </div>
      </div>

      {/* Multi-Shop Branch Filter Bar */}
      <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-amber-800 shrink-0" />
          <span className="font-bold text-stone-800">{t("Branch Stock View:")}</span>
          <select
            value={inventoryShopFilter}
            onChange={(e) => setInventoryShopFilter(e.target.value)}
            className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 font-bold text-stone-900 outline-none focus:border-amber-600"
          >
            <option value="all">{t("🏢 All Shops & Warehouses (Consolidated)")}</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                📍 {s.name} ({s.city})
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-stone-600">
          {t("Showing ")}<span className="font-bold text-stone-900">{materialGroups.length}</span> {t("materials in")}{' '}
          <span className="font-bold text-amber-800">
            {inventoryShopFilter === 'all'
              ? t("All Branches")
              : shops.find((s) => s.id === inventoryShopFilter)?.name}
          </span>
        </div>
      </div>

      {/* Stock Valuation Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">{t("Unique SKUs")}</span>
          <div className="text-xl font-bold text-stone-900 mt-1">{materialGroups.length} {t("Materials")}</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">{t("Physical Stock")}</span>
          <div className="text-xl font-bold text-amber-800 mt-1">{totalStockCount} {t("Units")}</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">{t("Cost Valuation")}</span>
          <div className="text-xl font-bold text-stone-800 mt-1">₹{totalStockValuation.toLocaleString('en-IN')}</div>
        </div>
        <div className="bg-white border border-amber-200/80 p-3 rounded-xl shadow-xs">
          <span className="text-[10px] uppercase font-bold text-stone-500">{t("Retail Value")}</span>
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
            {t("All (")}{materialGroups.length})
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
            {t("Low Stock (")}{lowStockCount})
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("Search name, brand, barcode...")}
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
          <table className="materials-table w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100 text-stone-700 uppercase text-[10px] font-bold border-b border-stone-200">
              <tr>
                <th className="py-2.5 px-3">{t("Material / Item Details")}</th>
                <th className="py-2.5 px-2">{t("Category")}</th>
                <th className="py-2.5 px-2">{t("Barcode")}</th>
                <th className="py-2.5 px-2">{t("Shop Branch")}</th>
                <th className="py-2.5 px-2 text-right">{t("Cost (₹)")}</th>
                <th className="py-2.5 px-2 text-right">{t("Sale (₹)")}</th>
                <th className="py-2.5 px-2 text-center">{t("GST")}</th>
                <th className="py-2.5 px-2 text-center">{t("Stock")}</th>
                <th className="py-2.5 px-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {modelGroups.map((g) => <React.Fragment key={g.key}>
              {g.modelNo && <tr className="model-heading bg-amber-50"><td colSpan={9} className="py-2.5 px-4"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="font-bold text-stone-900">{g.brand || t("No brand")} — {t("Model")} {g.modelNo}</span><span className="text-[11px] rounded-full bg-white border border-amber-200 px-2 py-0.5 text-amber-900">{g.category}</span><span className="text-[11px] text-stone-600">{g.materials.length} {isLensCategory(g.category as ProductCategory) ? (g.materials.length === 1 ? t("variant") : t("variants")) : g.category === 'Contact Lens' ? (g.materials.length === 1 ? t("MRP / batch") : t("MRPs / batches")) : (g.materials.length === 1 ? t("colour") : t("colours"))} · {g.materials.reduce((s, m) => s + m.rows.reduce((a, r) => a + r.stockQty, 0), 0)} {t("units")}</span>{(currentUser.role === 'Admin' || currentUser.role === 'Shop Manager') && <button type="button" onClick={() => handleOpenAddColour(g.materials[0].rows[0])} className="ml-auto text-xs font-bold text-emerald-700 inline-flex items-center gap-1"><Plus className="w-3 h-3" />{isLensCategory(g.category as ProductCategory) ? t("Add index / coating") : g.category === 'Contact Lens' ? t("Add MRP / batch") : t("Add colour")}</button>}</div></td></tr>}
              {g.materials.map(({id,rows}) => {
                const p=rows[0],total=rows.reduce((sum,row)=>sum+row.stockQty,0);
                return <tr key={id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-5 px-4"><div className="font-semibold text-stone-900 text-sm break-words">{p.name}</div><div className="text-xs text-stone-500 mt-1">{p.brand} · {p.modelNo}{p.color ? <> · <strong className="text-stone-800">{t("Colour")} {p.color}</strong></> : null}</div>{isLensCategory(p.category) && <div className="text-[11px] text-stone-600 mt-1">{[p.lensType, p.lensIndex && `Index ${p.lensIndex}`, p.coating, p.powerRange].filter(Boolean).join(' · ')}</div>}{p.category === 'Contact Lens' && <div className="text-[11px] text-stone-600 mt-1">{[p.mrp > 0 && `MRP ₹${p.mrp}`, p.expiry && `Exp ${p.expiry}`, p.batchNo && `Batch ${p.batchNo}`, p.baseCurve && `BC ${p.baseCurve}`, p.diameter && `Dia ${p.diameter}`, p.packSize ? `${p.packSize}/box` : ''].filter(Boolean).join(' · ')}</div>}</td>
                  <td data-label={t('Category')} className="px-2 text-xs text-stone-500">{p.category}</td>
                  <td data-label={t('Barcode')} className="px-2 font-mono text-xs break-all">{p.barcode}</td>
                  <td data-label={t('Shop Branch')} className="px-2 py-3"><div className="space-y-2">{rows.map(row=><div key={row.id} className="flex items-center gap-2">
                    <button onClick={()=>handleOpenStockAdjust(row)} className="flex items-center justify-between gap-3 w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 hover:border-amber-400" title={t("Adjust this shop's stock")}>
                      <span className="text-xs whitespace-nowrap">{(shops.find(s=>s.id===row.shopId)?.name || 'Unallocated').split(' - ')[0]}</span><strong className={isLowStockRow(row)?'text-rose-600':row.stockQty===0?'text-stone-400':'text-emerald-700'}>{row.stockQty}</strong>
                    </button>
                    <button disabled={shops.length<2} onClick={()=>handleOpenTransfer(row)} className="p-2 text-stone-500 hover:text-amber-700 disabled:opacity-30 shrink-0" title={t("Transfer from this shop")}><ArrowLeftRight className="w-4 h-4"/></button>
                  </div>)}</div></td>
                  <td data-label={t('Cost (₹)')} className="px-2 text-right text-stone-500">{rows.every(r=>r.purchasePrice===p.purchasePrice)?'₹'+p.purchasePrice:t("Shop-wise")}</td>
                  <td data-label={t('Sale (₹)')} className="px-2 text-right font-semibold">{rows.every(r=>r.salePrice===p.salePrice)?'₹'+p.salePrice:t("Varies")}</td>
                  <td data-label={t('GST')} className="px-2 text-center">{p.gstRate}%</td>
                  <td className="px-2 text-center"><span className="text-base font-bold text-stone-900">{total}</span><span className="block text-[10px] text-stone-400">{t("TOTAL UNITS")}</span></td>
                  <td className="px-3 text-right whitespace-nowrap">
                    {!isLensCategory(p.category) && <button onClick={()=>setSelectedProductForBarcode(p)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title={t("Print material code")}><Tag className="w-4 h-4"/></button>}
                    {currentUser.role==='Admin' && <><button onClick={()=>handleOpenEdit(p)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title={t("Edit shared material")}><Edit className="w-4 h-4"/></button><button onClick={()=>{void handleDeleteMaterial(p);}} className="p-2 text-stone-400 hover:text-rose-600 rounded-lg" title={t("Delete material")}><Trash2 className="w-4 h-4"/></button></>}
                  </td>
                </tr>;
              })}
              </React.Fragment>)}
              {materialGroups.length===0 && <tr><td colSpan={9} className="p-12 text-center text-stone-500">{t("No materials yet. Create a material once to make it available in every shop.")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {askDialog}

      {/* Scanned tag details */}
      {scanned && (() => {
        const { product: sp, unit } = scanned;
        const rows = products.filter((p) => catalogKey(p) === catalogKey(sp));
        const sold = unit ? rows.some((r) => r.soldUnitCodes?.includes(unit)) : false;
        const disabled = unit ? rows.some((r) => r.disabledUnitCodes?.includes(unit)) : false;
        const soldOn = unit ? invoices.find((inv) => inv.items.some((it) => it.unitCodes?.includes(unit))) : undefined;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
            <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900 break-words">{sp.name}</h3>
                  <p className="text-xs text-stone-500">{sp.brand} · {sp.modelNo} · {sp.color}</p>
                </div>
                <button onClick={() => setScanned(null)} aria-label={t("Close")} className="p-1.5 text-stone-400 hover:text-stone-700 bg-stone-100 rounded-lg shrink-0">✕</button>
              </div>
              {unit && (
                <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${sold || disabled ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                  {t("This piece")}: <span className="font-mono">{unit}</span> — {sold ? `${t("SOLD")}${soldOn ? ` (${soldOn.invoiceNo}, ${soldOn.date})` : ''} · ${t("tag closed")}` : disabled ? t("DISABLED — cannot be billed") : t("in stock, not sold yet")}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div><dt className="text-stone-400 uppercase text-[10px]">{t("Category")}</dt><dd>{sp.category}</dd></div>
                <div><dt className="text-stone-400 uppercase text-[10px]">{t("Barcode")}</dt><dd className="font-mono break-all">{sp.barcode}</dd></div>
                {sp.size && <div><dt className="text-stone-400 uppercase text-[10px]">{t("Size")}</dt><dd>{sp.size}</dd></div>}
                {sp.frameType && sp.frameType !== 'N/A' && <div><dt className="text-stone-400 uppercase text-[10px]">{t("Frame type")}</dt><dd>{sp.frameType}</dd></div>}
                <div><dt className="text-stone-400 uppercase text-[10px]">MRP</dt><dd>₹{sp.mrp}</dd></div>
                <div><dt className="text-stone-400 uppercase text-[10px]">{t("Sale price")}</dt><dd className="font-bold">₹{sp.salePrice}</dd></div>
                <div><dt className="text-stone-400 uppercase text-[10px]">GST</dt><dd>{sp.gstRate}%</dd></div>
                <div><dt className="text-stone-400 uppercase text-[10px]">HSN</dt><dd>{sp.hsnCode || '-'}</dd></div>
              </dl>
              <div>
                <p className="text-[10px] uppercase text-stone-400 mb-1">{t("Stock by shop")}</p>
                <div className="space-y-1">
                  {rows.map((r) => (
                    <div key={r.id} className="flex justify-between bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs">
                      <span>{(shops.find((s) => s.id === r.shopId)?.name || 'Unallocated').split(' - ')[0]}{r.location ? ` · ${r.location}` : ''}</span>
                      <strong>{r.stockQty}</strong>
                    </div>
                  ))}
                </div>
              </div>
              {unit && !sold && (
                <button onClick={() => { if (disabled || confirm(`Disable tag ${unit}? It will not be billable until you enable it again. Stock count is not changed — adjust it separately if the piece is lost.`)) setTagDisabled(sp.id, unit, !disabled); }} className={`w-full py-2 rounded-lg text-xs font-bold border ${disabled ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : 'border-rose-300 text-rose-700 bg-rose-50'}`}>{disabled ? t("Enable this tag again") : t("Disable this tag")}</button>
              )}
              <div className="flex gap-2 pt-1">
                <button hidden={isLensCategory(sp.category)} onClick={() => { setSelectedProductForBarcode(sp); setScanned(null); }} className="flex-1 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold">{t("Print tags")}</button>
                <button onClick={() => setScanned(null)} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold">{t("Done")}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 z-50 overflow-y-auto">
          <div className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                {editingProduct ? t("Edit Master Material") : t("Create New Material / Item")}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-500 hover:text-stone-800 cursor-pointer text-base">✕</button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs"><p className="bg-amber-50 text-amber-800 rounded-xl p-3 leading-relaxed">{t("Material details and selling price are shared across shops. Opening quantity, cost and rack belong to the selected shop.")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Category *")}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value as ProductCategory)}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Opening stock shop *")}</label>
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
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Barcode / SKU *")}{!editingProduct && skuAuto && <span className="ml-1 font-normal text-emerald-700">({t("auto")})</span>}</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => { setSkuAuto(false); setFormData({ ...formData, barcode: e.target.value }); }}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Material / Product Title *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Ray-Ban Aviator Classic Green G-15")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Brand / Manufacturer")}</label>
                  <input
                    type="text"
                    list="brand-suggestions"
                    placeholder={t("Ray-Ban, Titan, Zeiss...")}
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                  <datalist id="brand-suggestions">
                    {(formData.category === 'Contact Lens' ? SUGGESTED_CONTACT_LENS_BRANDS : isLensCategory(formData.category) ? LENS_COMPANIES : ['Frames','Sunglasses'].includes(formData.category) ? SUGGESTED_EYEWEAR_BRANDS : []).map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Model / Article No.")}</label>
                  <input
                    type="text"
                    placeholder={t("RB-3025 / 1.56 HMC")}
                    value={formData.modelNo}
                    onChange={(e) => setFormData({ ...formData, modelNo: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                {!isLensCategory(formData.category) && <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{formData.category === 'Contact Lens' ? t("Colour / tint (optional)") : t("Color / Shade")}</label>
                  <input
                    type="text"
                    placeholder={t("Matte Black / Clear")}
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>}
              </div>
              {isLensCategory(formData.category) ? (
                <div className="rounded-lg border border-dashed border-stone-300 p-3 space-y-2">
                  <p className="text-stone-600">{t("Same lens in another index or coating? Add each one with its own price and quantity. Each becomes a separate item on bills.")}</p>
                  {extraColors.map((x, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center">
                      <input list="lens-index-list" aria-label={t("Index")} placeholder={t("Index e.g. 1.60")} value={x.index} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, index: e.target.value } : r)))} className="bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input list="lens-coating-list" aria-label={t("Coating")} placeholder={t("Coating")} value={x.code} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, code: e.target.value } : r)))} className="bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="number" min={0} aria-label={t("MRP")} placeholder={t("MRP ₹")} value={x.mrp || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, mrp: Number(e.target.value) } : r)))} className="bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="number" min={0} aria-label={t("Sale price")} placeholder={t("Sale ₹")} value={x.sale || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, sale: Number(e.target.value) } : r)))} className="bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <div className="flex gap-1 items-center"><input type="number" min={0} aria-label={t("Quantity")} placeholder={t("Qty")} value={x.qty || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))} className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2" /><button type="button" aria-label={t("Remove variant")} onClick={() => setExtraColors((prev) => prev.filter((_, j) => j !== i))} className="p-2 text-stone-400 hover:text-rose-600">✕</button></div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExtraColors((prev) => [...prev, { code: '', qty: 0, mrp: 0, sale: 0, expiry: '', index: '' }])} className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Plus className="w-3 h-3" />{t("Add another index / coating")}</button>
                </div>
              ) : formData.category === 'Contact Lens' ? (
                <div className="rounded-lg border border-dashed border-stone-300 p-3 space-y-2">
                  <p className="text-stone-600">{t("Same product with a different MRP or expiry (another batch)? Add each one here with its own quantity. Each becomes a separate item, so every MRP stays correct on bills.")}</p>
                  {extraColors.map((x, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="number" min={0} aria-label={t("MRP")} placeholder={t("MRP ₹")} value={x.mrp || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, mrp: Number(e.target.value) } : r)))} className="w-24 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="number" min={0} aria-label={t("Sale price")} placeholder={t("Sale ₹")} value={x.sale || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, sale: Number(e.target.value) } : r)))} className="w-24 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="month" aria-label={t("Expiry")} value={x.expiry} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, expiry: e.target.value } : r)))} className="flex-1 min-w-0 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="number" min={0} aria-label={t("Quantity")} placeholder={t("Qty")} value={x.qty || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))} className="w-16 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <button type="button" aria-label={t("Remove batch")} onClick={() => setExtraColors((prev) => prev.filter((_, j) => j !== i))} className="p-2 text-stone-400 hover:text-rose-600">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExtraColors((prev) => [...prev, { code: '', qty: 0, mrp: 0, sale: 0, expiry: '', index: '' }])} className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Plus className="w-3 h-3" />{t("Add another MRP / batch")}</button>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-stone-300 p-3 space-y-2">
                  <p className="text-stone-600">{editingProduct ? t("Same model comes in more colours? Add each new colour code with its own quantity. They are saved as separate colours of this model.") : t("Same model comes in more colours? Add each colour code with its own quantity. The colour above uses the opening stock below.")}</p>
                  {extraColors.map((x, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" aria-label={t("Colour code")} placeholder={t("Colour code e.g. C2")} value={x.code} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, code: e.target.value } : r)))} className="flex-1 min-w-0 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <input type="number" min={0} aria-label={t("Quantity")} placeholder={t("Qty")} value={x.qty || ''} onChange={(e) => setExtraColors((prev) => prev.map((r, j) => (j === i ? { ...r, qty: Number(e.target.value) } : r)))} className="w-20 bg-stone-50 border border-stone-300 rounded-lg p-2" />
                      <button type="button" aria-label={t("Remove colour")} onClick={() => setExtraColors((prev) => prev.filter((_, j) => j !== i))} className="p-2 text-stone-400 hover:text-rose-600">✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExtraColors((prev) => [...prev, { code: '', qty: 0, mrp: 0, sale: 0, expiry: '', index: '' }])} className="text-emerald-700 font-semibold inline-flex items-center gap-1"><Plus className="w-3 h-3" />{t("Add another colour")}</button>
                </div>
              )}

              {isLensCategory(formData.category) ? (
                <div className="space-y-3">
                  <datalist id="lens-index-list">{INDEXES.map((x) => <option key={x} value={x} />)}</datalist>
                  <datalist id="lens-coating-list">{COATINGS.map((x) => <option key={x} value={x} />)}</datalist>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-stone-600 font-semibold">{t("Lens type")}
                      <select value={formData.lensType || ''} onChange={(e) => setFormData({ ...formData, lensType: e.target.value })} className="mt-1 w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900 font-normal"><option value="">{t("Select")}</option>{LENS_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
                    </label>
                    <label className="block text-stone-600 font-semibold">{t("Index")}<input list="lens-index-list" placeholder="1.56" value={formData.lensIndex || ''} onChange={(e) => setFormData({ ...formData, lensIndex: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("Coating")}<input list="lens-coating-list" placeholder={t("Blue Guard")} value={formData.coating || ''} onChange={(e) => setFormData({ ...formData, coating: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-stone-600 font-semibold col-span-2">{t("Power range (optional)")}<input placeholder="SPH -6.00 to +4.00, CYL up to -2.00" value={formData.powerRange || ''} onChange={(e) => setFormData({ ...formData, powerRange: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("HSN Code")}<input type="text" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono font-normal" /></label>
                  </div>
                </div>
              ) : formData.category === 'Contact Lens' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-stone-600 font-semibold">{t("Base curve (BC)")}<input type="text" placeholder="8.6" value={formData.baseCurve || ''} onChange={(e) => setFormData({ ...formData, baseCurve: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("Diameter (DIA)")}<input type="text" placeholder="14.2" value={formData.diameter || ''} onChange={(e) => setFormData({ ...formData, diameter: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("HSN Code")}<input type="text" value={formData.hsnCode} onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono font-normal" /></label>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="block text-stone-600 font-semibold">{t("Lenses per box")}<input type="number" min={1} placeholder="6" value={formData.packSize || ''} onChange={(e) => setFormData({ ...formData, packSize: Number(e.target.value) || undefined })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("Expiry (month)")}<input type="month" value={formData.expiry || ''} onChange={(e) => setFormData({ ...formData, expiry: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-normal" /></label>
                    <label className="block text-stone-600 font-semibold">{t("Batch / lot no.")}<input type="text" value={formData.batchNo || ''} onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })} className="mt-1 w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono font-normal" /></label>
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label htmlFor="material-frame-type" className="text-stone-600 font-semibold">{t("Frame Type")}</label>
                    <button type="button" onClick={() => setShowAddFrameType(true)} className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" />{t("Quick Add")}
                    </button>
                  </div>
                  <select
                    id="material-frame-type"
                    value={formData.frameType}
                    onChange={(e) => setFormData({ ...formData, frameType: e.target.value })}
                    className="w-full bg-white border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    {frameTypes.map(type => <option key={type} value={type}>{type === 'Half Rim' ? t('Half Rim (Supra)') : type === 'N/A' ? t('N/A (Lens / Accessory)') : type}</option>)}
                  </select>
                  {showAddFrameType && <div className="mt-2 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
                    <input
                      autoFocus
                      aria-label={t('New frame type')}
                      placeholder={t('New frame type')}
                      value={newFrameType}
                      onChange={e => setNewFrameType(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFrameType(); } }}
                      className="w-full min-w-0 rounded border border-stone-300 bg-white p-2"
                    />
                    <div className="flex gap-3">
                      <button type="button" disabled={!newFrameType.trim()} onClick={handleAddFrameType} className="font-semibold text-emerald-700 disabled:opacity-40">{t('Add & Select')}</button>
                      <button type="button" onClick={() => { setShowAddFrameType(false); setNewFrameType(''); }} className="text-stone-600">{t('Cancel')}</button>
                    </div>
                    <p className="text-stone-600">{t('Save the material to reuse this frame type later.')}</p>
                  </div>}
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Size Specs / Base Curve")}</label>
                  <input
                    type="text"
                    placeholder={t("52-18-140 / 8.5 BC")}
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("HSN Code")}</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
              </div>
              )}

              <div className="grid grid-cols-4 gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Purchase Price (₹)")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{formData.category === 'Contact Lens' ? t("MRP (₹) (optional)") : t("MRP (₹)")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.mrp || ''}
                    onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Sale Price (₹) (optional)")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.salePrice || ''}
                    onChange={(e) => setFormData({ ...formData, salePrice: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-emerald-700 font-bold"
                  />
                  <p className="mt-1 text-stone-500">{t("Leave blank to save as ₹0. You can update it later.")}</p>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("GST %")}</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                  >
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>{t("12% (Frames & Lenses)")}</option>
                    <option value={18}>{t("18% (Sunglasses & Care)")}</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Initial Stock Qty")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    value={formData.stockQty}
                    onChange={(e) => setFormData({ ...formData, stockQty: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Low Stock Alert")}</label>
                  <NumberInput
                    type="number"
                    min="1"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Rack / Shelf Location")}</label>
                  <input
                    type="text"
                    placeholder={t("Rack A-1, Drawer 3")}
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
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  {editingProduct ? t("Save Changes") : t("Create Material")}
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
                {t("Inter-Branch Stock Transfer ")}</h4>
              <button onClick={() => setTransferProduct(null)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <div className="bg-stone-50 p-3 rounded-lg text-xs border border-stone-200 space-y-1">
              <div className="font-bold text-stone-900">{transferProduct.name}</div>
              <div className="text-[11px] text-stone-500">
                {t("Current Location: ")}<span className="font-bold text-stone-800">{shops.find(s => s.id === transferProduct.shopId)?.name || 'All Branches'}</span> {t("• Current Stock: ")}<span className="font-bold text-amber-800">{transferProduct.stockQty} {t("units")}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">{t("Destination Branch *")}</label>
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
                <label className="block text-stone-700 font-semibold mb-1">{t("Quantity to Transfer (Max ")}{transferProduct.stockQty})</label>
                <NumberInput
                  type="number"
                  min="1"
                  max={transferProduct.stockQty}
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(Number(e.target.value))}
                  className="w-full bg-white border border-stone-300 rounded-lg p-2 font-bold text-amber-800 text-sm"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setTransferProduct(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs cursor-pointer"
                >
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  {t("Transfer Stock ")}</button>
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
                {t("Bulk Material Import (CSV / Excel) ")}</h3>
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
                    <div className="font-bold text-stone-900">{t("Step 1: Download Sample Excel / CSV Template")}</div>
                    <div className="text-[11px] text-stone-500">
                      {t("Use our formatted template with columns for Frames, Rx Lenses, Contact Lenses, and Solutions. ")}</div>
                  </div>
                  <button
                    onClick={handleDownloadSampleCSV}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> {t("Sample CSV ")}</button>
                </div>

                {/* Step 2: Choose Target Branch */}
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    {t("Step 2: Assign Imported Stock to Shop Branch: ")}</label>
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
                    {t("Step 3: Upload CSV File or Paste Data Below: ")}</label>

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
                      {t("Browse CSV File ")}</button>
                    <span className="text-[11px] text-stone-500">{t("or paste CSV text directly in the box:")}</span>
                  </div>

                  <textarea
                    rows={4}
                    placeholder={t("Name,Category,Brand,ModelNo,Color,FrameType,Size,HSNCode,PurchasePrice,MRP,SalePrice,GSTRate,StockQty,MinStockAlert,Location,Barcode&#10;Ray-Ban Aviator,Frames,Ray-Ban,RB-3025,Gold,Full Rim,58-14-135,90031100,3200,6590,5900,12,10,3,Rack A-1,890123450099")}
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
                        {t("Parsed Materials Preview (")}{parsedImportItems.length} {t("items found) ")}</span>
                      <span className="text-[11px] text-emerald-700 font-semibold">{t("Ready to Import")}</span>
                    </div>

                    <div className="border border-stone-200 rounded-lg max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-stone-100 text-stone-600 font-bold sticky top-0">
                          <tr>
                            <th className="p-2">{t("Name")}</th>
                            <th className="p-2">{t("Category")}</th>
                            <th className="p-2">{t("Brand")}</th>
                            <th className="p-2 text-right">{t("Cost")}</th>
                            <th className="p-2 text-right">{t("Sale")}</th>
                            <th className="p-2 text-center">{t("Stock")}</th>
                            <th className="p-2">{t("Barcode")}</th>
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
                    {t("Cancel ")}</button>
                  <button
                    type="button"
                    disabled={parsedImportItems.length === 0}
                    onClick={handleExecuteBulkImport}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {t("Import ")}{parsedImportItems.length} {t("Material(s) ")}</button>
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
              <h4 className="text-xs font-bold text-stone-900">{t("Adjust Physical Stock Quantity")}</h4>
              <button onClick={() => setAdjustingProduct(null)} className="text-stone-500 hover:text-stone-800 cursor-pointer">✕</button>
            </div>

            <div className="text-xs text-stone-700">
              <div className="font-bold text-stone-900">{adjustingProduct.name}</div>
              <div className="text-[11px] text-stone-500 font-mono">{t("Barcode: ")}{adjustingProduct.barcode}</div>
            </div>

            <form onSubmit={handleSaveStockAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 mb-1">{t("New Physical Stock Count (Units)")}</label>
                <NumberInput
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
                  {t("Cancel ")}</button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs cursor-pointer"
                >
                  {t("Update Stock ")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
