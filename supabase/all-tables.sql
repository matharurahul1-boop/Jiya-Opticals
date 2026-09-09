-- JIYA OPTICALS: separate module tables. Paste this entire file into SQL Editor.
-- This creates schema only. It does NOT migrate optical_workspaces or change frontend queries.
-- Auth users live in auth.users; user_profiles is business/UI data, NOT authorization.
-- owner_id always denotes the signed-in store owner; staff sharing is not implemented.
-- IDs are text to support existing frontend IDs; omitted IDs receive UUID strings.
-- Empty optional dates/references must be sent as NULL, not empty strings.
-- Monetary totals/stock are NOT automatically posted by this schema.
-- Billing and purchase posting need transactional database RPCs before production use.
begin;
grant usage on schema public to authenticated;

create table if not exists public.shops (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  code text not null,
  tagline text,
  address text not null,
  city text not null,
  phone text not null,
  gstin text,
  is_main boolean,
  primary key (owner_id, id)
);

create table if not exists public.store_profiles (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  tagline text not null,
  address_line1 text not null,
  address_line2 text not null,
  city text not null,
  state text not null,
  pincode text not null,
  phone text not null,
  email text not null,
  gstin text not null,
  pan_no text not null,
  drug_license_no text,
  upi_id text not null,
  upi_name text not null,
  bank_name text not null,
  bank_account_no text not null,
  bank_ifsc text not null,
  invoice_prefix text not null,
  terms_and_conditions text[] not null,
  currency_symbol text not null,
  primary key (owner_id, id)
);

create table if not exists public.user_profiles (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  username text not null,
  role text not null check (role in ('Admin', 'Shop Manager', 'Optometrist', 'Cashier', 'Lab Technician')),
  shop_id text not null,
  phone text not null,
  avatar text,
  primary key (owner_id, id)
);

create table if not exists public.suppliers (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  contact_person text not null,
  mobile text not null,
  email text,
  address text,
  city text,
  gstin text not null,
  opening_balance numeric(18,4) not null,
  current_balance numeric(18,4) not null,
  category text not null,
  primary key (owner_id, id)
);

create table if not exists public.doctors (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  clinic_name text,
  qualification text not null,
  mobile text not null,
  email text,
  commission_percent numeric(18,4) not null check (commission_percent between 0 and 100),
  total_referrals numeric(18,4) not null check (total_referrals >= 0 and total_referrals = trunc(total_referrals)),
  is_active boolean not null,
  primary key (owner_id, id)
);

create table if not exists public.sales_staff (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  role text not null check (role in ('Counter Sales', 'Optometrist', 'Lab Technician', 'Store Manager')),
  mobile text not null,
  commission_percent numeric(18,4) not null check (commission_percent between 0 and 100),
  total_sales numeric(18,4) not null,
  is_active boolean not null,
  primary key (owner_id, id)
);

create table if not exists public.clients (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  name text not null,
  mobile text not null,
  email text,
  address text,
  city text,
  gstin text,
  birthday date,
  anniversary date,
  created_at timestamptz not null,
  total_spent numeric(18,4) not null,
  outstanding_balance numeric(18,4) not null,
  last_visit date,
  next_follow_up_date date,
  primary key (owner_id, id)
);

create table if not exists public.inventory (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  barcode text not null,
  name text not null,
  category text not null check (category in ('Spectacle Frame', 'Sunglasses', 'Ophthalmic Lens', 'Contact Lens', 'Lens Solution', 'Optical Accessory', 'Reading Glasses', 'Equipment / Battery')),
  brand text not null,
  model_no text not null,
  color text not null,
  frame_type text check (frame_type in ('Full Rim', 'Half Rim', 'Rimless', 'Supra', 'N/A')),
  size text,
  hsn_code text not null,
  purchase_price numeric(18,4) not null,
  mrp numeric(18,4) not null,
  sale_price numeric(18,4) not null,
  gst_rate numeric(18,4) not null check (gst_rate between 0 and 100),
  stock_qty numeric(18,4) not null check (stock_qty >= 0 and stock_qty = trunc(stock_qty)),
  min_stock_alert numeric(18,4) not null check (min_stock_alert >= 0 and min_stock_alert = trunc(min_stock_alert)),
  supplier_id text,
  location text,
  primary key (owner_id, id)
);

create table if not exists public.prescriptions (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  customer_id text not null,
  customer_name text not null,
  customer_mobile text not null,
  date date not null,
  doctor_name text not null,
  optometrist_name text,
  right_eye jsonb not null check (jsonb_typeof(right_eye) = 'object'),
  left_eye jsonb not null check (jsonb_typeof(left_eye) = 'object'),
  pd_mm text not null,
  fitting_height text,
  lens_type text not null check (lens_type in ('Single Vision', 'Bifocal', 'Progressive', 'Zero Power / Plano', 'Contact Lens')),
  lens_coating text not null check (lens_coating in ('Standard UC (Uncoated)', 'HMC (Anti-Reflective)', 'Blue Cut / Blue Block', 'Photochromic / Transition', 'Blue Cut + Photochromic', 'Polycarbonate Anti-Impact', 'Drivewear / Polarized')),
  lens_index text not null,
  notes text,
  next_checkup_date date,
  follow_up_interval text,
  primary key (owner_id, id)
);

create table if not exists public.invoices (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  shop_name text,
  invoice_no text not null,
  date date not null,
  time text not null,
  customer_id text not null,
  customer_name text not null,
  customer_mobile text not null,
  customer_email text,
  customer_address text,
  customer_gstin text,
  doctor_name text,
  salesman_name text,
  subtotal numeric(18,4) not null,
  taxable_total numeric(18,4),
  total_discount numeric(18,4) not null,
  total_tax numeric(18,4) not null,
  cgst_total numeric(18,4) not null,
  sgst_total numeric(18,4) not null,
  igst_total numeric(18,4) not null,
  fitting_total numeric(18,4) not null,
  grand_total numeric(18,4) not null,
  round_off numeric(18,4) not null,
  net_payable numeric(18,4) not null,
  advance_paid numeric(18,4) not null,
  balance_due numeric(18,4) not null,
  payment_mode text not null check (payment_mode in ('Cash', 'UPI / QR', 'Credit / Debit Card', 'Customer Credit', 'Split Payment')),
  payment_ref text,
  order_status text not null check (order_status in ('Direct Sale', 'Order Booked', 'In Progress', 'Fitting Done', 'Ready for Delivery', 'Delivered', 'Cancelled')),
  delivery_date date,
  notes text,
  prescription_snapshot jsonb,
  primary key (owner_id, id)
);

create table if not exists public.invoice_items (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  invoice_id text not null,
  line_no integer not null check (line_no > 0),
  product_id text not null,
  barcode text not null,
  name text not null,
  category text not null check (category in ('Spectacle Frame', 'Sunglasses', 'Ophthalmic Lens', 'Contact Lens', 'Lens Solution', 'Optical Accessory', 'Reading Glasses', 'Equipment / Battery')),
  hsn_code text not null,
  qty numeric(18,4) not null check (qty >= 0 and qty = trunc(qty)),
  unit_price numeric(18,4) not null,
  discount_percent numeric(18,4) not null check (discount_percent between 0 and 100),
  taxable_amount numeric(18,4) not null,
  gst_rate numeric(18,4) not null check (gst_rate between 0 and 100),
  cgst_amount numeric(18,4) not null,
  sgst_amount numeric(18,4) not null,
  igst_amount numeric(18,4) not null,
  total_amount numeric(18,4) not null,
  eye_prescription_id text,
  frame_model text,
  lens_details text,
  fitting_charge numeric(18,4),
  primary key (owner_id, id)
);

create table if not exists public.purchases (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  purchase_no text not null,
  supplier_id text not null,
  supplier_name text not null,
  supplier_bill_no text not null,
  bill_date date not null,
  subtotal numeric(18,4) not null,
  tax_amount numeric(18,4) not null,
  grand_total numeric(18,4) not null,
  paid_amount numeric(18,4) not null,
  balance_due numeric(18,4) not null,
  payment_mode text not null,
  purchase_order_id text,
  primary key (owner_id, id)
);

create table if not exists public.purchase_items (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  purchase_id text not null,
  line_no integer not null check (line_no > 0),
  product_id text not null,
  name text not null,
  barcode text not null,
  category text not null check (category in ('Spectacle Frame', 'Sunglasses', 'Ophthalmic Lens', 'Contact Lens', 'Lens Solution', 'Optical Accessory', 'Reading Glasses', 'Equipment / Battery')),
  hsn_code text not null,
  qty numeric(18,4) not null check (qty >= 0 and qty = trunc(qty)),
  purchase_rate numeric(18,4) not null,
  mrp numeric(18,4) not null,
  sale_price numeric(18,4) not null,
  gst_rate numeric(18,4) not null check (gst_rate between 0 and 100),
  total numeric(18,4) not null,
  primary key (owner_id, id)
);

create table if not exists public.expenses (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  date date not null,
  category text not null check (category in ('Shop Rent', 'Electricity', 'Staff Salary', 'Lab Fitting Charges', 'Tea & Refreshments', 'Packaging & Printing', 'Maintenance', 'Miscellaneous')),
  amount numeric(18,4) not null,
  payment_mode text not null check (payment_mode in ('Cash', 'UPI', 'Bank Transfer')),
  paid_to text not null,
  remarks text,
  primary key (owner_id, id)
);

create table if not exists public.whatsapp_templates (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null,
  category text not null check (category in ('Eye Checkup Reminder', 'Order Ready', 'Invoice Share', 'Payment Due Reminder', 'Promotional / Festive', 'Custom')),
  body text not null,
  is_default boolean,
  primary key (owner_id, id)
);

create table if not exists public.follow_ups (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  customer_id text not null,
  customer_name text not null,
  customer_mobile text not null,
  shop_id text not null,
  type text not null check (type in ('Annual Eye Checkup', '6-Month Vision Review', 'Contact Lens Refill', 'Spectacle Delivery', 'Balance Payment')),
  due_date date not null,
  status text not null check (status in ('Pending', 'Sent', 'Completed', 'Dismissed')),
  notes text,
  prescription_id text,
  invoice_id text,
  last_contacted_at timestamptz,
  primary key (owner_id, id)
);

create table if not exists public.purchase_orders (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  shop_id text,
  supplier_id text not null,
  po_no text not null,
  order_date date not null default current_date,
  expected_date date,
  status text not null default 'Draft' check (status in ('Draft','Ordered','Partially Received','Received','Cancelled')),
  notes text,
  primary key (owner_id, id)
);

create table if not exists public.purchase_order_items (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  purchase_order_id text not null,
  line_no integer not null check (line_no > 0),
  product_id text not null,
  qty numeric(18,4) not null check (qty > 0),
  received_qty numeric(18,4) not null default 0 check (received_qty >= 0 and received_qty <= qty),
  unit_price numeric(18,4) not null check (unit_price >= 0),
  gst_rate numeric(6,3) not null default 0 check (gst_rate between 0 and 100),
  primary key (owner_id, id)
);

create table if not exists public.client_payments (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  customer_id text not null,
  invoice_id text,
  date date not null default current_date,
  amount numeric(18,4) not null check (amount > 0),
  payment_mode text not null,
  payment_ref text,
  notes text,
  primary key (owner_id, id)
);

create table if not exists public.supplier_payments (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  supplier_id text not null,
  purchase_id text,
  date date not null default current_date,
  amount numeric(18,4) not null check (amount > 0),
  payment_mode text not null,
  payment_ref text,
  notes text,
  primary key (owner_id, id)
);

create table if not exists public.stock_movements (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  product_id text not null,
  shop_id text,
  invoice_id text,
  purchase_id text,
  quantity_change numeric(18,4) not null check (quantity_change <> 0),
  reason text not null,
  recorded_at timestamptz not null default now(),
  primary key (owner_id, id)
);

alter table public.shops enable row level security;
revoke all on public.shops from anon, authenticated;
grant select, insert, update, delete on public.shops to authenticated;
drop policy if exists owner_access on public.shops;
create policy owner_access on public.shops for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.store_profiles enable row level security;
revoke all on public.store_profiles from anon, authenticated;
grant select, insert, update, delete on public.store_profiles to authenticated;
drop policy if exists owner_access on public.store_profiles;
create policy owner_access on public.store_profiles for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from anon, authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
drop policy if exists owner_access on public.user_profiles;
create policy owner_access on public.user_profiles for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.suppliers enable row level security;
revoke all on public.suppliers from anon, authenticated;
grant select, insert, update, delete on public.suppliers to authenticated;
drop policy if exists owner_access on public.suppliers;
create policy owner_access on public.suppliers for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.doctors enable row level security;
revoke all on public.doctors from anon, authenticated;
grant select, insert, update, delete on public.doctors to authenticated;
drop policy if exists owner_access on public.doctors;
create policy owner_access on public.doctors for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.sales_staff enable row level security;
revoke all on public.sales_staff from anon, authenticated;
grant select, insert, update, delete on public.sales_staff to authenticated;
drop policy if exists owner_access on public.sales_staff;
create policy owner_access on public.sales_staff for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_shop_id_fk' and conrelid = 'public.clients'::regclass) then
    alter table public.clients add constraint clients_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists clients_shop_id_idx on public.clients(owner_id, shop_id);
alter table public.clients enable row level security;
revoke all on public.clients from anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
drop policy if exists owner_access on public.clients;
create policy owner_access on public.clients for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_shop_id_fk' and conrelid = 'public.inventory'::regclass) then
    alter table public.inventory add constraint inventory_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists inventory_shop_id_idx on public.inventory(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_supplier_id_fk' and conrelid = 'public.inventory'::regclass) then
    alter table public.inventory add constraint inventory_supplier_id_fk
      foreign key (owner_id, supplier_id) references public.suppliers(owner_id, id);
  end if;
end $$;
create index if not exists inventory_supplier_id_idx on public.inventory(owner_id, supplier_id);
alter table public.inventory enable row level security;
revoke all on public.inventory from anon, authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
drop policy if exists owner_access on public.inventory;
create policy owner_access on public.inventory for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'prescriptions_shop_id_fk' and conrelid = 'public.prescriptions'::regclass) then
    alter table public.prescriptions add constraint prescriptions_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists prescriptions_shop_id_idx on public.prescriptions(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'prescriptions_customer_id_fk' and conrelid = 'public.prescriptions'::regclass) then
    alter table public.prescriptions add constraint prescriptions_customer_id_fk
      foreign key (owner_id, customer_id) references public.clients(owner_id, id);
  end if;
end $$;
create index if not exists prescriptions_customer_id_idx on public.prescriptions(owner_id, customer_id);
alter table public.prescriptions enable row level security;
revoke all on public.prescriptions from anon, authenticated;
grant select, insert, update, delete on public.prescriptions to authenticated;
drop policy if exists owner_access on public.prescriptions;
create policy owner_access on public.prescriptions for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_shop_id_fk' and conrelid = 'public.invoices'::regclass) then
    alter table public.invoices add constraint invoices_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists invoices_shop_id_idx on public.invoices(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_customer_id_fk' and conrelid = 'public.invoices'::regclass) then
    alter table public.invoices add constraint invoices_customer_id_fk
      foreign key (owner_id, customer_id) references public.clients(owner_id, id);
  end if;
end $$;
create index if not exists invoices_customer_id_idx on public.invoices(owner_id, customer_id);
alter table public.invoices enable row level security;
revoke all on public.invoices from anon, authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
drop policy if exists owner_access on public.invoices;
create policy owner_access on public.invoices for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_invoice_id_fk' and conrelid = 'public.invoice_items'::regclass) then
    alter table public.invoice_items add constraint invoice_items_invoice_id_fk
      foreign key (owner_id, invoice_id) references public.invoices(owner_id, id);
  end if;
end $$;
create index if not exists invoice_items_invoice_id_idx on public.invoice_items(owner_id, invoice_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_product_id_fk' and conrelid = 'public.invoice_items'::regclass) then
    alter table public.invoice_items add constraint invoice_items_product_id_fk
      foreign key (owner_id, product_id) references public.inventory(owner_id, id);
  end if;
end $$;
create index if not exists invoice_items_product_id_idx on public.invoice_items(owner_id, product_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoice_items_eye_prescription_id_fk' and conrelid = 'public.invoice_items'::regclass) then
    alter table public.invoice_items add constraint invoice_items_eye_prescription_id_fk
      foreign key (owner_id, eye_prescription_id) references public.prescriptions(owner_id, id);
  end if;
end $$;
create index if not exists invoice_items_eye_prescription_id_idx on public.invoice_items(owner_id, eye_prescription_id);
alter table public.invoice_items enable row level security;
revoke all on public.invoice_items from anon, authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
drop policy if exists owner_access on public.invoice_items;
create policy owner_access on public.invoice_items for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchases_shop_id_fk' and conrelid = 'public.purchases'::regclass) then
    alter table public.purchases add constraint purchases_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists purchases_shop_id_idx on public.purchases(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchases_supplier_id_fk' and conrelid = 'public.purchases'::regclass) then
    alter table public.purchases add constraint purchases_supplier_id_fk
      foreign key (owner_id, supplier_id) references public.suppliers(owner_id, id);
  end if;
end $$;
create index if not exists purchases_supplier_id_idx on public.purchases(owner_id, supplier_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchases_purchase_order_id_fk' and conrelid = 'public.purchases'::regclass) then
    alter table public.purchases add constraint purchases_purchase_order_id_fk
      foreign key (owner_id, purchase_order_id) references public.purchase_orders(owner_id, id);
  end if;
end $$;
create index if not exists purchases_purchase_order_id_idx on public.purchases(owner_id, purchase_order_id);
alter table public.purchases enable row level security;
revoke all on public.purchases from anon, authenticated;
grant select, insert, update, delete on public.purchases to authenticated;
drop policy if exists owner_access on public.purchases;
create policy owner_access on public.purchases for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_items_purchase_id_fk' and conrelid = 'public.purchase_items'::regclass) then
    alter table public.purchase_items add constraint purchase_items_purchase_id_fk
      foreign key (owner_id, purchase_id) references public.purchases(owner_id, id);
  end if;
end $$;
create index if not exists purchase_items_purchase_id_idx on public.purchase_items(owner_id, purchase_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_items_product_id_fk' and conrelid = 'public.purchase_items'::regclass) then
    alter table public.purchase_items add constraint purchase_items_product_id_fk
      foreign key (owner_id, product_id) references public.inventory(owner_id, id);
  end if;
end $$;
create index if not exists purchase_items_product_id_idx on public.purchase_items(owner_id, product_id);
alter table public.purchase_items enable row level security;
revoke all on public.purchase_items from anon, authenticated;
grant select, insert, update, delete on public.purchase_items to authenticated;
drop policy if exists owner_access on public.purchase_items;
create policy owner_access on public.purchase_items for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_shop_id_fk' and conrelid = 'public.expenses'::regclass) then
    alter table public.expenses add constraint expenses_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists expenses_shop_id_idx on public.expenses(owner_id, shop_id);
alter table public.expenses enable row level security;
revoke all on public.expenses from anon, authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
drop policy if exists owner_access on public.expenses;
create policy owner_access on public.expenses for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter table public.whatsapp_templates enable row level security;
revoke all on public.whatsapp_templates from anon, authenticated;
grant select, insert, update, delete on public.whatsapp_templates to authenticated;
drop policy if exists owner_access on public.whatsapp_templates;
create policy owner_access on public.whatsapp_templates for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'follow_ups_customer_id_fk' and conrelid = 'public.follow_ups'::regclass) then
    alter table public.follow_ups add constraint follow_ups_customer_id_fk
      foreign key (owner_id, customer_id) references public.clients(owner_id, id);
  end if;
end $$;
create index if not exists follow_ups_customer_id_idx on public.follow_ups(owner_id, customer_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'follow_ups_shop_id_fk' and conrelid = 'public.follow_ups'::regclass) then
    alter table public.follow_ups add constraint follow_ups_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists follow_ups_shop_id_idx on public.follow_ups(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'follow_ups_prescription_id_fk' and conrelid = 'public.follow_ups'::regclass) then
    alter table public.follow_ups add constraint follow_ups_prescription_id_fk
      foreign key (owner_id, prescription_id) references public.prescriptions(owner_id, id);
  end if;
end $$;
create index if not exists follow_ups_prescription_id_idx on public.follow_ups(owner_id, prescription_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'follow_ups_invoice_id_fk' and conrelid = 'public.follow_ups'::regclass) then
    alter table public.follow_ups add constraint follow_ups_invoice_id_fk
      foreign key (owner_id, invoice_id) references public.invoices(owner_id, id);
  end if;
end $$;
create index if not exists follow_ups_invoice_id_idx on public.follow_ups(owner_id, invoice_id);
alter table public.follow_ups enable row level security;
revoke all on public.follow_ups from anon, authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
drop policy if exists owner_access on public.follow_ups;
create policy owner_access on public.follow_ups for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_orders_shop_id_fk' and conrelid = 'public.purchase_orders'::regclass) then
    alter table public.purchase_orders add constraint purchase_orders_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists purchase_orders_shop_id_idx on public.purchase_orders(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_orders_supplier_id_fk' and conrelid = 'public.purchase_orders'::regclass) then
    alter table public.purchase_orders add constraint purchase_orders_supplier_id_fk
      foreign key (owner_id, supplier_id) references public.suppliers(owner_id, id);
  end if;
end $$;
create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders(owner_id, supplier_id);
alter table public.purchase_orders enable row level security;
revoke all on public.purchase_orders from anon, authenticated;
grant select, insert, update, delete on public.purchase_orders to authenticated;
drop policy if exists owner_access on public.purchase_orders;
create policy owner_access on public.purchase_orders for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_order_items_purchase_order_id_fk' and conrelid = 'public.purchase_order_items'::regclass) then
    alter table public.purchase_order_items add constraint purchase_order_items_purchase_order_id_fk
      foreign key (owner_id, purchase_order_id) references public.purchase_orders(owner_id, id);
  end if;
end $$;
create index if not exists purchase_order_items_purchase_order_id_idx on public.purchase_order_items(owner_id, purchase_order_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'purchase_order_items_product_id_fk' and conrelid = 'public.purchase_order_items'::regclass) then
    alter table public.purchase_order_items add constraint purchase_order_items_product_id_fk
      foreign key (owner_id, product_id) references public.inventory(owner_id, id);
  end if;
end $$;
create index if not exists purchase_order_items_product_id_idx on public.purchase_order_items(owner_id, product_id);
alter table public.purchase_order_items enable row level security;
revoke all on public.purchase_order_items from anon, authenticated;
grant select, insert, update, delete on public.purchase_order_items to authenticated;
drop policy if exists owner_access on public.purchase_order_items;
create policy owner_access on public.purchase_order_items for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'client_payments_customer_id_fk' and conrelid = 'public.client_payments'::regclass) then
    alter table public.client_payments add constraint client_payments_customer_id_fk
      foreign key (owner_id, customer_id) references public.clients(owner_id, id);
  end if;
end $$;
create index if not exists client_payments_customer_id_idx on public.client_payments(owner_id, customer_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'client_payments_invoice_id_fk' and conrelid = 'public.client_payments'::regclass) then
    alter table public.client_payments add constraint client_payments_invoice_id_fk
      foreign key (owner_id, invoice_id) references public.invoices(owner_id, id);
  end if;
end $$;
create index if not exists client_payments_invoice_id_idx on public.client_payments(owner_id, invoice_id);
alter table public.client_payments enable row level security;
revoke all on public.client_payments from anon, authenticated;
grant select, insert, update, delete on public.client_payments to authenticated;
drop policy if exists owner_access on public.client_payments;
create policy owner_access on public.client_payments for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'supplier_payments_supplier_id_fk' and conrelid = 'public.supplier_payments'::regclass) then
    alter table public.supplier_payments add constraint supplier_payments_supplier_id_fk
      foreign key (owner_id, supplier_id) references public.suppliers(owner_id, id);
  end if;
end $$;
create index if not exists supplier_payments_supplier_id_idx on public.supplier_payments(owner_id, supplier_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'supplier_payments_purchase_id_fk' and conrelid = 'public.supplier_payments'::regclass) then
    alter table public.supplier_payments add constraint supplier_payments_purchase_id_fk
      foreign key (owner_id, purchase_id) references public.purchases(owner_id, id);
  end if;
end $$;
create index if not exists supplier_payments_purchase_id_idx on public.supplier_payments(owner_id, purchase_id);
alter table public.supplier_payments enable row level security;
revoke all on public.supplier_payments from anon, authenticated;
grant select, insert, update, delete on public.supplier_payments to authenticated;
drop policy if exists owner_access on public.supplier_payments;
create policy owner_access on public.supplier_payments for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_movements_product_id_fk' and conrelid = 'public.stock_movements'::regclass) then
    alter table public.stock_movements add constraint stock_movements_product_id_fk
      foreign key (owner_id, product_id) references public.inventory(owner_id, id);
  end if;
end $$;
create index if not exists stock_movements_product_id_idx on public.stock_movements(owner_id, product_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_movements_shop_id_fk' and conrelid = 'public.stock_movements'::regclass) then
    alter table public.stock_movements add constraint stock_movements_shop_id_fk
      foreign key (owner_id, shop_id) references public.shops(owner_id, id);
  end if;
end $$;
create index if not exists stock_movements_shop_id_idx on public.stock_movements(owner_id, shop_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_movements_invoice_id_fk' and conrelid = 'public.stock_movements'::regclass) then
    alter table public.stock_movements add constraint stock_movements_invoice_id_fk
      foreign key (owner_id, invoice_id) references public.invoices(owner_id, id);
  end if;
end $$;
create index if not exists stock_movements_invoice_id_idx on public.stock_movements(owner_id, invoice_id);
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'stock_movements_purchase_id_fk' and conrelid = 'public.stock_movements'::regclass) then
    alter table public.stock_movements add constraint stock_movements_purchase_id_fk
      foreign key (owner_id, purchase_id) references public.purchases(owner_id, id);
  end if;
end $$;
create index if not exists stock_movements_purchase_id_idx on public.stock_movements(owner_id, purchase_id);
alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from anon, authenticated;
grant select, insert, update, delete on public.stock_movements to authenticated;
drop policy if exists owner_access on public.stock_movements;
create policy owner_access on public.stock_movements for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create unique index if not exists store_profiles_business_key on public.store_profiles(owner_id);
create unique index if not exists invoices_business_key on public.invoices(owner_id, invoice_no);
create unique index if not exists purchases_business_key on public.purchases(owner_id, purchase_no);
create unique index if not exists purchase_orders_business_key on public.purchase_orders(owner_id, po_no);
create unique index if not exists invoice_items_business_key on public.invoice_items(owner_id, invoice_id, line_no);
create unique index if not exists purchase_items_business_key on public.purchase_items(owner_id, purchase_id, line_no);
create unique index if not exists purchase_order_items_business_key on public.purchase_order_items(owner_id, purchase_order_id, line_no);
create unique index if not exists user_profiles_business_key on public.user_profiles(owner_id, username);

notify pgrst, 'reload schema';
commit;
