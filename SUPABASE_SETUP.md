# Shops, admin and team sign-in

## One-time Supabase setup

1. Run the entire `supabase/LIVE_SETUP.sql` file in Supabase SQL Editor, then run `supabase/VERIFY_LIVE.sql` and confirm all 30 checks pass. The bundle includes workspace, team, user profile/role and Drishti sync support and preserves existing workspace data. Run it even if you previously ran older SQL files; do not run those older scripts afterwards. See `supabase/LIVE_README.md` for the deployment checklist.
2. Keep your project URL and public anon/publishable key in .env.local. Never use a service-role/secret key in this frontend.
3. Enable email sign-ups in Supabase Authentication. Configure Site URL and allowed redirect URLs for the deployed app and http://localhost:3000 during development.
4. Run npm install, then npm run dev. Restart Vite after changing environment variables.

## Admin workflow

Sign up, confirm the email if required, and sign in. Choose Create business. A new business starts without demo customers or demo shops. Create the first shop in the welcome screen. Use Shops to create additional branches and Team & Access to assign a member's email to one or more shops. Wait for Saved to Supabase before saving an assignment. Successful assignment reloads the app so it has the new access version.

The business creator is its admin and sees all branches. Dashboard offers all-shop and individual-shop filters. Operational screens ask for a specific shop when multiple branches exist. The old local role switcher is disabled in cloud mode: an authenticated member cannot become admin by selecting a UI role.

## Team workflow

Members sign up and verify the exact email assigned by the admin. They sign in and use Refresh access if needed. No invitation email is sent by the assignment screen. If the member belongs to multiple businesses, they select one after sign-in. An account may own its own separate business and still be a member of another business.

Team members have operational access to the shops assigned to them. They cannot manage shops, business-wide masters, or team access. Admin assignments can be edited or removed. Unassigned and unverified emails cannot read the business. Database permission checks run on every load/save. Open sessions check for changed data or permissions every 30 seconds and require reload. Data already viewed cannot be retracted from a person's device.

## Dashboard and receipts

The monthly grouped bar chart shows revenue by bill month, receipts by actual payment month (including payments against older bills), and CURRENT unpaid balances grouped by bill month. The pending series is not a historical month-end balance. Choose a year and shop; all-shop totals combine accessible shops only. A table provides the exact amounts.

New bill advances and subsequent collections create dated payment records. Customer-level collections are allocated against oldest unpaid, non-cancelled invoices, with any opening-balance remainder recorded separately. Existing legacy receipts lack dates: the chart flags their amount and excludes them from dated collections instead of inventing dates. No refund/credit-note accounting is implemented by this change.

## Storage and concurrency

The application continues using the existing versioned JSON workspace, accessed directly through Supabase database RPCs. No middleware, application server or Edge Function is needed. Team assignments are in optical_team_members. The optional 21-table SQL file is not wired into the running frontend and does not replace this storage.

The protected private SQL functions check the signed-in user and verified account email. Public RPC wrappers use security invoker. Raw workspace/member tables have RLS and no direct browser grants. Member responses contain assigned-shop records only; saves merge those records while preserving other shops and admin settings. Admin access depends on auth.uid(), never on user-editable metadata or client role state.

Writes save related state atomically and use a version check. Concurrent edits, including to different shops, may require download/reload/re-entry; there is no automatic conflict merge. Wait for the save indicator before closing. Existing unassigned legacy records remain admin-only. Do not delete the existing workspace table or rerun the older owner-only grants as a substitute for team-access.sql.

## Verification

npm test covers SQL installation/reinstallation, owner/member isolation, direct-read rejection, unauthorized assignments, cross-shop write rejection, multi-shop access, conflict detection, unverified accounts, revocation, and month/year/branch revenue calculations. npm run lint and npm run build check the frontend.

Local PostgreSQL tests use PGlite; they do not modify your live project. Live activation requires running the SQL above. Then sign in as admin, create two shops, assign a second verified account to only one shop, add bills/payments and verify the member cannot see the other branch. Test removing the member's access and reload. Supabase confirmation email delivery requires testing with real accounts and is not covered by local tests.
