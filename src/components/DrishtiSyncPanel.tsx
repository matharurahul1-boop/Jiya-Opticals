import { t } from '../lib/i18n';
import React from 'react';
import {
  ScanLine,
  Download,
  Boxes,
  Clock,
  QrCode,
  CheckCircle2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export function DrishtiSyncPanel() {
  const { ownerId, isCloud, shops, selectedShopFilter, products } = useApp();
  const shopId = selectedShopFilter === 'all' && shops.length === 1 ? shops[0].id : selectedShopFilter;
  const mapped = products.filter((p) => p.shopId === shopId && p.drishtiItemId);
  const last = mapped.map((p) => p.drishtiSyncedAt || '').sort().at(-1);
  const withQr = mapped.filter((p) => p.barcode || p.qrCode).length;

  const downloadConfig = () => {
    const config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      teamOwner: ownerId,
      shopId,
      sourceId: 'drishti-main',
      pollSeconds: 30,
      source: {
        mode: 'csv',
        path: 'C:\\DrishtiExports',
        pattern: 'items*.csv',
        delimiter: ',',
        encoding: 'UTF8',
        query:
          'SELECT ItemId, Barcode, QRCode, ItemName, Brand, Model, PurchasePrice, MRP, SalePrice, StockQty FROM YOUR_ITEM_TABLE',
        maxRows: 50000
      },
      columns: {
        externalId: 'ItemId',
        barcode: 'Barcode',
        qrCode: 'QRCode',
        name: 'ItemName',
        brand: 'Brand',
        modelNo: 'Model',
        purchasePrice: 'PurchasePrice',
        mrp: 'MRP',
        salePrice: 'SalePrice',
        stockQty: 'StockQty'
      },
      defaults: {
        category: 'Spectacle Frame',
        color: '',
        frameType: 'N/A',
        size: '',
        hsnCode: '',
        gstRate: 0,
        minStockAlert: 0,
        location: ''
      }
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const shopName = shops.find((s) => s.id === shopId)?.name;

  const stats = [
    { label: 'Linked items', value: mapped.length, icon: Boxes, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
    { label: 'With barcode / QR', value: withQr, icon: QrCode, tone: 'text-teal-700 bg-teal-50 border-teal-200' },
    {
      label: 'Last item update',
      value: last ? new Date(last).toLocaleString() : '—',
      icon: Clock,
      tone: 'text-sky-700 bg-sky-50 border-sky-200',
      small: true
    }
  ];

  const steps = [
    'In Supabase SQL Editor run team-access.sql, then drishti-sync.sql.',
    'On the Drishti computer, download and extract the Windows connector below.',
    'Download this shop’s config.json into that folder. Set the real CSV export path (or a read-only ODBC SELECT) and the exact Drishti column names.',
    'Run Setup-Connector.ps1 → validate with Sync-Drishti.ps1 -Preview → then -Once → install background sync with Install-Startup.ps1.'
  ];

  return (
    <section className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-sm shadow-amber-600/30">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-stone-900">{t("Drishti Desktop Sync")}</h1>
            <p className="text-sm text-stone-500">
              {t("Pulls ")}<strong className="text-stone-700">{t("items and their barcode / QR codes")}</strong> {t("from the Drishti software on the shop computer into this catalogue. ")}{shopName ? `Branch: ${shopName}.` : ''}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" /> {t("Catalogue sync only ")}</span>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.tone}`}>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-80">
                <Icon className="w-4 h-4" /> {s.label}
              </div>
              <div className={`mt-1.5 font-bold text-stone-900 ${s.small ? 'text-sm' : 'text-2xl'}`}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Live status note */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 flex items-start gap-3">
        <RefreshCw className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-stone-600">
          <p className="font-semibold text-stone-800">{t("New items appear automatically")}</p>
          <p>
            {t("Once the connector is running on the Drishti computer, items created or edited there show up here within about 30 seconds — no button needed. The number above is the last import time received from the cloud, not a live desktop heartbeat. ")}</p>
        </div>
      </div>

      {/* Setup */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 space-y-4">
        <h2 className="font-bold text-stone-900">{t("One-time setup on the Drishti computer")}</h2>
        <ol className="space-y-2.5">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-stone-700">
              <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-3 pt-1">
          <a
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
            href={`${import.meta.env.BASE_URL}drishti-connector.zip`}
            download
          >
            <Download className="w-4 h-4" /> {t("Download Windows connector ")}</a>
          <button
            disabled={!isCloud || !shopId || shopId === 'all'}
            onClick={downloadConfig}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> {t("Download this shop’s config.json ")}</button>
        </div>

        {(!shopId || shopId === 'all') && (
          <p className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4" /> {t("Select a single branch (top bar) before downloading the configuration. ")}</p>
        )}
        {!isCloud && (
          <p className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4" /> {t("Sign in to the cloud workspace to generate a connector configuration. ")}</p>
        )}
      </div>

      <p className="text-xs text-stone-500">
        {t("CSV mode syncs whenever Drishti writes a fresh export. ODBC mode polls the Drishti database directly once a read-only SELECT and credentials are configured. Existing ERP stock is preserved — this is a one-way catalogue import, not two-way sales or stock sync. Keep the original Drishti stickers; their barcode and QR values are matched to this shop’s inventory when scanned at billing. ")}</p>
    </section>
  );
}
