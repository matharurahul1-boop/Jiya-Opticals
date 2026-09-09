import React, { useEffect, useRef, useState } from 'react';
import { User, ChevronDown, LogOut, RefreshCw, Download, Pencil, Check, Languages } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

interface Props {
  /** 'bar' = compact button for a top strip; 'block' = full-width row for the sidebar footer. */
  variant?: 'bar' | 'block';
}

export const ProfileMenu: React.FC<Props> = ({ variant = 'bar' }) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    updateUser,
    isCloud,
    saveStatus,
    switchWorkspace,
    signOut,
    downloadBackup,
    language,
    setLanguage,
    shops
  } = useApp();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: currentUser.name,
    username: currentUser.username,
    email: currentUser.email || '',
    phone: currentUser.phone || ''
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setEditing(false));
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const canEdit = !isCloud || currentUser.role === 'Admin';
  const initials = currentUser.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const [savedNote, setSavedNote] = useState('');
  const saveDetails = async () => {
    if (!form.name.trim() || !form.username.trim()) return;
    if (isCloud && supabase) {
      // Persist to the Supabase user directory (email is fixed by the account).
      const { error } = await supabase.rpc('optical_user_sync', {
        display_name: form.name.trim(),
        uname: form.username.trim(),
        phone: form.phone.trim()
      });
      setSavedNote(error ? error.message : 'Saved — visible after refresh.');
    } else {
      updateUser({
        ...currentUser,
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim()
      });
    }
    setEditing(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'block'
            ? 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 transition-colors cursor-pointer text-left'
            : 'flex items-center gap-2 px-2 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer'
        }
      >
        <span className="w-8 h-8 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
          {initials || <User className="w-4 h-4" />}
        </span>
        {variant === 'block' ? (
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-stone-900 truncate">{currentUser.name}</span>
            <span className="block text-[11px] text-stone-500 truncate">{currentUser.role}</span>
          </span>
        ) : (
          <span className="hidden sm:block text-xs font-semibold text-stone-800 truncate max-w-[120px]">
            {currentUser.name}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-50 w-72 rounded-2xl bg-white border border-stone-200 shadow-2xl overflow-hidden text-sm ${
            variant === 'block' ? 'bottom-full mb-2 left-0' : 'top-full mt-2 right-0'
          }`}
        >
          {/* Identity */}
          <div className="p-4 bg-stone-50 border-b border-stone-200">
            {!editing ? (
              <>
                <div className="font-bold text-stone-900">{currentUser.name}</div>
                <div className="text-xs text-stone-500">
                  @{currentUser.username} • {currentUser.role}
                </div>
                <div className="text-xs text-stone-500">
                  {currentUser.email || 'No login email'} ·{' '}
                  {shops.find((s) => s.id === currentUser.shopId)?.name || 'All Branches'}
                </div>
                {canEdit && (
                  <button
                    onClick={() => {
                      setSavedNote('');
                      setForm({
                        name: currentUser.name,
                        username: currentUser.username,
                        email: currentUser.email || '',
                        phone: currentUser.phone || ''
                      });
                      setEditing(true);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" /> Edit my details
                  </button>
                )}
                {savedNote && <p className="mt-1.5 text-[11px] text-emerald-700">{savedNote}</p>}
              </>
            ) : (
              <div className="space-y-2">
                {(['name', 'username', 'email', 'phone'] as const).map((k) => (
                  <input
                    key={k}
                    value={form[k]}
                    disabled={k === 'email' && isCloud}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    placeholder={k === 'email' && isCloud ? `${form.email} (fixed)` : k[0].toUpperCase() + k.slice(1)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1.5 text-xs disabled:bg-stone-100 disabled:text-stone-500"
                  />
                ))}
                <div className="flex gap-2 pt-0.5">
                  <button
                    onClick={saveDetails}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-2 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Local: switch user */}
          {!isCloud && users.length > 1 && (
            <div className="p-2 border-b border-stone-100 max-h-44 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">Switch user</div>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-amber-50 cursor-pointer ${
                    currentUser.id === u.id ? 'font-bold text-amber-800 bg-amber-50/60' : 'text-stone-700'
                  }`}
                >
                  <span className="truncate">
                    {u.name} <span className="text-stone-400">· {u.role}</span>
                  </span>
                  {currentUser.id === u.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="p-1.5">
            <button
              onClick={() => setLanguage(language === 'EN' ? 'HI' : 'EN')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
            >
              <Languages className="w-4 h-4 text-stone-400" />
              Language: <span className="font-bold">{language === 'EN' ? 'English' : 'हिन्दी'}</span>
            </button>

            {isCloud && (
              <>
                <div className="px-2.5 py-1.5 text-[11px] text-stone-400">{saveStatus}</div>
                <button
                  onClick={downloadBackup}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-stone-400" /> Download backup
                </button>
                <button
                  onClick={switchWorkspace}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-stone-400" /> Switch business / refresh access
                </button>
                <button
                  onClick={() => void signOut()}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
