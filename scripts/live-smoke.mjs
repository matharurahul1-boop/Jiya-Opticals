// Explicit opt-in: creates a synthetic account and isolated QA business on LIVE Supabase.
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
config({ path: '.env.local', quiet: true });
if (!process.argv.includes('--run-live')) throw Error('Pass --run-live to authorize live test records.');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const report = { date:new Date().toISOString(), checks:[], testUser:null, limitations:['API integration checks, not browser form or hardware verification.'] };
const check = async (name, fn) => {try { const result=await fn(); report.checks.push({name,status:'PASS'}); console.log('PASS',name); return result; } catch(e) {report.checks.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.message);return null;} finally {writeFileSync('supabase/LIVE_TEST_RESULTS.json',JSON.stringify(report,null,2)+'\n');}};
const rpc = async (name,args={}) => {const {data,error}=await client.rpc(name,args).retry(false).abortSignal(AbortSignal.timeout(20000));if(error)throw Error(error.message);return data;};
const email=`joy-qa-${Date.now()}@example.com`,password=randomBytes(24).toString('base64url');
try {
 const account=await check('Signup',async()=>{const {data,error}=await client.auth.signUp({email,password});if(error)throw error;if(!data.session)throw Error('Email confirmation required');return data;});
 if(account){
  const owner=account.user.id;report.testUser={id:owner,email};
  await check('Logout',async()=>{const {error}=await client.auth.signOut();if(error)throw error;});
  const signed=await check('Password login',async()=>{const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;return data;});
  if(signed){
   await check('User profile directory',()=>rpc('optical_user_sync',{display_name:'QA TEST ONLY',uname:'qa-test',phone:''}));
   await check('Business list',()=>rpc('optical_team_list'));
   const created=await check('Create isolated test business',()=>rpc('optical_team_create',{business_name:'QA TEST ONLY - '+report.date,profile:{name:'QA TEST ONLY'}}));
   if(created){
    let loaded=await check('Load workspace',()=>rpc('optical_team_load',{team_owner:owner}));
    if(loaded){
     const key=s=>'JIYA_OPTICALS_ERP_V2_'+s;
     const data=loaded.data;
     data[key('shops')]=[{id:'qa-shop-a',name:'QA TEST Shop A'},{id:'qa-shop-b',name:'QA TEST Shop B'}];
     await check('Save and reload shops',async()=>{await rpc('optical_team_save',{team_owner:owner,expected_version:loaded.version,payload:data});loaded=await rpc('optical_team_load',{team_owner:owner});if(loaded.data[key('shops')].length!==2)throw Error('Shops not persisted');});
     const save = async (label,mutate,verify) => check(label,async()=>{const next=structuredClone(loaded.data);mutate(next);await rpc('optical_team_save',{team_owner:owner,expected_version:loaded.version,payload:next});loaded=await rpc('optical_team_load',{team_owner:owner});verify(loaded.data);});
     const day=report.date.slice(0,10),shopId='qa-shop-a';
     const product={id:'qa-product',shopId,barcode:'000QA001',name:'QA TEST Frame',category:'Spectacle Frame',brand:'QA',modelNo:'QA1',color:'Black',hsnCode:'9003',purchasePrice:100,mrp:250,salePrice:200,gstRate:0,stockQty:0,minStockAlert:1};
     await save('Client and inventory record persistence',d=>{
      d[key('customers')]=[{id:'qa-client',shopId,name:'QA TEST Client',mobile:'0000000000',createdAt:day,totalSpent:0,outstandingBalance:0,prescriptions:[]},{id:'qa-private-client',shopId:'qa-shop-b',name:'QA PRIVATE B',mobile:'0000000000',createdAt:day,totalSpent:0,outstandingBalance:0,prescriptions:[]}];
      d[key('products')]=[product];
      d[key('suppliers')]=[{id:'qa-supplier',name:'QA TEST Supplier',contactPerson:'QA',mobile:'0000000000',gstin:'',openingBalance:0,currentBalance:0,category:'Frames'}];
     },d=>{assert.equal(d[key('customers')].length,2);assert.equal(d[key('products')][0].barcode,'000QA001');});
     await save('Purchase, stock and supplier balance persistence',d=>{
      d[key('purchases')]=[{id:'qa-purchase',shopId,purchaseNo:'QA-PUR-001',supplierId:'qa-supplier',supplierName:'QA TEST Supplier',supplierBillNo:'QA-001',billDate:day,items:[{productId:product.id,name:product.name,barcode:product.barcode,category:product.category,hsnCode:product.hsnCode,qty:10,purchaseRate:100,mrp:250,salePrice:200,gstRate:0,total:1000}],subtotal:1000,taxAmount:0,grandTotal:1000,paidAmount:400,balanceDue:600,paymentMode:'Cash'}];
      d[key('products')][0].stockQty=10;d[key('suppliers')][0].currentBalance=600;
     },d=>{assert.equal(d[key('purchases')][0].balanceDue,600);assert.equal(d[key('products')][0].stockQty,10);assert.equal(d[key('suppliers')][0].currentBalance,600);});
     await save('Invoice, payment and customer balance persistence',d=>{
      d[key('invoices')]=[{id:'qa-invoice',shopId,invoiceNo:'QA-INV-001',date:day,time:'12:00',customerId:'qa-client',customerName:'QA TEST Client',customerMobile:'0000000000',items:[{productId:product.id,barcode:product.barcode,name:product.name,category:product.category,hsnCode:product.hsnCode,qty:1,unitPrice:200,discountPercent:0,taxableAmount:200,gstRate:0,cgstAmount:0,sgstAmount:0,igstAmount:0,totalAmount:200}],subtotal:200,totalDiscount:0,totalTax:0,cgstTotal:0,sgstTotal:0,igstTotal:0,fittingTotal:0,grandTotal:200,roundOff:0,netPayable:200,advancePaid:50,balanceDue:150,paymentMode:'Cash',orderStatus:'Direct Sale'}];
      d[key('payments')]=[{id:'qa-payment',shopId,customerId:'qa-client',invoiceId:'qa-invoice',date:day,amount:50,paymentMode:'Cash'}];d[key('products')][0].stockQty=9;d[key('customers')][0].totalSpent=200;d[key('customers')][0].outstandingBalance=150;
     },d=>{assert.equal(d[key('invoices')][0].balanceDue,150);assert.equal(d[key('payments')][0].amount,50);assert.equal(d[key('products')][0].stockQty,9);assert.equal(d[key('customers')][0].outstandingBalance,150);});
     await check('Stale save rejected',async()=>{await assert.rejects(rpc('optical_team_save',{team_owner:owner,expected_version:loaded.version-1,payload:loaded.data}),/another session/);});
     const member=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
     const memberEmail=`joy-qa-member-${Date.now()}@example.com`;
     try {
      await check('Member signup, assigned-shop isolation and revocation',async()=>{
       const {data:ma,error}=await member.auth.signUp({email:memberEmail,password:randomBytes(24).toString('base64url')});if(error)throw error;if(!ma.session)throw Error('Member email confirmation required');
       report.memberUser={id:ma.user.id,email:memberEmail};
       await rpc('optical_team_assign',{team_owner:owner,member_email:memberEmail,assigned_shops:[shopId],remove_member:false});
       await rpc('optical_member_set_role',{team_owner:owner,member_email:memberEmail,new_role:'Cashier'});
       const read=await member.rpc('optical_team_load',{team_owner:owner});if(read.error)throw read.error;
       assert.deepEqual(read.data.data[key('shops')].map(s=>s.id),[shopId]);assert.equal(JSON.stringify(read.data).includes('QA PRIVATE B'),false);assert.equal(read.data.user.role,'Cashier');
       const attack=structuredClone(read.data.data);attack[key('customers')].push({id:'qa-attack',shopId:'qa-shop-b'});
       const rejected=await member.rpc('optical_team_save',{team_owner:owner,expected_version:read.data.version,payload:attack});assert.ok(rejected.error,'Cross-shop write must be rejected');
       await rpc('optical_team_assign',{team_owner:owner,member_email:memberEmail,assigned_shops:[],remove_member:true});
       const revoked=await member.rpc('optical_team_load',{team_owner:owner});assert.ok(revoked.error,'Revoked member must not load workspace');
      });
     } finally { await member.auth.signOut(); }
    }
    await check('Team users directory',()=>rpc('optical_team_users',{team_owner:owner}));
    await check('Team assignments list',()=>rpc('optical_team_members',{team_owner:owner}));
    await check('Drishti RPC availability (empty batch)',()=>rpc('optical_drishti_import',{team_owner:owner,target_shop:'qa-shop-a',source_id:'qa-test',items:[]}));
   }
  }
 }
} finally {
 await client.auth.signOut();
 writeFileSync('supabase/LIVE_TEST_RESULTS.json',JSON.stringify(report,null,2)+'\n');
}
