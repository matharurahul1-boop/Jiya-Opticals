import { t } from '../lib/i18n';
import React,{useState} from 'react';
import {ArrowLeft,UserRound} from 'lucide-react';
import {useApp} from '../context/AppContext';
export function ProfileScreen(){
  const {currentUser,saveMyProfile,setActiveTab}=useApp();
  const [form,setForm]=useState({name:currentUser.name,username:currentUser.username||'',phone:currentUser.phone||''});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  return <section className="max-w-3xl mx-auto p-5 md:p-10 space-y-6"><button onClick={()=>setActiveTab('dashboard')} className="flex items-center gap-2 text-sm text-stone-500"><ArrowLeft className="w-4 h-4"/>{t("Back to dashboard")}</button><header><p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">{t("Your account")}</p><h1 className="text-3xl font-semibold mt-2">{t("Profile")}</h1><p className="text-stone-500 mt-2">{t("Update your personal details.")}</p></header><form className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 space-y-5" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{await saveMyProfile(form);setMessage('Profile updated successfully.');}catch(err){setError(err instanceof Error?err.message:'Could not save profile.');}finally{setBusy(false);}}}><div className="flex gap-4 items-center pb-5 border-b border-stone-100"><span className="grid place-items-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-700"><UserRound/></span><div><strong>{currentUser.name}</strong><p className="text-sm text-stone-500">{currentUser.email}</p></div></div>
    <label className="block text-sm">{t("Full name")}<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
    <label className="block text-sm">{t("Username")}<input required value={form.username} onChange={e=>setForm({...form,username:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
    <label className="block text-sm">{t("Phone")}<input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-2 w-full border rounded-xl p-3"/></label>
    <label className="block text-sm">{t("Email")}<input type="email" value={currentUser.email||''} readOnly className="mt-2 w-full border rounded-xl p-3 bg-stone-50 text-stone-500"/></label>
    {error&&<p role="alert" className="text-rose-600">{error}</p>}{message&&<p role="status" className="text-emerald-700">{message}</p>}<button disabled={busy} className="rounded-xl bg-amber-700 text-white px-6 py-3 font-semibold disabled:opacity-50">{busy?t("Saving…"):t("Save profile")}</button>
  </form></section>;
}
