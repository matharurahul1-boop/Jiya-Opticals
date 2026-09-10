import test from 'node:test';
import assert from 'node:assert/strict';
import { expandCatalog,updateCatalogProduct,transferCatalogStock,applyStockMovement } from '../src/lib/catalog';
import type { Product } from '../src/types';
const item:Product={id:'old-a',shopId:'a',barcode:'000123',name:'Frame',category:'Spectacle Frame',brand:'Brand',modelNo:'M1',color:'Black',hsnCode:'9003',purchasePrice:100,mrp:250,salePrice:200,gstRate:0,stockQty:10,minStockAlert:1};
test('one material has separate branch stock, stable historical IDs, and idempotent expansion',()=>{
 const rows=expandCatalog([item],['a','b']);assert.equal(rows.length,2);assert.equal(rows[0].id,'old-a');assert.equal(rows[1].stockQty,0);assert.equal(rows[0].catalogId,rows[1].catalogId);
 assert.deepEqual(expandCatalog(rows,['a','b']),rows);
 const added=expandCatalog(rows,['a','b','c']);assert.equal(added[2].stockQty,0);assert.equal(added.reduce((n,p)=>n+p.stockQty,0),10);
 const legacy=expandCatalog([item,{...item,id:'old-b',shopId:'b',stockQty:7}],['a','b']);assert.deepEqual(legacy.map(p=>p.id),['old-a','old-b']);assert.equal(legacy.reduce((n,p)=>n+p.stockQty,0),17);
 const ambiguous=[{...item,catalogId:'duplicate'},{...item,id:'other',catalogId:'duplicate'}];assert.deepEqual(expandCatalog(ambiguous,['a','b']),ambiguous);
 const unallocated={...item,shopId:'all'};
 const allocated=updateCatalogProduct([unallocated],{...unallocated,shopId:'b'});assert.equal(expandCatalog(allocated,['a','b']).find(p=>p.shopId==='b')?.stockQty,10);
});
test('shared edits preserve stock and cost; transfer, purchase and sale affect the selected shop only',()=>{
 let rows=expandCatalog([item],['a','b']);
 rows=updateCatalogProduct(rows,{...rows[0],name:'Updated',salePrice:220,purchasePrice:110});
 assert.equal(rows[1].name,'Updated');assert.equal(rows[1].salePrice,220);assert.equal(rows[1].purchasePrice,100);assert.equal(rows[1].stockQty,0);
 rows=transferCatalogStock(rows,rows[0].id,'b',3);assert.deepEqual(rows.map(p=>p.stockQty),[7,3]);
 rows=applyStockMovement(rows,'b',[{productId:rows[1].id,qty:2}],1);assert.deepEqual(rows.map(p=>p.stockQty),[7,5]);
 rows=applyStockMovement(rows,'b',[{productId:rows[1].id,qty:1},{productId:rows[1].id,qty:1}],-1);assert.deepEqual(rows.map(p=>p.stockQty),[7,3]);
 assert.throws(()=>applyStockMovement(rows,'a',[{productId:rows[1].id,qty:1}],-1),/transaction shop/);
 assert.throws(()=>applyStockMovement(rows,'b',[{productId:rows[1].id,qty:4}],-1),/Insufficient/);
 for(const qty of [0,-1,1.5,99])assert.throws(()=>transferCatalogStock(rows,rows[0].id,'b',qty));
});
