# Separate module tables

Open `all-tables.sql`, copy the entire file into Supabase SQL Editor, and run it once. It is also safe to rerun against the schema it creates. It does not upgrade unrelated pre-existing tables with the same names: investigate any existing-schema conflict instead of deleting data.

Tables: shops, store_profiles, user_profiles, suppliers, doctors, sales_staff, clients, inventory, prescriptions, invoices, invoice_items, purchases, purchase_items, expenses, whatsapp_templates, follow_ups, purchase_orders, purchase_order_items, client_payments, supplier_payments, stock_movements.

Current frontend purchases represent received supplier bills. Purchase orders and their lines are additional tables for ordering before receipt. Payment and stock movement tables support a future transaction history. Dashboard and daybook are reports, not independent source tables. Authentication continues to use Supabase's existing `auth.users` table.

This SQL is schema only. The app still reads/writes `optical_workspaces`. Running this file does not switch persistence, copy existing data, post stock movements, recalculate balances, or implement PO screens. Keep the original workspace table until a verified migration is complete.

For frontend integration, map camelCase fields to snake_case columns. Customer maps to clients, Product to inventory, and nested invoice/purchase items to their respective line tables. Prescriptions move from customer arrays to prescriptions; eye-power objects remain JSON. Invoice prescriptions are stored as immutable `prescription_snapshot` values. Empty dates and optional foreign keys must become NULL. IDs are text to preserve current frontend identifiers; a UUID string is generated when omitted. Insert parents before children; foreign keys intentionally restrict removal of referenced business records.

Each row belongs to one authenticated owner. Composite foreign keys prevent cross-owner relationships. UI user_profiles roles do not grant database access; shared staff authorization needs a separate membership design. Billing/purchase posting must use transactional database RPCs to save headers, lines, stock and balances atomically. Those RPCs are not included in this SQL-only deliverable.

Validated with embedded PostgreSQL (PGlite): all 21 tables created, script ran twice, RLS enabled on every table, anonymous reads rejected, cross-owner reads hidden, and cross-owner inserts/foreign-key links rejected. Not applied to the live Supabase project.
