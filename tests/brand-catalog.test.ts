import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('brand starters seed both shops without stock or duplicate materials',async()=>{
 const db=new PGlite();try{
 await db.exec(`create schema auth;create table auth.users(id uuid,email text);create table public.optical_workspaces(owner_id uuid,data jsonb,version integer);insert into auth.users values('00000000-0000-0000-0000-000000000001','tusharbali855@gmail.com');insert into public.optical_workspaces values('00000000-0000-0000-0000-000000000001','{"JIYA_OPTICALS_ERP_V2_shops":[{"id":"a"},{"id":"b"}],"JIYA_OPTICALS_ERP_V2_products":[]}',1);`);
 const sql=readFileSync('supabase/ADD_BRAND_INVENTORY.sql','utf8');await db.exec(sql);await db.exec(sql);
 const row=(await db.query<{data:any;version:number}>('select * from optical_workspaces')).rows[0];
 const products=row.data.JIYA_OPTICALS_ERP_V2_products;
 assert.equal(products.length,86);assert.equal(new Set(products.map((p:any)=>p.catalogId)).size,43);
 assert.ok(products.every((p:any)=>p.stockQty===0&&p.salePrice===0));assert.equal(row.version,2);
 }finally{await db.close();}
});
