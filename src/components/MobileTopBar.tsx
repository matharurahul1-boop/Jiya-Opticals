import { t } from '../lib/i18n';
import React from 'react';
import { ArrowLeft, Glasses } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { ProfileMenu } from './ProfileMenu';

/** Slim top strip for phones (the sidebar is hidden below md). */
export const MobileTopBar: React.FC = () => {
  const { storeProfile, activeTab, setActiveTab } = useApp();
  const onDashboard = activeTab === 'dashboard';
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200/80 px-3 py-2 flex items-center gap-2">
      {onDashboard ? (
        <button
          onClick={() => setActiveTab('dashboard')}
          className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
          title={storeProfile.name}
        >
          <Glasses className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={() => setActiveTab('dashboard')}
          className="h-9 pl-2 pr-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 shrink-0 cursor-pointer"
          title={t("Back to Dashboard")}
          aria-label={t("Back to Dashboard")}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold">{t("Back")}</span>
        </button>
      )}
      <div className="flex-1 min-w-0">
        <GlobalSearch placeholder={t("Search…")} />
      </div>
      <ProfileMenu variant="bar" />
    </header>
  );
};
