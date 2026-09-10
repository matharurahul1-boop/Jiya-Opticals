import React, { useEffect, useRef, useState } from 'react';
import {
  Building,
  Eye,
  Glasses,
  Home,
  Package,
  Receipt,
  Settings,
  Store,
  Truck,
  Users,
  Wallet,
  Send,
  ScanLine,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { NavTab, useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { ProfileMenu } from './ProfileMenu';

interface NavItem {
  id: NavTab;
  label: string;
  labelHi: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeColor?: string;
  group: 'main' | 'ops' | 'admin';
}

const BranchSelect: React.FC = () => {
  const { shops, selectedShopFilter, setSelectedShopFilter, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);
  if (!shops.length) return null;
  const label =
    selectedShopFilter === 'all' ? 'All Branches' : shops.find((s) => s.id === selectedShopFilter)?.name || 'Branch';
  const canSwitch = currentUser.role === 'Admin';
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        disabled={!canSwitch}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 disabled:opacity-70 transition-colors cursor-pointer"
      >
        <Store className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        {canSwitch && <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 py-1 text-xs max-h-64 overflow-y-auto">
          <button
            onClick={() => {
              setSelectedShopFilter('all');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-2 hover:bg-amber-50 cursor-pointer ${
              selectedShopFilter === 'all' ? 'font-bold text-amber-800 bg-amber-50/60' : 'text-stone-700'
            }`}
          >
            All Branches
          </button>
          {shops.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedShopFilter(s.id);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 hover:bg-amber-50 cursor-pointer ${
                selectedShopFilter === s.id ? 'font-bold text-amber-800 bg-amber-50/60' : 'text-stone-700'
              }`}
            >
              <span className="block font-semibold">{s.name}</span>
              <span className="block text-[10px] text-stone-500">{s.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    language,
    products,
    customers,
    followUps,
    invoices,
    purchases,
    canAccessTab,
    selectedShopFilter,
    sidebarCollapsed,
    toggleSidebar,
    storeProfile
  } = useApp();

  const filteredProducts = products.filter(
    (p) => selectedShopFilter === 'all' || !p.shopId || p.shopId === selectedShopFilter
  );
  const filteredCustomers = customers.filter(
    (c) => selectedShopFilter === 'all' || !c.shopId || c.shopId === selectedShopFilter
  );
  const filteredFollowUps = followUps.filter(
    (f) => (selectedShopFilter === 'all' || f.shopId === selectedShopFilter) && f.status === 'Pending'
  );

  // Ignore auto-created zero rows for shops that don't carry a shared material.
  const carriedProductIds = new Set<string>([
    ...invoices.flatMap((i) => i.items.map((it) => it.productId)),
    ...purchases.flatMap((pur) => pur.items.map((it) => it.productId)),
  ]);
  const lowStockCount = filteredProducts.filter(
    (p) => p.stockQty <= p.minStockAlert && (p.stockQty > 0 || carriedProductIds.has(p.id))
  ).length;
  const pendingDuesCount = filteredCustomers.filter((c) => c.outstandingBalance > 0).length;

  const allNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', labelHi: 'डैशबोर्ड', icon: Home, group: 'main' },
    { id: 'billing', label: 'POS Billing', labelHi: 'बिलिंग', icon: Receipt, group: 'main' },
    { id: 'eyetesting', label: 'Eye Testing', labelHi: 'नेत्र परीक्षण', icon: Eye, group: 'main' },
    {
      id: 'inventory',
      label: 'Inventory',
      labelHi: 'स्टॉक',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 border border-rose-200',
      group: 'main'
    },
    {
      id: 'customers',
      label: 'Customers',
      labelHi: 'ग्राहक व खाता',
      icon: Users,
      badge: pendingDuesCount > 0 ? pendingDuesCount : undefined,
      badgeColor: 'bg-teal-100 text-teal-700 border border-teal-200',
      group: 'main'
    },
    {
      id: 'followups',
      label: 'Follow-ups',
      labelHi: 'फॉलोअप',
      icon: Send,
      badge: filteredFollowUps.length > 0 ? filteredFollowUps.length : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      group: 'main'
    },
    { id: 'purchases', label: 'Purchases', labelHi: 'खरीद', icon: Truck, group: 'ops' },
    { id: 'daybook', label: 'Day Book', labelHi: 'बहीखाता', icon: Wallet, group: 'ops' },
    { id: 'drishti', label: 'Drishti Sync', labelHi: 'दृष्टि सिंक', icon: ScanLine, group: 'ops' },
    { id: 'shops', label: 'Shops', labelHi: 'दुकानें', icon: Building, group: 'admin' },
    { id: 'team', label: 'Team & Access', labelHi: 'टीम', icon: Users, group: 'admin' },
    { id: 'masters', label: 'Masters & Settings', labelHi: 'मास्टर व सेटिंग', icon: Settings, group: 'admin' }
  ];

  const visibleNavItems = allNavItems.filter((item) => canAccessTab(item.id));

  const groups: { key: NavItem['group']; label: string; labelHi: string }[] = [
    { key: 'main', label: 'Workspace', labelHi: 'वर्कस्पेस' },
    { key: 'ops', label: 'Operations', labelHi: 'ऑपरेशन' },
    { key: 'admin', label: 'Administration', labelHi: 'एडमिन' }
  ];

  return (
    <aside
      className={`${
        sidebarCollapsed ? 'w-[76px]' : 'w-64'
      } shrink-0 select-none transition-[width] duration-200 ease-out py-3 pl-3`}
    >
      <div className="h-full bg-[#f4f6fb] border border-stone-200/80 rounded-2xl shadow-sm flex flex-col">
        {/* Brand + collapse */}
        <div className={`flex items-center gap-2 px-3 pt-3 pb-2 ${sidebarCollapsed ? 'flex-col' : ''}`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 min-w-0 cursor-pointer"
            title={storeProfile.name}
          >
            <span className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Glasses className="w-5 h-5" />
            </span>
            {!sidebarCollapsed && (
              <span className="font-bold text-stone-900 text-sm truncate">{storeProfile.name || 'Opticals'}</span>
            )}
          </button>
          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            className={`p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-white transition-colors cursor-pointer ${
              sidebarCollapsed ? '' : 'ml-auto'
            }`}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Branch + search (expanded only) */}
        {!sidebarCollapsed && (
          <div className="px-3 pb-2 space-y-2">
            <BranchSelect />
            <GlobalSearch />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {groups.map((group) => {
            const items = visibleNavItems.filter((i) => i.group === group.key);
            if (!items.length) return null;
            return (
              <div key={group.key} className="space-y-0.5">
                {!sidebarCollapsed && (
                  <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {language === 'EN' ? group.label : group.labelHi}
                  </div>
                )}
                {sidebarCollapsed && <div className="mx-3 my-1.5 border-t border-stone-200/70" />}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-tab-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      title={sidebarCollapsed ? (language === 'EN' ? item.label : item.labelHi) : undefined}
                      className={`group relative w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                      } py-2.5 rounded-xl text-[13px] transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-600 text-white font-semibold shadow-sm shadow-amber-600/30'
                          : 'text-stone-600 hover:bg-white hover:text-stone-900 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-[18px] h-[18px] shrink-0 ${
                            isActive ? 'text-white' : 'text-stone-400 group-hover:text-amber-700'
                          }`}
                        />
                        {!sidebarCollapsed && (
                          <span className="truncate">{language === 'EN' ? item.label : item.labelHi}</span>
                        )}
                      </span>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`${
                            sidebarCollapsed
                              ? 'absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500'
                              : `text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                  item.badgeColor || 'bg-stone-200 text-stone-700'
                                }`
                          }`}
                        >
                          {!sidebarCollapsed && item.badge}
                        </span>
                      )}

                      {sidebarCollapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg bg-stone-900 text-white text-xs font-medium px-2.5 py-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shadow-lg">
                          {language === 'EN' ? item.label : item.labelHi}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Profile footer */}
        {!sidebarCollapsed && (
          <div className="p-2.5 border-t border-stone-200/70">
            <ProfileMenu variant="block" />
          </div>
        )}
      </div>
    </aside>
  );
};
