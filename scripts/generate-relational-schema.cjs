// Generates a standalone SQL Editor script from the current frontend types.
const fs = require('node:fs');
const types = fs.readFileSync('src/types.ts', 'utf8');
const snake = s => s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const entities = {
  ShopBranch: 'shops', StoreProfile: 'store_profiles', UserAccount: 'user_profiles',
  Supplier: 'suppliers', Doctor: 'doctors', SalesStaff: 'sales_staff',
  Customer: 'clients', Product: 'inventory', Prescription: 'prescriptions',
  Invoice: 'invoices', InvoiceItem: 'invoice_items', Purchase: 'purchases',
  PurchaseItem: 'purchase_items', Expense: 'expenses',
  WhatsAppTemplate: 'whatsapp_templates', FollowUpReminder: 'follow_ups',
};
const references = { shop_id: 'shops', customer_id: 'clients', supplier_id: 'suppliers',
  product_id: 'inventory', eye_prescription_id: 'prescriptions', prescription_id: 'prescriptions',
  invoice_id: 'invoices', purchase_id: 'purchases', purchase_order_id: 'purchase_orders' };
const dates = new Set(['date','birthday','anniversary','last_visit','next_follow_up_date','next_checkup_date','delivery_date','bill_date','due_date']);
const tables = {};
for (const [type, table] of Object.entries(entities)) {
  const body = types.match(new RegExp('export interface ' + type + ' \\{([\\s\\S]*?)\\n\\}'))[1];
  const columns = [];
  for (const match of body.matchAll(/^\s*(\w+)(\?)?:\s*([^;]+);/gm)) {
    const [, name, optional, fieldType] = match;
    if (['id','items','prescriptions','prescription'].includes(name)) continue;
    const column = snake(name);
    let sqlType = 'text';
    if (fieldType === 'number') sqlType = 'numeric(18,4)';
    if (fieldType === 'boolean') sqlType = 'boolean';
    if (fieldType === 'string[]') sqlType = 'text[]';
    if (fieldType === 'EyePower') sqlType = 'jsonb';
    if (dates.has(column)) sqlType = 'date';
    if (['created_at','last_contacted_at'].includes(column)) sqlType = 'timestamptz';
    // Frontend uses a locale-formatted time string, preserve it.
    let def = `${column} ${sqlType}${optional ? '' : ' not null'}`;
    const enumType = types.match(new RegExp('export type ' + fieldType + ' = ([\\s\\S]*?);'))?.[1] || fieldType;
    const choices = [...enumType.matchAll(/'([^']+)'/g)].map(m => "'" + m[1].replaceAll("'", "''") + "'");
    if (choices.length) def += ` check (${column} in (${choices.join(', ')}))`;
    if (fieldType === 'EyePower') def += ` check (jsonb_typeof(${column}) = 'object')`;
    if (['qty','stock_qty','min_stock_alert','total_referrals'].includes(column)) def += ` check (${column} >= 0 and ${column} = trunc(${column}))`;
    if (['gst_rate','discount_percent','commission_percent'].includes(column)) def += ` check (${column} between 0 and 100)`;
    columns.push(def);
  }
  if (table === 'invoice_items') columns.unshift('invoice_id text not null', 'line_no integer not null check (line_no > 0)');
  if (table === 'purchase_items') columns.unshift('purchase_id text not null', 'line_no integer not null check (line_no > 0)');
  if (table === 'invoices') columns.push('prescription_snapshot jsonb');
  tables[table] = columns;
}
tables.purchase_orders = ['shop_id text', 'supplier_id text not null', 'po_no text not null', 'order_date date not null default current_date', 'expected_date date', "status text not null default 'Draft' check (status in ('Draft','Ordered','Partially Received','Received','Cancelled'))", 'notes text'];
tables.purchase_order_items = ['purchase_order_id text not null','line_no integer not null check (line_no > 0)','product_id text not null','qty numeric(18,4) not null check (qty > 0)','received_qty numeric(18,4) not null default 0 check (received_qty >= 0 and received_qty <= qty)','unit_price numeric(18,4) not null check (unit_price >= 0)','gst_rate numeric(6,3) not null default 0 check (gst_rate between 0 and 100)'];
tables.purchases.push('purchase_order_id text');
tables.client_payments = ['customer_id text not null','invoice_id text','date date not null default current_date','amount numeric(18,4) not null check (amount > 0)','payment_mode text not null','payment_ref text','notes text'];
tables.supplier_payments = ['supplier_id text not null','purchase_id text','date date not null default current_date','amount numeric(18,4) not null check (amount > 0)','payment_mode text not null','payment_ref text','notes text'];
tables.stock_movements = ['product_id text not null','shop_id text','invoice_id text','purchase_id text','quantity_change numeric(18,4) not null check (quantity_change <> 0)','reason text not null','recorded_at timestamptz not null default now()'];
let sql = `-- JIYA OPTICALS: separate module tables. Paste this entire file into SQL Editor.
-- This creates schema only. It does NOT migrate optical_workspaces or change frontend queries.
-- Auth users live in auth.users; user_profiles is business/UI data, NOT authorization.
-- owner_id always denotes the signed-in store owner; staff sharing is not implemented.
-- IDs are text to support existing frontend IDs; omitted IDs receive UUID strings.
-- Empty optional dates/references must be sent as NULL, not empty strings.
-- Monetary totals/stock are NOT automatically posted by this schema.
-- Billing and purchase posting need transactional database RPCs before production use.
begin;
grant usage on schema public to authenticated;
\n`;
for (const [table, columns] of Object.entries(tables)) {
  sql += `create table if not exists public.${table} (\n  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,\n  id text not null default gen_random_uuid()::text,\n  ${columns.join(',\n  ')},\n  primary key (owner_id, id)\n);\n\n`;
}
// Composite owner foreign keys prevent links to another owner's data.
for (const [table, columns] of Object.entries(tables)) {
  for (const def of columns) {
    const col = def.split(' ')[0];
    const parent = references[col];
    // 'all' is an existing UI-only shop scope sentinel.
    if (!parent || (table === 'user_profiles' && col === 'shop_id')) continue;
    const constraint = `${table}_${col}_fk`;
    sql += `do $$ begin\n  if not exists (select 1 from pg_constraint where conname = '${constraint}' and conrelid = 'public.${table}'::regclass) then\n    alter table public.${table} add constraint ${constraint}\n      foreign key (owner_id, ${col}) references public.${parent}(owner_id, id);\n  end if;\nend $$;\n`;
    sql += `create index if not exists ${table}_${col}_idx on public.${table}(owner_id, ${col});\n`;
  }
  sql += `alter table public.${table} enable row level security;\nrevoke all on public.${table} from anon, authenticated;\ngrant select, insert, update, delete on public.${table} to authenticated;\ndrop policy if exists owner_access on public.${table};\ncreate policy owner_access on public.${table} for all to authenticated\n  using (owner_id = (select auth.uid()))\n  with check (owner_id = (select auth.uid()));\n\n`;
}
for (const [table, fields] of Object.entries({store_profiles: 'owner_id', invoices: 'owner_id, invoice_no', purchases: 'owner_id, purchase_no', purchase_orders: 'owner_id, po_no', invoice_items: 'owner_id, invoice_id, line_no', purchase_items: 'owner_id, purchase_id, line_no', purchase_order_items: 'owner_id, purchase_order_id, line_no', user_profiles: 'owner_id, username'})) {
  sql += `create unique index if not exists ${table}_business_key on public.${table}(${fields});\n`;
}
sql += "\nnotify pgrst, 'reload schema';\ncommit;\n";
fs.writeFileSync('supabase/all-tables.sql', sql);
console.log(`Generated ${Object.keys(tables).length} tables in supabase/all-tables.sql`);
