import { t } from '../lib/i18n';
import { NumberInput } from './NumberInput';
import React, { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  Edit,
  MapPin,
  Phone,
  Plus,
  QrCode,
  Save,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Doctor, ShopBranch, StoreProfile, UserAccount } from '../types';
import { fileToQrDataUrl } from '../lib/upiQr';
import { PRODUCT_CATEGORIES } from '../lib/gst';

export const MastersConfig: React.FC<{ startTab?: 'StoreProfile' | 'Shops' }> = ({ startTab = 'StoreProfile' }) => {
  const {
    doctors,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    users,
    addUser,
    updateUser,
    storeProfile,
    updateStoreProfile,
    shops,
    addShop,
    updateShop,
    deleteShop,
    products,
    isCloud,
    ownerId,
    setActiveTab: goToTab
  } = useApp();

  const [activeTab, setActiveTab] = useState<'StoreProfile' | 'Shops' | 'Doctors' | 'Users'>(startTab);

  // App Users Form State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [uName, setUName] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uRole, setURole] = useState<UserAccount['role']>('Cashier');
  const [uShop, setUShop] = useState('all');
  const resetUserForm = () => {
    setEditingUserId(null);
    setUName('');
    setUUsername('');
    setUEmail('');
    setUPhone('');
    setURole('Cashier');
    setUShop('all');
  };
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim() || !uUsername.trim()) return;
    const payload = {
      name: uName.trim(),
      username: uUsername.trim(),
      email: uEmail.trim(),
      phone: uPhone.trim(),
      role: uRole,
      shopId: uShop
    };
    if (editingUserId) updateUser({ ...payload, id: editingUserId });
    else addUser(payload);
    resetUserForm();
  };

  // Cloud: the real signed-up members from Supabase.
  const [cloudUsers, setCloudUsers] = useState<
    { email: string; fullName?: string; username?: string; phone?: string; role?: string; shopIds: string[]; isAdmin?: boolean; registered?: boolean }[]
  >([]);
  const [cloudUsersNote, setCloudUsersNote] = useState('');
  useEffect(() => {
    if (!isCloud || !ownerId || activeTab !== 'Users') return;
    let active = true;
    import('../lib/supabase').then(({ supabase }) => {
      supabase!.rpc('optical_team_users', { team_owner: ownerId }).then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setCloudUsersNote('Run supabase/users-directory.sql in the Supabase SQL Editor to enable the cloud user directory.');
          setCloudUsers([]);
        } else {
          setCloudUsersNote('');
          setCloudUsers(data as typeof cloudUsers);
        }
      });
    });
    return () => {
      active = false;
    };
  }, [isCloud, ownerId, activeTab]);

  // Store Profile State
  const [profileForm, setProfileForm] = useState<StoreProfile>({ ...storeProfile });
  const [termsText, setTermsText] = useState(storeProfile.termsAndConditions.join('\n'));
  const [qrError, setQrError] = useState('');
  // Re-sync the form when the profile actually changes (e.g. cloud data hydrates
  // after mount, or another admin session saves). Without this the form keeps the
  // value captured at first mount, so edits appear to "not stick".
  useEffect(() => {
    setProfileForm({ ...storeProfile });
    setTermsText(storeProfile.termsAndConditions.join('\n'));
  }, [storeProfile]);

  // Doctor Form State
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [docName, setDocName] = useState('');
  const [docQual, setDocQual] = useState('B.Optom / MBBS MS Ophthal');
  const [docClinic, setDocClinic] = useState('');
  const [docMobile, setDocMobile] = useState('');
  const [docCommission, setDocCommission] = useState(5);

  // Shop Branch Form State
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopGstin, setShopGstin] = useState('');
  const [shopIsMain, setShopIsMain] = useState(false);

  const handleSaveStoreProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTerms = termsText.split('\n').filter((t) => t.trim().length > 0);
    updateStoreProfile({
      ...profileForm,
      termsAndConditions: updatedTerms
    });
    alert('Store Profile & Tax Settings saved successfully!');
  };

  // Doctor Handlers
  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;

    if (editingDoctorId) {
      const existing = doctors.find((d) => d.id === editingDoctorId);
      if (existing) {
        updateDoctor({
          ...existing,
          name: docName.trim(),
          qualification: docQual.trim(),
          clinicName: docClinic.trim(),
          mobile: docMobile.trim(),
          commissionPercent: docCommission
        });
      }
      setEditingDoctorId(null);
    } else {
      addDoctor({
        name: docName.trim(),
        qualification: docQual.trim(),
        clinicName: docClinic.trim(),
        mobile: docMobile.trim(),
        commissionPercent: docCommission,
        isActive: true
      });
    }

    setDocName('');
    setDocClinic('');
    setDocMobile('');
  };

  const handleEditDoctor = (doc: Doctor) => {
    setEditingDoctorId(doc.id);
    setDocName(doc.name);
    setDocQual(doc.qualification);
    setDocClinic(doc.clinicName || '');
    setDocMobile(doc.mobile || '');
    setDocCommission(doc.commissionPercent);
  };

  // Shop Handlers
  const handleCreateOrUpdateShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;

    if (editingShopId) {
      const existing = shops.find((s) => s.id === editingShopId);
      if (existing) {
        updateShop({
          ...existing,
          name: shopName.trim(),
          code: shopCode.trim() || existing.code,
          address: shopAddress.trim(),
          city: shopCity.trim(),
          phone: shopPhone.trim(),
          gstin: shopGstin.trim(),
          isMain: shopIsMain
        });
      }
      setEditingShopId(null);
    } else {
      addShop({
        name: shopName.trim(),
        code: shopCode.trim() || `SH${shops.length + 1}`,
        address: shopAddress.trim() || 'Main Market Road',
        city: shopCity.trim() || 'New Delhi',
        phone: shopPhone.trim() || '9811000000',
        gstin: shopGstin.trim() || storeProfile.gstin,
        isMain: shopIsMain
      });
    }

    setShopName('');
    setShopCode('');
    setShopAddress('');
    setShopCity('');
    setShopPhone('');
    setShopGstin('');
    setShopIsMain(false);
  };

  const handleEditShop = (shop: ShopBranch) => {
    setEditingShopId(shop.id);
    setShopName(shop.name);
    setShopCode(shop.code);
    setShopAddress(shop.address);
    setShopCity(shop.city);
    setShopPhone(shop.phone);
    setShopGstin(shop.gstin || '');
    setShopIsMain(shop.isMain);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-amber-200/80 p-4 rounded-xl shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              {t("Masters & Multi-Shop Configuration ")}</h1>
            <p className="text-xs text-stone-500">
              {t("Jiya Opticals: Company profile, GSTIN, Shop branches, Optometrists, and Users. ")}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white border border-amber-200/80 p-1.5 rounded-xl text-xs shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('StoreProfile')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'StoreProfile' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          {t("Store Profile & GSTIN ")}</button>

        <button
          onClick={() => setActiveTab('Shops')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'Shops' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          {t("Shop Branches (")}{shops.length})
        </button>

        <button
          onClick={() => setActiveTab('Doctors')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'Doctors' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          {t("Doctors & Optometrists (")}{doctors.length})
        </button>

        <button
          onClick={() => setActiveTab('Users')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'Users' ? 'bg-amber-600 text-white' : 'text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          {t("Users (")}{users.length})
        </button>
      </div>

      {/* Tab 1: Store Profile & GSTIN Master */}
      {activeTab === 'StoreProfile' && (
        <form onSubmit={handleSaveStoreProfile} className="bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 text-xs shadow-xs">
          <div className="border-b border-stone-200 pb-2 flex justify-between items-center">
            <span className="font-bold text-stone-900 uppercase text-xs">{t("Store Header & Tax Identification")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("Store / Company Name *")}</label>
              <input
                type="text"
                required
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("Tagline / Slogan")}</label>
              <input
                type="text"
                value={profileForm.tagline}
                onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-stone-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("Primary Store Phone *")}</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("Store Email")}</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("GSTIN Number *")}</label>
              <input
                type="text"
                value={profileForm.gstin}
                onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono font-bold"
              />
            </div>
          </div>

          {isCloud && (
            <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 accent-amber-600"
                checked={profileForm.openAccess ?? false}
                onChange={(e) => setProfileForm({ ...profileForm, openAccess: e.target.checked })}
              />
              <span className="text-xs text-stone-700">
                <strong className="block text-stone-900">{t("Let any signed-in staff use this store")}</strong>
                {t("Anyone who signs up and confirms their email can open the store and work every shop — no per-person setup. Turn this off to grant access shop-by-shop from Team &amp; Access instead. ")}</span>
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-stone-600 mb-1 font-semibold">{t("Head Office / Main Branch Address")}</label>
              <input
                type="text"
                value={profileForm.addressLine1}
                onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("City / State")}</label>
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
              />
            </div>
            <div>
              <label className="block text-stone-600 mb-1 font-semibold">{t("Pincode")}</label>
              <input
                type="text"
                value={profileForm.pincode}
                onChange={(e) => setProfileForm({ ...profileForm, pincode: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
              />
            </div>
          </div>

          {/* Bank & UPI Settings */}
          <div className="bg-[#f8fbfb] border border-amber-200 rounded-xl p-3.5 space-y-3">
            <span className="text-xs font-bold text-amber-900 block">{t("Bank Account & UPI QR Integration")}</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Bank Name")}</label>
                <input
                  type="text"
                  value={profileForm.bankName}
                  onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Account Number")}</label>
                <input
                  type="text"
                  value={profileForm.bankAccountNo}
                  onChange={(e) => setProfileForm({ ...profileForm, bankAccountNo: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("IFSC Code")}</label>
                <input
                  type="text"
                  value={profileForm.bankIfsc}
                  onChange={(e) => setProfileForm({ ...profileForm, bankIfsc: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900 font-mono"
                />
              </div>
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("UPI ID (for QR payment on invoices)")}</label>
                <input
                  type="text"
                  value={profileForm.upiId}
                  onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                  className="w-full bg-white border border-stone-300 rounded p-1.5 text-stone-900 font-mono font-bold"
                />
              </div>
            </div>

            {/* Uploaded UPI QR image */}
            <div className="flex flex-wrap items-start gap-4 pt-1">
              <div className="w-28 h-28 shrink-0 rounded-lg border-2 border-dashed border-amber-300 bg-white flex items-center justify-center overflow-hidden">
                {profileForm.upiQrDataUrl ? (
                  <img src={profileForm.upiQrDataUrl} alt="UPI QR" className="w-full h-full object-contain" />
                ) : (
                  <QrCode className="w-10 h-10 text-stone-300" />
                )}
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-stone-700">
                  {t("Upload your UPI QR (PhonePe / GPay / BharatPe / bank). ")}</p>
                <p className="text-stone-500 max-w-sm">
                  {t("This exact QR is shown on the billing “Scan to Pay” screen and on invoices. If you don’t upload one, a QR is auto-generated from the UPI ID above. ")}</p>
                {qrError && <p className="text-rose-600" role="alert">{qrError}</p>}
                <div className="flex gap-2 pt-0.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {profileForm.upiQrDataUrl ? t("Replace QR") : t("Upload QR image")}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setQrError('');
                        try {
                          const dataUrl = await fileToQrDataUrl(file);
                          setProfileForm((f) => ({ ...f, upiQrDataUrl: dataUrl }));
                        } catch (err) {
                          setQrError(err instanceof Error ? err.message : 'Could not use that image.');
                        }
                      }}
                    />
                  </label>
                  {profileForm.upiQrDataUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((f) => ({ ...f, upiQrDataUrl: undefined }))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> {t("Remove ")}</button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* GST rate by product category */}
          <div className="bg-[#f8fbfb] border border-amber-200 rounded-xl p-3.5 space-y-3">
            <div>
              <span className="text-xs font-bold text-amber-900 block">{t("GST Output Tax by Category (GSTR-1)")}</span>
              <p className="text-[11px] text-stone-500">
                {t("Set the GST % you charge for each category (e.g. Sunglasses 18%). New bill lines pick this up automatically; a single line can still be changed at billing. ")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {PRODUCT_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <label className="block text-stone-600 mb-1 font-semibold text-[11px]">{cat}</label>
                  <div className="flex items-center">
                    <NumberInput
                      type="number"
                      min="0"
                      max="28"
                      step="0.5"
                      placeholder="—"
                      value={profileForm.categoryGstRates?.[cat] ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setProfileForm((f) => {
                          const next = { ...(f.categoryGstRates || {}) };
                          if (raw === '') delete next[cat];
                          else next[cat] = Math.max(0, Math.min(28, Number(raw)));
                          return { ...f, categoryGstRates: next };
                        });
                      }}
                      className="w-full bg-white border border-stone-300 rounded-l p-1.5 text-stone-900 font-bold"
                    />
                    <span className="px-2 py-1.5 bg-stone-100 border border-l-0 border-stone-300 rounded-r text-stone-500 font-bold">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block text-stone-600 mb-1 font-semibold">{t("Invoice Terms & Conditions (One per line)")}</label>
            <textarea
              rows={3}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono text-xs"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-stone-200">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <Save className="w-4 h-4" /> {t("Save Store Profile ")}</button>
          </div>
        </form>
      )}

      {/* Tab 2: Shop Branches Configuration */}
      {activeTab === 'Shops' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-bold text-stone-900 uppercase">
                {editingShopId ? t("Edit Shop Branch") : t("Add New Optical Branch")}
              </span>
              {editingShopId && (
                <button
                  onClick={() => {
                    setEditingShopId(null);
                    setShopName('');
                    setShopCode('');
                    setShopAddress('');
                    setShopCity('');
                    setShopPhone('');
                    setShopGstin('');
                  }}
                  className="text-stone-500 hover:text-stone-800 text-[11px]"
                >
                  {t("Cancel ")}</button>
              )}
            </div>

            <form onSubmit={handleCreateOrUpdateShop} className="space-y-3">
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Shop / Branch Name *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Jiya Opticals - Shop 3 (Sector 14)")}
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Branch Code")}</label>
                  <input
                    type="text"
                    placeholder={t("SH03")}
                    value={shopCode}
                    onChange={(e) => setShopCode(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("City")}</label>
                  <input
                    type="text"
                    placeholder={t("Gurugram / Delhi")}
                    value={shopCity}
                    onChange={(e) => setShopCity(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Branch Address")}</label>
                <input
                  type="text"
                  placeholder={t("Shop No. 12, Main Market Road")}
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Branch Phone")}</label>
                  <input
                    type="tel"
                    placeholder="9811000000"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Branch GSTIN (Optional)")}</label>
                  <input
                    type="text"
                    placeholder={t("07AAAAA0000A1Z5")}
                    value={shopGstin}
                    onChange={(e) => setShopGstin(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shopIsMain"
                  checked={shopIsMain}
                  onChange={(e) => setShopIsMain(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600"
                />
                <label htmlFor="shopIsMain" className="text-stone-700 font-medium cursor-pointer">
                  {t("Set as Primary / Main Flagship Store ")}</label>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
              >
                {editingShopId ? t("Update Shop Branch") : t("+ Register New Branch")}
              </button>
            </form>
          </div>

          <div className="md:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden p-4 space-y-3 shadow-xs">
            <span className="font-bold text-stone-900 text-xs uppercase block">
              {t("Configured Optical Branches (")}{shops.length})
            </span>

            <div className="space-y-2.5">
              {shops.map((s) => {
                const branchProductsCount = products.filter(
                  (p) => p.shopId === s.id || p.shopId === 'all' || !p.shopId
                ).length;

                return (
                  <div
                    key={s.id}
                    className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl flex items-start justify-between text-xs hover:border-amber-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{s.name}</span>
                        <span className="font-mono text-[10px] bg-stone-200 px-1.5 py-0.5 rounded text-stone-700">
                          {s.code}
                        </span>
                        {s.isMain && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                            {t("Main Store ")}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                        {s.address}, {s.city}
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" /> {s.phone}
                        </span>
                        <span className="text-amber-800 font-semibold">
                          📦 {branchProductsCount} {t("Inventory SKUs ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleEditShop(s)}
                        className="p-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 cursor-pointer"
                        title={t("Edit Shop Branch")}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {shops.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete shop branch "${s.name}"?`)) {
                              deleteShop(s.id);
                            }
                          }}
                          className="p-1.5 bg-white hover:bg-rose-50 border border-stone-200 rounded text-stone-400 hover:text-rose-600 cursor-pointer"
                          title={t("Delete Shop Branch")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Optometrists & Doctors */}
      {activeTab === 'Doctors' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 text-xs shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <span className="font-bold text-stone-900 uppercase">
                {editingDoctorId ? t("Edit Doctor / Optometrist") : t("Add Doctor / Optometrist")}
              </span>
              {editingDoctorId && (
                <button
                  onClick={() => {
                    setEditingDoctorId(null);
                    setDocName('');
                    setDocClinic('');
                    setDocMobile('');
                  }}
                  className="text-stone-500 hover:text-stone-800 text-[11px]"
                >
                  {t("Cancel ")}</button>
              )}
            </div>

            <form onSubmit={handleCreateDoctor} className="space-y-3">
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Doctor / Optometrist Name *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Dr. Jiya Sengupta / Dr. Ananya")}
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Qualifications")}</label>
                <input
                  type="text"
                  value={docQual}
                  onChange={(e) => setDocQual(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Clinic / Hospital / Shop Attached")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. Jiya Eye Care Clinic / In-house")}
                  value={docClinic}
                  onChange={(e) => setDocClinic(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Mobile No")}</label>
                  <input
                    type="tel"
                    placeholder="9811000000"
                    value={docMobile}
                    onChange={(e) => setDocMobile(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Comm. / Cut (%)")}</label>
                  <NumberInput
                    type="number"
                    min="0"
                    max="50"
                    value={docCommission}
                    onChange={(e) => setDocCommission(Number(e.target.value))}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-bold text-amber-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer shadow-xs"
              >
                {editingDoctorId ? t("Save Doctor Changes") : t("+ Register Doctor / Optometrist")}
              </button>
            </form>
          </div>

          <div className="md:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden p-4 space-y-3 shadow-xs">
            <span className="font-bold text-stone-900 text-xs uppercase block">
              {t("Registered Doctors & Refractionists (")}{doctors.length})
            </span>

            <div className="space-y-2">
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
                >
                  <div>
                    <div className="font-bold text-stone-900">{doc.name}</div>
                    <div className="text-[11px] text-stone-600">
                      {doc.qualification} {doc.clinicName ? `• ${doc.clinicName}` : ''}
                    </div>
                    <div className="text-[10px] text-stone-500">📱 {doc.mobile || 'Store In-house'}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      {doc.commissionPercent}{t("% Commission ")}</span>
                    <button
                      onClick={() => handleEditDoctor(doc)}
                      className="p-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-stone-700 cursor-pointer"
                      title={t("Edit Doctor")}
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remove doctor ${doc.name}?`)) {
                          deleteDoctor(doc.id);
                        }
                      }}
                      className="p-1 bg-white hover:bg-rose-50 border border-stone-200 rounded text-stone-400 hover:text-rose-600 cursor-pointer"
                      title={t("Delete Doctor")}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: App Users (cloud = real signed-up members) */}
      {activeTab === 'Users' && isCloud && (
        <div className="bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 text-xs shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-stone-900 uppercase">{t("Users who have signed in (")}{cloudUsers.length})</span>
            <button
              onClick={() => goToTab('team')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
            >
              {t("Assign shops &amp; roles in Team &amp; Access → ")}</button>
          </div>
          <p className="text-[11px] text-stone-500">
            {t("Rows fill in automatically when a person signs up with the email you assigned. Change their role and shops in Team &amp; Access; the person edits their own name/username from the profile menu. Email is fixed. ")}</p>
          {cloudUsersNote && <p className="text-amber-700 text-[11px]">{cloudUsersNote}</p>}
          <div className="space-y-2">
            {cloudUsers.map((u) => (
              <div
                key={u.email}
                className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold text-stone-900">
                    {u.fullName || u.email}
                    {u.username ? <span className="font-mono text-[10px] text-stone-400"> @{u.username}</span> : null}
                  </div>
                  <div className="text-[11px] text-stone-600">
                    {u.isAdmin ? t("Admin") : u.role || 'Shop Manager'} •{' '}
                    {u.isAdmin
                      ? t("All Branches")
                      : u.shopIds.map((id) => shops.find((s) => s.id === id)?.name || 'Removed shop').join(', ') ||
                        'No shop'}
                  </div>
                  <div className="text-[10px] text-stone-500 truncate">
                    ✉️ {u.email} {u.phone ? `• 📱 ${u.phone}` : ''}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    u.registered
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {u.isAdmin ? t("Owner") : u.registered ? t("Signed up") : t("Not signed up yet")}
                </span>
              </div>
            ))}
            {!cloudUsers.length && !cloudUsersNote && (
              <p className="text-stone-500">{t("No members yet. Assign someone a shop in Team &amp; Access.")}</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: App Users (local demo = editable list) */}
      {activeTab === 'Users' && !isCloud && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-5 bg-white border border-amber-200/80 rounded-xl p-5 space-y-4 text-xs shadow-xs">
            <span className="font-bold text-stone-900 uppercase block">
              {editingUserId ? t("Edit User") : t("Add User")}
            </span>
            <p className="text-[11px] text-stone-500">
              {t("These are the people who use this software. Team &amp; Access picks members from this list. ")}</p>
            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Full Name *")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Rahul Sharma")}
                  value={uName}
                  onChange={(e) => setUName(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Username *")}</label>
                  <input
                    type="text"
                    required
                    placeholder={t("rahul_s1")}
                    value={uUsername}
                    onChange={(e) => setUUsername(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Login Email")}</label>
                  <input
                    type="email"
                    placeholder={t("rahul@example.com")}
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  />
                </div>
              </div>
              <p className="text-[10px] text-stone-400 -mt-1.5">
                {t("Email is only needed for cloud team access — the member signs up with it. ")}</p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Role")}</label>
                  <select
                    value={uRole}
                    onChange={(e) => setURole(e.target.value as UserAccount['role'])}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    <option value="Admin">{t("Admin")}</option>
                    <option value="Shop Manager">{t("Shop Manager")}</option>
                    <option value="Optometrist">{t("Optometrist")}</option>
                    <option value="Cashier">{t("Cashier")}</option>
                    <option value="Lab Technician">{t("Lab Technician")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 mb-1 font-semibold">{t("Shop")}</label>
                  <select
                    value={uShop}
                    onChange={(e) => setUShop(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                  >
                    <option value="all">{t("All Branches")}</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-600 mb-1 font-semibold">{t("Mobile No")}</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={uPhone}
                  onChange={(e) => setUPhone(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2 text-stone-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold cursor-pointer"
                >
                  {editingUserId ? t("Save Changes") : t("+ Add User")}
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold cursor-pointer"
                  >
                    {t("Cancel ")}</button>
                )}
              </div>
            </form>
          </div>

          <div className="md:col-span-7 bg-white border border-amber-200/80 rounded-xl overflow-hidden p-4 space-y-3 shadow-xs">
            <span className="font-bold text-stone-900 text-xs uppercase block">{t("User Directory (")}{users.length})</span>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900">
                      {u.name} <span className="font-mono text-[10px] text-stone-400">@{u.username}</span>
                    </div>
                    <div className="text-[11px] text-stone-600">
                      {u.role} • {shops.find((s) => s.id === u.shopId)?.name || 'All Branches'}
                    </div>
                    <div className="text-[10px] text-stone-500 truncate">
                      {u.email ? `✉️ ${u.email}` : t("No login email set")} {u.phone ? ` • 📱 ${u.phone}` : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingUserId(u.id);
                      setUName(u.name);
                      setUUsername(u.username);
                      setUEmail(u.email || '');
                      setUPhone(u.phone || '');
                      setURole(u.role);
                      setUShop(u.shopId || 'all');
                    }}
                    className="shrink-0 ml-2 px-2 py-1 rounded bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer"
                  >
                    {t("Edit ")}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
