import { t } from '../lib/i18n';
import React, {useEffect,useRef,useState} from 'react';
import {ChevronDown,Languages,LogOut,User} from 'lucide-react';
import {useApp} from '../context/AppContext';
export function ProfileMenu({variant='bar'}:{variant?:'bar'|'block'}) {
  const {currentUser,language,setLanguage,setActiveTab,signOut}=useApp();
  const [open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const close=(e:MouseEvent)=>{if(!ref.current?.contains(e.target as Node))setOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',key);};},[]);
  return <div ref={ref} className="relative"><button aria-label={t("Account menu")} aria-expanded={open} onClick={()=>setOpen(v=>!v)} className="w-full flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:bg-stone-50"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-700 text-white font-semibold">{currentUser.name?.[0]?.toUpperCase()||'U'}</span><span className={variant==='bar'?'hidden sm:block':'flex-1 min-w-0'}><span className="block text-sm font-semibold truncate">{currentUser.name}</span><span className="block text-xs text-stone-500">{currentUser.role}</span></span><ChevronDown className="h-4 w-4 text-stone-400"/></button>
    {open&&<div className={`absolute z-50 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl ${variant==='block'?'bottom-full mb-2 left-0':'top-full mt-2 right-0'}`}>
      <label className="flex items-center gap-3 px-3 py-3 text-sm"><Languages className="w-4 h-4"/><span>{t("Language")}</span><select aria-label={t("Language")} value={language} onChange={e=>setLanguage(e.target.value as 'EN'|'HI')} className="ml-auto rounded-lg border border-stone-200 bg-white p-1.5"><option value="EN">{t("English")}</option><option value="HI">हिन्दी</option></select></label>
      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-stone-50" onClick={()=>{setOpen(false);setActiveTab('profile');}}><User className="w-4 h-4"/>{t("Profile")}</button>
      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-rose-600 hover:bg-rose-50" onClick={()=>{setOpen(false);void signOut();}}><LogOut className="w-4 h-4"/>{t("Sign out")}</button>
      <p className="app-credit text-center px-3 pt-2 pb-1">Made with ❤️ by Handysolver © 2026</p>
    </div>}
  </div>;
}
