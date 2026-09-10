# Live setup

## Shared materials update

Run the updated LIVE_SETUP.sql before using this build. It includes the non-retrying PT409 save-conflict fix and the private shared-catalogue helper. Then reload as the admin and wait for Saved to Supabase: matching legacy materials are linked without changing historical stock-row IDs or quantities. Identical codes within the same shop, or conflicting descriptions, are not automatically merged.

Create Material is an admin action performed once. Each material has a common catalogId and a stock row in each shop; new shop rows start at zero. Barcode, name, brand, specifications and selling price are shared; stock quantity, purchase cost and rack are per shop. Invoice/purchase item IDs still identify the correct shop stock row. Existing JSON storage remains in use; catalogId is a product JSON field, not a missing SQL column.

Inventory shows a consolidated material row with per-shop quantities. Select the billing shop before selling, and the receiving shop on the purchase form. Stock transfer changes both quantities together. Members can operate only assigned shops and cannot edit shared material definitions. Drishti imports make the common material available across shops while only the source shop receives opening stock.

The previous live API smoke test passed normal persistence and assigned-shop isolation but timed out on the old conflict SQL. This newer shared-material build and PT409 fix have local test coverage; they have not been applied or retested on the live project through the unavailable management connection.

1. Paste the complete LIVE_SETUP.sql into Supabase SQL Editor and run it. It combines team-access.sql, users-directory.sql and drishti-sync.sql in one transaction. Existing data is preserved; run this bundle last, not the older scripts afterwards.
2. Run VERIFY_LIVE.sql. All 30 checks should say PASS. If any row says MISSING, TYPE MISMATCH or a permission error, resolve that result before going live. This is a read-only check; it cannot test email delivery, sign-in flows or Drishti hardware.
3. Enable the Email auth provider/sign-ups and configure the Site URL plus allowed confirmation redirect URLs for the real hosted app. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the hosting environment and rebuild. Never use a service-role/secret key.
4. Confirm an admin can create a shop, create a client/item, save and reload. Confirm a second verified account assigned to one shop cannot see another shop. Test a bill and dated payment.
5. For Drishti, download the Windows connector from Inventory, configure the REAL source/export columns, run Preview, then Once, and scan one physical existing Drishti sticker. Startup installation on the customer's PC is a separate action.

## Active schema

- optical_workspaces: owner_id, data, version
- optical_team_members: owner_id, email, shop_ids
- optical_user_directory: id, email, full_name, username, phone, updated_at, created_at
- optical_member_role: owner_id, email, role

The running app currently stores business records in the workspace JSON. Drishti metadata (qrCode, drishtiSourceId, drishtiItemId, drishtiHash, drishtiStockQty and drishtiSyncedAt) lives inside product JSON, not separate SQL columns. The 21-table all-tables.sql schema is optional and is not wired into this frontend. Do not mistake creating those tables for migrating the app's data layer.

RPCs installed: optical_team_list, optical_team_create, optical_team_load, optical_team_save, optical_team_members, optical_team_assign, optical_user_sync, optical_team_users, optical_member_set_role, optical_drishti_import.

The account owning the business is the administrator. Stored member role labels do not grant ownership or bypass assigned-shop restrictions. The current database write authorization is assigned-shop operational access; it is not a granular per-feature role-permission system.

Local verification covers installation twice, an upgrade from setup.sql, the 30 schema checks, profile upserts, member roles, shop isolation and sync behavior. The connected tool could not read the live project due to missing project permission, so live schema parity remains unverified until VERIFY_LIVE.sql is run there.
