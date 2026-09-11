import { t } from '../lib/i18n';
import React, { useState } from 'react';
import { UserPlus, Search, Receipt, Eye, Phone, MapPin, X, Check, ArrowRight, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';

export const QuickClientModal: React.FC = () => {
  const { 
    showQuickClientModal, 
    setShowQuickClientModal, 
    customers, 
    addCustomer, 
    setActiveTab, 
    setSelectedCustomerForAction,
    selectedShopFilter,
    setSelectedShopFilter,
    promptShopSelect,
    currentUser
  } = useApp();

  const [tabMode, setTabMode] = useState<'create' | 'search'>('create');
  const [searchPhoneOrName, setSearchPhoneOrName] = useState('');
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [address, setAddress] = useState('');

  const [createdOrFoundCustomer, setCreatedOrFoundCustomer] = useState<Customer | null>(null);

  if (!showQuickClientModal) return null;

  const handleClose = () => {
    setShowQuickClientModal(false);
    setCreatedOrFoundCustomer(null);
    setName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setSearchPhoneOrName('');
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      alert('Please enter both customer name and mobile number.');
      return;
    }

    const performAdd = (targetShopId: string) => {
      const newCust = addCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        city: city.trim(),
        address: address.trim(),
        shopId: targetShopId
      });
      setCreatedOrFoundCustomer(newCust);
      setSelectedCustomerForAction(newCust);
    };

    if (currentUser.role === 'Admin' && selectedShopFilter === 'all') {
      promptShopSelect('Assign New Client To Branch', (shopId) => {
        performAdd(shopId);
      });
    } else {
      performAdd(selectedShopFilter !== 'all' ? selectedShopFilter : 'shop-1');
    }
  };

  const handleSelectExisting = (c: Customer) => {
    setCreatedOrFoundCustomer(c);
    setSelectedCustomerForAction(c);
  };

  const handleProceedToBilling = () => {
    if (createdOrFoundCustomer) {
      if (createdOrFoundCustomer.shopId) setSelectedShopFilter(createdOrFoundCustomer.shopId);
      setSelectedCustomerForAction(createdOrFoundCustomer);
    }
    handleClose();
    setActiveTab('billing');
  };

  const handleProceedToEyeTest = () => {
    if (createdOrFoundCustomer) {
      if (createdOrFoundCustomer.shopId) setSelectedShopFilter(createdOrFoundCustomer.shopId);
      setSelectedCustomerForAction(createdOrFoundCustomer);
    }
    handleClose();
    setActiveTab('eyetesting');
  };

  const handleProceedToCRM = () => {
    if (createdOrFoundCustomer) {
      if (createdOrFoundCustomer.shopId) setSelectedShopFilter(createdOrFoundCustomer.shopId);
      setSelectedCustomerForAction(createdOrFoundCustomer);
    }
    handleClose();
    setActiveTab('customers');
  };

  const filteredExisting = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchPhoneOrName.toLowerCase()) ||
      c.mobile.includes(searchPhoneOrName)
  );

  return (
    <div 
      id="quick-client-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div 
        id="quick-client-modal-card"
        className="bg-[#ffffff] text-stone-900 w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t("Client / Patient Entry")}</h3>
              <p className="text-xs text-stone-500">{t("Quickly register or lookup customer")}</p>
            </div>
          </div>
          <button
            id="btn-close-quick-client"
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {!createdOrFoundCustomer ? (
            <>
              {/* Tabs: New vs Existing */}
              <div className="flex bg-stone-200/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTabMode('create')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    tabMode === 'create'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t("+ New Client")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTabMode('search')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    tabMode === 'search'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t("Search Existing")}</span>
                </button>
              </div>

              {tabMode === 'create' ? (
                <form onSubmit={handleCreateCustomer} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t("Full Name * ")}</label>
                    <input
                      id="input-quick-client-name"
                      type="text"
                      required
                      placeholder={t("e.g. Ramesh Kumar")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t("Mobile Number (WhatsApp) * ")}</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-quick-client-mobile"
                        type="tel"
                        required
                        placeholder={t("10-digit mobile number")}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      {t("Email Address (Optional) ")}<span className="text-[10px] text-stone-400 font-normal ml-1.5">{t("(For Emailing Invoices & Rx)")}</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        id="input-quick-client-email"
                        type="email"
                        placeholder={t("e.g. client@gmail.com")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {t("City / Area ")}</label>
                      <input
                        id="input-quick-client-city"
                        type="text"
                        placeholder={t("e.g. New Delhi")}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {t("Address / Landmark ")}</label>
                      <input
                        id="input-quick-client-address"
                        type="text"
                        placeholder={t("Sector / Road")}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-submit-quick-client"
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center space-x-2 mt-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{t("Save & Proceed")}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-quick-search-client"
                      type="text"
                      placeholder={t("Type name or phone number...")}
                      value={searchPhoneOrName}
                      onChange={(e) => setSearchPhoneOrName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-amber-500 shadow-xs"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {filteredExisting.length === 0 ? (
                      <p className="text-center text-xs text-stone-400 py-6">
                        {t("No clients found matching &ldquo;")}{searchPhoneOrName}{t("&rdquo; ")}</p>
                    ) : (
                      filteredExisting.map((c) => (
                        <button
                          key={c.id}
                          id={`btn-select-existing-client-${c.id}`}
                          onClick={() => handleSelectExisting(c)}
                          type="button"
                          className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 bg-white transition-all flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-sm text-stone-900">{c.name}</div>
                            <div className="text-xs text-stone-500 font-mono flex items-center flex-wrap gap-x-2">
                              <span>📞 {c.mobile}</span>
                              {c.email && <span className="text-sky-700">✉️ {c.email}</span>}
                              {c.city && <span>📍 {c.city}</span>}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                            {t("Select ")}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Selected Client - Immediate Action Matrix */
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto border border-emerald-300">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-stone-900">
                  {createdOrFoundCustomer.name}
                </h4>
                <p className="text-xs text-stone-500 font-mono flex items-center justify-center flex-wrap gap-x-2">
                  <span>📞 {createdOrFoundCustomer.mobile}</span>
                  {createdOrFoundCustomer.email && (
                    <span className="text-sky-700 font-medium">✉️ {createdOrFoundCustomer.email}</span>
                  )}
                  {createdOrFoundCustomer.city ? <span>• 📍 {createdOrFoundCustomer.city}</span> : ''}
                </p>
              </div>

              <div className="text-xs font-semibold uppercase tracking-wider text-stone-500 pt-2">
                {t("What would you like to do next? ")}</div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  id="btn-quick-action-pos-bill"
                  onClick={handleProceedToBilling}
                  type="button"
                  className="w-full p-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl shadow-xs transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-950/10 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t("1. Create POS Bill")}</div>
                      <div className="text-xs opacity-80">{t("Add frames, lenses, generate invoice")}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  id="btn-quick-action-eye-checkup"
                  onClick={handleProceedToEyeTest}
                  type="button"
                  className="w-full p-3.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-900 font-bold rounded-xl shadow-xs transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{t("2. Start Eye Checkup")}</div>
                      <div className="text-xs text-stone-500">{t("Record SPH, CYL, Axis & 6M/1Y Followup")}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  id="btn-quick-action-view-crm"
                  onClick={handleProceedToCRM}
                  type="button"
                  className="w-full p-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-medium rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <span>{t("View Customer Khata / Past History")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
