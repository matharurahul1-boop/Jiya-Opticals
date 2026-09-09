import React from 'react';
import { MonthlyRevenueChart } from './MonthlyRevenueChart';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Eye, 
  MessageSquare, 
  Package, 
  Printer, 
  Receipt, 
  Send, 
  TrendingUp, 
  UserPlus, 
  Users, 
  Wallet,
  Scan,
  Store,
  Bell,
  Sparkles,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Invoice, OrderStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { 
    storeProfile, 
    language, 
    setActiveTab, 
    invoices, 
    payments,
    products, 
    customers, 
    expenses, 
    updateOrderStatus,
    setSelectedInvoiceForPrint,
    setSelectedPrescriptionForPrint,
    setSelectedProductForBarcode,
    selectedShopFilter,
    setSelectedShopFilter,
    shops,
    currentUser,
    followUps,
    sendFollowUpWhatsApp,
    setShowQuickClientModal,
    openCameraScanner
  } = useApp();

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Filter entities by selected shop branch
  const filteredInvoices = invoices.filter(
    (i) => selectedShopFilter === 'all' || !i.shopId || i.shopId === selectedShopFilter
  );
  const filteredProducts = products.filter(
    (p) => selectedShopFilter === 'all' || !p.shopId || p.shopId === selectedShopFilter
  );
  const filteredCustomers = customers.filter(
    (c) => selectedShopFilter === 'all' || !c.shopId || c.shopId === selectedShopFilter
  );
  const filteredExpenses = expenses.filter(
    (e) => selectedShopFilter === 'all' || !e.shopId || e.shopId === selectedShopFilter
  );
  const filteredFollowUps = followUps.filter(
    (f) => selectedShopFilter === 'all' || f.shopId === selectedShopFilter
  );

  // Daily Calculations
  const todayInvoices = filteredInvoices.filter((i) => i.date === todayStr && i.orderStatus !== 'Cancelled');
  const todaySalesTotal = todayInvoices.reduce((sum, i) => sum + i.netPayable, 0);

  const todayReceipts = payments.filter(p => p.date === todayStr && (selectedShopFilter === 'all' || p.shopId === selectedShopFilter));
  const todayCashSales = todayReceipts
    .filter((i) => i.paymentMode === 'Cash')
    .reduce((sum, i) => sum + i.amount, 0);

  const todayUpiSales = todayReceipts
    .filter((i) => i.paymentMode === 'UPI / QR')
    .reduce((sum, i) => sum + i.amount, 0);

  const todayExpenses = filteredExpenses
    .filter((e) => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const netCashInHandEstimate = todayCashSales - filteredExpenses.filter(e => e.date === todayStr && e.paymentMode === 'Cash').reduce((sum, e) => sum + e.amount, 0);

  // Orders Pipeline
  const pendingOrders = filteredInvoices.filter(
    (i) => i.orderStatus === 'Order Booked' || i.orderStatus === 'In Progress' || i.orderStatus === 'Fitting Done'
  );

  const readyForDeliveryInvoices = filteredInvoices.filter((i) => i.orderStatus === 'Ready for Delivery');
  const lowStockItems = filteredProducts.filter((p) => p.stockQty <= p.minStockAlert);
  const totalCustomerDues = filteredCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const dueFollowupsToday = filteredFollowUps.filter((f) => f.status === 'Pending');

  const recentInvoices = filteredInvoices.slice(0, 6);

  const handleQuickStatusChange = (inv: Invoice, nextStatus: OrderStatus) => {
    updateOrderStatus(inv.id, nextStatus);
  };

  const openWhatsAppShare = (inv: Invoice) => {
    const text = `Namaste ${inv.customerName}, your Optical Invoice ${inv.invoiceNo} from ${storeProfile.name} is confirmed for ₹${inv.netPayable}. Status: ${inv.orderStatus}. Thank you for choosing ${storeProfile.name}! 👓`;
    const url = `https://api.whatsapp.com/send?phone=91${inv.customerMobile}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div id="dashboard-main-container" className="p-3 sm:p-5 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Top Shop Selector & Role Header */}
      <div className="bg-[#f4f6fb] border border-amber-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-bold text-stone-900 tracking-tight">
                {storeProfile.name}
              </h1>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300/60 text-[11px] font-bold rounded-md">
                {selectedShopFilter === 'all'
                  ? 'All Branches'
                  : shops.find((s) => s.id === selectedShopFilter)?.name || 'Branch'}
              </span>
            </div>
            <p className="text-stone-500 text-xs">
              {currentUser.name} ({currentUser.role}) • {storeProfile.phone}
            </p>
          </div>
        </div>

        {/* Branch Filter Switcher (If Admin) */}
        {shops.length > 0 && (
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-stone-200 shadow-xs self-start md:self-auto overflow-x-auto max-w-full">
            <button
              id="filter-shop-all"
              onClick={() => setSelectedShopFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedShopFilter === 'all'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
              }`}
            >
              All Branches
            </button>
            {shops.map((shop) => (
              <button
                key={shop.id}
                id={`filter-shop-${shop.id}`}
                onClick={() => setSelectedShopFilter(shop.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedShopFilter === shop.id
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                {shop.name.split(' - ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <MonthlyRevenueChart />
      {currentUser.role === 'Admin' && <div className="flex gap-3"><button className="px-4 py-2 bg-white border rounded-lg text-amber-800" onClick={() => setActiveTab('shops')}>Manage shops</button><button className="px-4 py-2 bg-white border rounded-lg text-amber-800" onClick={() => setActiveTab('team')}>Team & access</button></div>}
      {/* Quick Action Touch Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Button 1: Client Entry */}
        <button
          id="btn-big-create-client"
          onClick={() => setShowQuickClientModal(true)}
          className="p-3.5 bg-white hover:bg-amber-50/50 border border-stone-200 hover:border-amber-500 text-stone-900 rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer group active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <UserPlus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-stone-900">Client Entry</span>
        </button>

        {/* Button 2: POS Bill */}
        <button
          id="btn-big-pos-bill"
          onClick={() => setActiveTab('billing')}
          className="p-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer group active:scale-95 border border-amber-600/20"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-950/10 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Receipt className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold">POS Bill</span>
        </button>

        {/* Button 3: Eye Checkup */}
        <button
          id="btn-big-eye-checkup"
          onClick={() => setActiveTab('eyetesting')}
          className="p-3.5 bg-white hover:bg-teal-50/50 border border-stone-200 hover:border-teal-500 text-stone-900 rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer group active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Eye className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-stone-900">Eye Checkup</span>
        </button>

        {/* Button 4: Inventory */}
        <button
          id="btn-big-inventory"
          onClick={() => setActiveTab('inventory')}
          className="p-3.5 bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-400 text-stone-900 rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer group active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-stone-100 border border-stone-300 text-stone-800 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-stone-900">Inventory</span>
        </button>

        {/* Button 5: Follow-ups */}
        <button
          id="btn-big-followup-broadcast"
          onClick={() => setActiveTab('followups')}
          className="p-3.5 bg-white hover:bg-emerald-50/50 border border-stone-200 hover:border-emerald-500 text-stone-900 rounded-xl flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer group active:scale-95 col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center mb-2 relative group-hover:scale-105 transition-transform">
            <Send className="w-5 h-5" />
            {dueFollowupsToday.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center">
                {dueFollowupsToday.length}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-stone-900">Follow-ups</span>
        </button>
      </div>

      {/* Follow-up Reminder Push Banner (If followups exist) */}
      {dueFollowupsToday.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-400/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Bell className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="text-xs text-stone-800 font-medium">
              <strong className="text-stone-900 font-bold">{dueFollowupsToday.length} Follow-ups Due</strong> ({dueFollowupsToday[0]?.customerName} & others)
            </span>
          </div>
          <button
            onClick={() => setActiveTab('followups')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors cursor-pointer shrink-0"
          >
            <span>View</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Today Sales */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Today Sales</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-stone-900 mt-1 font-mono">
            ₹{todaySalesTotal.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {todayInvoices.length} Bills
          </div>
        </div>

        {/* Card 2: Cash in Hand */}
        <div className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Net cash today</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-stone-900 mt-1 font-mono">
            ₹{netCashInHandEstimate.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center space-x-2">
            <span>Cash: ₹{todayCashSales}</span>
            <span>•</span>
            <span>UPI: ₹{todayUpiSales}</span>
          </div>
        </div>

        {/* Card 3: Active Orders */}
        <div 
          onClick={() => setActiveTab('billing')} 
          className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs hover:border-amber-400 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Active Orders</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-stone-900 mt-1">
            {pendingOrders.length} Orders
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-between">
            <span>Ready: {readyForDeliveryInvoices.length}</span>
            <span className="text-amber-700 font-semibold group-hover:underline">POS Bill →</span>
          </div>
        </div>

        {/* Card 4: Customer Dues */}
        <div 
          onClick={() => setActiveTab('customers')} 
          className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-xs hover:border-rose-300 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Khata Dues</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-stone-900 mt-1 font-mono">
            ₹{totalCustomerDues.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5 flex items-center justify-between">
            <span>Pending Balance</span>
            <span className="text-rose-700 font-semibold group-hover:underline">View →</span>
          </div>
        </div>
      </div>

      {/* Active Orders & Low Stock Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Customer Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <h2 className="text-sm font-bold text-stone-900">
                  Active Customer Orders ({pendingOrders.length})
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('billing')}
                className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                + New Bill <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs bg-stone-50 rounded-lg border border-stone-200">
                No active orders pending fitting or delivery.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingOrders.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 bg-stone-50/70 border border-stone-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-300 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-stone-900 text-xs font-mono">{inv.invoiceNo}</span>
                        <span className="text-xs text-stone-600">• {inv.customerName} ({inv.customerMobile})</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          {inv.orderStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex flex-wrap gap-2">
                        <span>Items: {inv.items.map((i) => i.name).join(' + ')}</span>
                        <span>• Target: <strong className="text-stone-700">{inv.deliveryDate || 'Today'}</strong></span>
                        <span>• Due: <strong className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-700'}>₹{inv.balanceDue}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                      {(inv.orderStatus === 'Order Booked' || inv.orderStatus === 'In Progress') && (
                        <button
                          onClick={() => handleQuickStatusChange(inv, 'Fitting Done')}
                          className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                        >
                          Mark Fitting Done
                        </button>
                      )}
                      {inv.orderStatus === 'Fitting Done' && (
                        <button
                          onClick={() => handleQuickStatusChange(inv, 'Ready for Delivery')}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                        >
                          Ready For Delivery
                        </button>
                      )}
                      {inv.orderStatus === 'Ready for Delivery' && (
                        <button
                          onClick={() => handleQuickStatusChange(inv, 'Delivered')}
                          className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-[11px] font-semibold cursor-pointer"
                        >
                          Mark Delivered
                        </button>
                      )}
                      <button
                        onClick={() => openWhatsAppShare(inv)}
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 rounded-md cursor-pointer"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Low Stock */}
        <div>
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                Low Stock ({lowStockItems.length})
              </span>
              <button
                onClick={() => setActiveTab('inventory')}
                className="text-xs text-amber-800 hover:underline font-semibold cursor-pointer"
              >
                Manage
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center">
                Stock levels are adequate.
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-amber-50/50 border border-amber-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-stone-900">{p.name}</div>
                      <div className="text-stone-500 text-[10px]">{p.modelNo}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-[11px]">
                      {p.stockQty} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
