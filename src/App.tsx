import { SupabaseGate } from './components/SupabaseGate';
import { JoinApprovals } from './components/JoinApprovals';
import { ProfileScreen } from './components/ProfileScreen';
import { CloudWorkspace } from './lib/workspace';
import React from 'react';
import { TeamManager } from './components/TeamManager';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { MobileTopBar } from './components/MobileTopBar';
import { Dashboard } from './components/Dashboard';
import { BillingPOS } from './components/BillingPOS';
import { EyeTesting } from './components/EyeTesting';
import { InventoryManager } from './components/InventoryManager';
import { CustomerCRM } from './components/CustomerCRM';
import { PurchasesManager } from './components/PurchasesManager';
import { DayBookReports } from './components/DayBookReports';
import { MastersConfig } from './components/MastersConfig';
import { FollowUpAndBroadcast } from './components/FollowUpAndBroadcast';
import { InvoicePrintModal } from './components/InvoicePrintModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { CameraBarcodeScannerModal } from './components/CameraBarcodeScannerModal';
import { ShopSelectModal } from './components/ShopSelectModal';
import { QuickClientModal } from './components/QuickClientModal';
import { ManualEmailModal } from './components/ManualEmailModal';
import { DrishtiSyncPanel } from './components/DrishtiSyncPanel';
import { FloatingMenu } from './components/FloatingMenu';

const MainLayout: React.FC = () => {
  const { activeTab, canAccessTab, shops, currentUser, selectedShopFilter, setSelectedShopFilter, ownerId, saveStatus } = useApp();
  const needsShop = shops.length > 1 && selectedShopFilter === 'all' && ['billing', 'eyetesting', 'customers', 'followups'].includes(activeTab);
  if (!shops.length) return <div className="min-h-screen bg-[#f4f8f8]">
    <div className="p-5 bg-amber-50"><h1 className="text-2xl font-bold">Welcome to your business</h1><p>{currentUser.role === 'Admin' ? 'Create your first shop below. Then use Team & Access to assign members.' : 'No shops are assigned to you yet. Ask your admin to assign a shop, then reload.'}</p></div>
    {currentUser.role === 'Admin' && <MastersConfig startTab="Shops" />}
  </div>;

  return (
    <div className="h-screen overflow-hidden bg-[#f4f8f8] text-stone-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white">
      {/* Slim top strip on phones only */}
      <MobileTopBar />

      {/* Body Area with Sidebar and Dynamic Tab Content */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left ERP Navigation Sidebar (Hidden on small mobile) */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Dynamic Content Viewport */}
        <main
          key={selectedShopFilter}
          className="flex-1 min-w-0 overflow-y-auto bg-[#f4f8f8] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {needsShop ? <section className="p-6 space-y-4"><h2 className="text-xl font-bold">Choose a shop to continue</h2><p>Clients, stock and transactions stay with the selected shop.</p><div className="flex flex-wrap gap-3">{shops.map(shop => <button key={shop.id} className="bg-white border border-amber-300 rounded-xl p-4" onClick={() => setSelectedShopFilter(shop.id)}>{shop.name}</button>)}</div></section> : <>
          {activeTab === 'shops' && canAccessTab('shops') && <MastersConfig key="shops" startTab="Shops" />}
          {activeTab === 'team' && canAccessTab('team') && <TeamManager />}
            {activeTab === 'dashboard' && <>{ownerId && currentUser.role === 'Admin' && <div className="px-6 pt-6"><JoinApprovals ownerId={ownerId} shops={shops} canReview={saveStatus === 'Saved to Supabase'} /></div>}<Dashboard /></>}
          {activeTab === 'profile' && <ProfileScreen />}
          {activeTab === 'billing' && <BillingPOS />}
          {activeTab === 'eyetesting' && <EyeTesting />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'customers' && <CustomerCRM />}
          {activeTab === 'followups' && <FollowUpAndBroadcast />}
          {activeTab === 'purchases' && <PurchasesManager />}
          {activeTab === 'daybook' && <DayBookReports />}
          {activeTab === 'drishti' && canAccessTab('drishti') && <DrishtiSyncPanel />}
          {(activeTab === 'masters' || activeTab === 'settings') && canAccessTab('masters') && <MastersConfig />}
          </>}
        </main>
      </div>

      {/* Mobile primary navigation (floating button + sheet). Hidden on desktop. */}
      <FloatingMenu />

      {/* Global Modals for Printing, Camera Scanning, Shop Selector, Client Creation & Manual Email */}
      <InvoicePrintModal />
      <BarcodePrintModal />
      <CameraBarcodeScannerModal />
      <ShopSelectModal />
      <QuickClientModal />
      <ManualEmailModal />
    </div>
  );
};

export default function App() {
  return (
    <SupabaseGate>{ownerId => ownerId
      ? <CloudWorkspace key={ownerId} ownerId={ownerId}>{(data, version, access) =>
          <AppProvider ownerId={access.ownerId} authenticatedUser={access.user} initialSnapshot={data} initialVersion={version}><MainLayout /></AppProvider>
        }</CloudWorkspace>
      : <AppProvider><MainLayout /></AppProvider>
    }</SupabaseGate>
  );
}
