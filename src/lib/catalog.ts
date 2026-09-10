import type { Product } from '../types';

export const catalogKey = (p: Product) => p.catalogId || `catalog-${p.id}`;
const identity = (p: Product) => p.barcode ? JSON.stringify([p.barcode,p.name,p.category,p.brand,p.modelNo,p.color,p.size || '']) : p.id;

/** Preserve historical stock-row IDs and quantities; add zero-stock rows for other shops. */
export function expandCatalog(products: Product[], shopIds: string[]): Product[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key=p.catalogId ? `linked:${p.catalogId}` : `legacy:${identity(p)}`;
    groups.set(key,[...(groups.get(key)||[]),p]);
  }
  const result: Product[]=[];
  for (const group of groups.values()) {
    // Ambiguous duplicate codes within a branch are not merged automatically.
    const duplicate=group.some((p,i)=>group.slice(0,i).some(q=>q.shopId===p.shopId));
    if(duplicate && group[0].catalogId){result.push(...group);continue;}
    for (const batch of duplicate ? group.map(p=>[p]) : [group]) {
      const id=batch[0].catalogId || `catalog-${batch[0].id}`;
      const linked=batch.map(p=>({...p,catalogId:id}));
      result.push(...linked);
      const source=linked.find(p=>shopIds.includes(p.shopId || ''));
      if (!source) continue; // Unallocated legacy stock needs explicit allocation.
      for (const shopId of shopIds) if (!linked.some(p=>p.shopId===shopId)) {
        const {drishtiSourceId,drishtiItemId,drishtiHash,drishtiStockQty,drishtiSyncedAt,...common}=source;
        result.push({...common,id:`stock:${id}:${shopId}`,shopId,stockQty:0,location:''});
      }
    }
  }
  return result;
}

export function updateCatalogProduct(products:Product[], changed:Product):Product[] {
  const previous=products.find(p=>p.id===changed.id);
  if(!previous) throw Error('Material no longer exists. Reload inventory.');
  if(previous.shopId && previous.shopId!=='all' && changed.shopId!==previous.shopId) throw Error('Use stock transfer to move material between shops.');
  const shared={barcode:changed.barcode,qrCode:changed.qrCode,name:changed.name,category:changed.category,brand:changed.brand,modelNo:changed.modelNo,color:changed.color,frameType:changed.frameType,size:changed.size,hsnCode:changed.hsnCode,gstRate:changed.gstRate,mrp:changed.mrp,salePrice:changed.salePrice};
  return products.map(p=>catalogKey(p)!==catalogKey(previous)?p:p.id===changed.id?{...changed,catalogId:catalogKey(previous)}:{...p,...shared});
}

export function transferCatalogStock(products:Product[], sourceId:string, targetShopId:string, qty:number):Product[] {
  const source=products.find(p=>p.id===sourceId);
  const target=source && products.find(p=>catalogKey(p)===catalogKey(source)&&p.shopId===targetShopId);
  if(!source||!target||source.id===target.id)throw Error('Choose a different accessible shop for this material.');
  if(!Number.isInteger(qty)||qty<=0||qty>source.stockQty)throw Error('Enter a positive whole quantity within available stock.');
  return products.map(p=>p.id===source.id?{...p,stockQty:p.stockQty-qty}:p.id===target.id?{...p,stockQty:p.stockQty+qty}:p);
}

export function applyStockMovement(products:Product[], shopId:string, items:{productId:string;qty:number}[], direction:1|-1):Product[] {
  const quantities=new Map<string,number>();
  for(const item of items){
    if(!Number.isInteger(item.qty)||item.qty<=0)throw Error('Quantity must be a positive whole number.');
    const product=products.find(p=>p.id===item.productId);
    if(!product||product.shopId!==shopId)throw Error('Choose material from the transaction shop.');
    quantities.set(item.productId,(quantities.get(item.productId)||0)+item.qty);
  }
  return products.map(p=>{
    const qty=quantities.get(p.id)||0;
    if(p.stockQty+direction*qty<0)throw Error(`Insufficient stock for ${p.name} in this shop.`);
    return qty?{...p,stockQty:p.stockQty+direction*qty}:p;
  });
}
