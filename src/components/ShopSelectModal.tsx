import { t } from '../lib/i18n';
import React from 'react';
import { Store, MapPin, Phone, CheckCircle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ShopSelectModal: React.FC = () => {
  const { 
    showShopSelectModal, 
    setShowShopSelectModal, 
    shopSelectPromptTitle, 
    confirmShopSelection, 
    shops 
  } = useApp();

  if (!showShopSelectModal) return null;

  return (
    <div 
      id="shop-select-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div 
        id="shop-select-modal-card"
        className="bg-[#ffffff] text-stone-900 w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        <div className="p-5 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">{t("Select Branch")}</h3>
              <p className="text-xs text-stone-500">{shopSelectPromptTitle}</p>
            </div>
          </div>
          <button
            id="btn-close-shop-select"
            onClick={() => setShowShopSelectModal(false)}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
            {t("Choose target branch for this entry: ")}</p>
          <div className="space-y-2.5">
            {shops.map((shop) => (
              <button
                key={shop.id}
                id={`btn-select-shop-${shop.id}`}
                onClick={() => confirmShopSelection(shop.id)}
                type="button"
                className="w-full text-left p-3.5 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/50 bg-white shadow-xs transition-all flex items-start justify-between group"
              >
                <div className="space-y-1 pr-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-stone-900 text-sm group-hover:text-amber-800">
                      {shop.name}
                    </span>
                    {shop.isMain && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">
                        {t("Main ")}</span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-stone-500 space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{shop.address}, {shop.city}</span>
                  </div>
                  <div className="flex items-center text-xs text-stone-400 space-x-1">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{shop.phone}</span>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-full border border-stone-300 group-hover:border-amber-500 group-hover:bg-amber-500 text-transparent group-hover:text-white flex items-center justify-center shrink-0 mt-1 transition-colors">
                  <CheckCircle className="w-4 h-4 fill-current" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-400">
            {t("You can also filter the dashboard by specific shop in the top bar. ")}</p>
        </div>
      </div>
    </div>
  );
};
