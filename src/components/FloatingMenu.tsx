import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  X,
  Home,
  Receipt,
  Eye,
  Package,
  Users,
  Send,
  Truck,
  Wallet,
  ScanLine,
  Building,
  Settings,
  ScanBarcode
} from 'lucide-react';
import { NavTab, useApp } from '../context/AppContext';

interface MenuItem {
  id: NavTab;
  label: string;
  labelHi: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/**
 * Mobile primary navigation. On phones this replaces the bottom tab bar:
 * one floating button opens a sheet with every screen the user can access.
 * Hidden on desktop (md+), where the left sidebar is the navigation.
 */
export const FloatingMenu: React.FC = () => {
  const {
    language,
    canAccessTab,
    activeTab,
    setActiveTab,
    openCameraScanner,
    triggerBarcodeScan,
    products,
    customers,
    followUps,
    selectedShopFilter,
    dueFollowUpsCount
  } = useApp();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const lowStock = products.filter(
    (p) => (selectedShopFilter === 'all' || p.shopId === selectedShopFilter) && p.stockQty <= p.minStockAlert
  ).length;
  const dues = customers.filter(
    (c) => (selectedShopFilter === 'all' || c.shopId === selectedShopFilter) && c.outstandingBalance > 0
  ).length;
  const pendingFollowUps = followUps.filter(
    (f) => (selectedShopFilter === 'all' || f.shopId === selectedShopFilter) && f.status === 'Pending'
  ).length;

  const all: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: Home },
    { id: 'billing', label: 'POS Billing', labelHi: 'बिलिंग', icon: Receipt },
    { id: 'eyetesting', label: 'Eye Testing', labelHi: 'नेत्र परीक्षण', icon: Eye },
    { id: 'inventory', label: 'Inventory', labelHi: 'स्टॉक', icon: Package, badge: lowStock },
    { id: 'customers', label: 'Customers', labelHi: 'ग्राहक', icon: Users, badge: dues },
    { id: 'followups', label: 'Follow-ups', labelHi: 'फॉलोअप', icon: Send, badge: pendingFollowUps },
    { id: 'purchases', label: 'Purchases', labelHi: 'खरीद', icon: Truck },
    { id: 'daybook', label: 'Day Book', labelHi: 'बहीखाता', icon: Wallet },
    { id: 'drishti', label: 'Drishti Sync', labelHi: 'दृष्टि सिंक', icon: ScanLine },
    { id: 'shops', label: 'Shops', labelHi: 'दुकानें', icon: Building },
    { id: 'team', label: 'Team & Access', labelHi: 'टीम', icon: Users },
    { id: 'masters', label: 'Masters & Settings', labelHi: 'मास्टर व सेटिंग', icon: Settings }
  ];
  const items = all.filter((i) => canAccessTab(i.id));

  const pick = (tab: NavTab) => {
    setActiveTab(tab);
    setOpen(false);
  };

  return (
    <div className="md:hidden print:hidden">
      {/* Backdrop + sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" ref={wrapRef}>
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
          />
          <div className="relative bg-white rounded-t-3xl border-t border-stone-200 shadow-2xl max-h-[80vh] flex flex-col pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between px-5 pt-3 pb-2">
              <span className="h-1.5 w-10 rounded-full bg-stone-300 absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-sm font-bold text-stone-800 mt-2">{language === 'EN' ? 'Menu' : 'मेन्यू'}</span>
              <button
                onClick={() => setOpen(false)}
                className="mt-2 p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-3 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => pick(item.id)}
                      className={`relative flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 text-center transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-50 text-stone-700 hover:bg-stone-100 active:bg-stone-200'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-amber-700'}`} />
                      <span className="text-[11px] font-semibold leading-tight">
                        {language === 'EN' ? item.label : item.labelHi}
                      </span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                {(canAccessTab('inventory') || canAccessTab('billing')) && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      openCameraScanner((code) => triggerBarcodeScan(code));
                    }}
                    className="flex flex-col items-center gap-1.5 rounded-2xl py-3.5 px-1 text-center bg-stone-50 text-stone-700 hover:bg-stone-100 active:bg-stone-200 cursor-pointer"
                  >
                    <ScanBarcode className="w-6 h-6 text-amber-700" />
                    <span className="text-[11px] font-semibold leading-tight">
                      {language === 'EN' ? 'Scan Code' : 'कोड स्कैन'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className={`fixed right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-[55] w-14 h-14 rounded-full text-white flex items-center justify-center shadow-xl shadow-amber-600/40 transition-all cursor-pointer ${
          open ? 'bg-stone-800 rotate-90' : 'bg-amber-600 hover:bg-amber-700'
        }`}
      >
        {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        {!open && dueFollowUpsCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center">
            {dueFollowUpsCount}
          </span>
        )}
      </button>
    </div>
  );
};
