import { t } from '../lib/i18n';
import React from 'react';
import { Glasses } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GlobalSearch } from './GlobalSearch';
import { ProfileMenu } from './ProfileMenu';

/** Slim top strip for phones (the sidebar is hidden below md). */
export const MobileTopBar: React.FC = () => {
  const { storeProfile, setActiveTab } = useApp();
  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200/80 px-3 py-2 flex items-center gap-2">
      <button
        onClick={() => setActiveTab('dashboard')}
        className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 cursor-pointer"
        title={storeProfile.name}
      >
        <Glasses className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <GlobalSearch placeholder={t("Search…")} />
      </div>
      <ProfileMenu variant="bar" />
    </header>
  );
};
