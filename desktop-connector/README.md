# Drishti desktop connector

This is a configurable Windows connector, not a verified Drishti vendor API integration. The customer's actual database/export format has not been supplied. Configure and test the real source before enabling startup. Nothing has been installed on the customer's computer yet.

## What works

- Reads a CSV export folder/file, or polls a database through a supplied read-only ODBC connection and SELECT query.
- Maps source columns to inventory fields, preserving original barcode/QR text, case and leading zeroes.
- Uploads new/changed items directly to Supabase using the signed-in business owner account, because material details are shared across shops. A shop member cannot change the common catalogue through the connector. No service-role key or custom web server.
- Matches future updates by source installation ID + source item ID + shop. Retries are idempotent. Duplicate codes and changed original codes are rejected for review.
- Keeps the original ERP item ID and existing ERP stock on catalog updates. New items get their initial source stock; later source stock is stored separately as drishtiStockQty.
- Runs at Windows sign-in when installed, retries failures with backoff, and checkpoints only acknowledged batches. A failed batch rolls back completely; prior successful batches remain saved.

## Before installation

1. Run the included LIVE_SETUP.sql in Supabase SQL Editor. VERIFY_LIVE.sql is a read-only audit; all rows should show PASS.
2. Create a shop in the app. Create a separate verified app account for the connector and assign it only to that shop using Team & Access. You may use an owner account, but the dedicated account has less access.
3. Extract this package into a permanent local folder, e.g. C:\JiyaDrishtiSync. Use a separate folder for each connector/shop. Do not run from a ZIP or a shared folder accessible to other people.
4. In the app, open Inventory, select the shop, expand Drishti desktop sync and download config.json into this folder. Alternatively copy config.example.json to config.json and fill the public Supabase URL/key, teamOwner and shopId.
5. Ask the Drishti vendor/operator for a sample item export OR the supported database, read-only credentials, driver and exact item query. The example table/column names are examples, not discovered Drishti schema names.

## Source configuration

### CSV

Set source.mode to csv and source.path to the export file or folder. A folder uses the newest file matching source.pattern. Configure delimiter and encoding. Exports must be finished writing before they are read. Default mapping is demonstrated by sample-items.csv; never upload these test items to the real shop.

CSV mode is automatic ONLY when Drishti or its operator writes a new export. This connector does not operate Drishti's UI or schedule exports inside Drishti. Without automatic export, each new manual export will trigger synchronization, but entering an item alone will not.

### Database polling

Set source.mode to odbc and source.query to one SELECT using the actual tables and fields confirmed by the vendor. Install the appropriate ODBC driver and use a database account limited to SELECT. The connector rejects obvious write queries and never intentionally writes to Drishti; database permissions are the actual read-only guarantee. Match 32/64-bit PowerShell to the installed driver.

Use Setup-Connector.ps1 to enter the connection string securely. It is stored encrypted for the same Windows user/machine. Do not put database passwords into config.json, the query or a shared DSN. An example generic DSN connection format is DSN=YourReadOnlyDSN;UID=your_user;PWD=your_password; -- replace with your driver's documented syntax.

Polls use full query results and upload changed items. A new record becomes eligible when Drishti commits it. Polling does not capture records created and deleted between polls. There is no delete propagation or reverse write-back.

### Field mapping

columns maps target field names to EXACT source headers/SELECT aliases. Required fields are externalId, barcode, name, purchasePrice, mrp, salePrice and stockQty. Optional qrCode stores a separate QR payload if the sticker uses one. If Drishti only has one encoded code, map it to barcode and remove qrCode from columns.

Other supported fields: category, brand, modelNo, color, frameType, size, hsnCode, gstRate, minStockAlert, location. Use explicit defaults for fields absent from the source; do not invent prices. Category must be one of the app's categories, e.g. Spectacle Frame or Sunglasses. Normalize vendor category names in the SELECT or export. Numeric values use an invariant decimal point. Zero prices/stock/tax remain zero.

Code columns MUST be strings. If the database stores them numerically, ask the vendor how sticker formatting works and use the correct text expression in the SELECT. Do not guess zero-padding. QR URLs/text are treated as literal identifiers and never fetched. sourceId must remain stable for this Drishti installation.

## Start

Use Windows PowerShell in the extracted folder. Review the scripts first. If Windows marks downloaded scripts as blocked, unblock the trusted scripts using file Properties or Unblock-File, or have your administrator sign/allow them according to company policy.

```powershell
.\Setup-Connector.ps1
.\Sync-Drishti.ps1 -Preview
.\Sync-Drishti.ps1 -Once
.\Install-Startup.ps1
```

Setup asks for the APP account, not the Drishti login. It verifies target-shop permission without importing items. Preview reads and validates the source, showing only five sample items; it makes no cloud writes. Once uploads changed items. Install-Startup registers and starts a hidden task for this Windows user at logon. Keep the computer awake and the user signed in. Windows PowerShell is sufficient; Node/Python is not required on the client desktop.

Session tokens and ODBC secrets use Windows user-bound encryption. Keep .state private; do not email it. Copying it to another user or computer will not work. Run Setup again if the app account/session changes. The source and network must be available to the signed-in Windows user, including any network drives.

## Check, stop, recover

- .state/status.json reports the latest local poll. Background failures omit raw credentials/data. Run -Once interactively to diagnose mapping/authentication errors.
- Inventory shows linked item IDs and the last imported-item timestamp, not a guaranteed online indicator. Idle app screens refresh approximately every 30 seconds; unsaved conflicts require review/reload.
- Remove startup with `.\Install-Startup.ps1 -Remove`, then stop its running instance in Task Scheduler if needed. Stop a foreground run with Ctrl+C.
- To reconcile all current source items again, stop the background task and run `.\Sync-Drishti.ps1 -Once -ResetCheckpoint`. No item deletions are sent. A missing ERP item can then be recreated from the source.
- Do not change sourceId to resolve a mapping failure: this would introduce a different source identity. Fix the mapping after reviewing the specific source item instead.
- If the same code already exists as an unlinked manual item, the import is rejected rather than silently replacing that record. Resolve that mapping deliberately before rerunning.

## Scanner and printer

At billing, choose a customer and scan the existing Drishti sticker using the camera or a keyboard-mode USB scanner (Enter suffix). The item must already be synchronized into the selected shop. Camera scanning needs HTTPS or localhost and permission. QR requires a 2D-capable scanner; a 1D-only scanner cannot decode QR symbols.

The app can print a real QR label encoding the original payload. This is not a byte-for-byte recreation of a Drishti barcode label or printer job. Select the TSC TTP-244 Pro's installed driver, 100% scale, and correct label size in the print dialog. Actual label dimensions, printer calibration and the physical camera/scanner must be tested at the customer's desk. Original Drishti labels do not need replacing.

## Limits and deployment status

This is one-way item/catalog sync. It does not synchronize sales back to Drishti, synchronize stock both ways, copy prescriptions/customers, scrape passwords, capture printer spool data, or expose inventory publicly. Simultaneous ERP writes remain protected by the existing version conflict checks.

The actual Drishti database, read-only SELECT, source field mapping, Supabase deployment, Windows startup task and printer hardware still need on-site configuration/verification. Local automated tests cover CSV parsing, original-code preservation, duplicate rejection, permission isolation, atomic batches, repeat uploads, stock preservation and generated QR decoding.
