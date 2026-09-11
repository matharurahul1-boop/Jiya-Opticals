import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {cloudErrorMessage} from '../lib/cloudErrors';
interface Option {ownerId:string;name:string;shops:{id:string;name:string}[];request:null|{shopId:string;status:string}}
export function JoinShop({onApproved}:{onApproved:()=>void}) {
  const [options,setOptions]=useState<Option[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
  useEffect(()=>{let active=true;const refresh=async()=>{try{const result=await supabase!.rpc('optical_join_options');if(result.error)throw result.error;if(!active)return;setOptions(result.data);setLoaded(true);const access=await supabase!.rpc('optical_team_list');if(active&&access.data?.length)onApproved();}catch(e){if(active)setError(cloudErrorMessage(e));}};void refresh();const timer=setInterval(refresh,10000);return()=>{active=false;clearInterval(timer);};},[onApproved]);
  const pending=options.find(o=>o.request?.status==='pending');
  return <div className="space-y-5"><img src="/brand/logo.svg" alt="" className="w-12 h-12"/><h2 className="text-2xl font-semibold">{pending?'Waiting for approval':'Join your shop team'}</h2>
    {pending?<div role="status" className="bg-amber-50 p-5 rounded-xl"><p>Your request for <strong>{pending.shops.find(s=>s.id===pending.request?.shopId)?.name||'your selected shop'}</strong> has been sent to the admin.</p><p className="text-sm mt-3">This screen will open your workspace automatically after approval.</p></div>:<><p className="text-sm text-stone-600">Select the shop you work with. Its admin will approve your access.</p>
      {options.some(o=>o.request?.status==='rejected')&&<p role="status">Your previous request was declined. Contact your admin or select a shop to request again.</p>}
      <form className="space-y-4" onSubmit={async e=>{e.preventDefault();if(busy||!selected)return;setBusy(true);setError('');try{const [ownerId,shopId]=JSON.parse(selected);const result=await supabase!.rpc('optical_join_request',{team_owner:ownerId,requested_shop:shopId});if(result.error)throw result.error;setOptions(prev=>prev.map(o=>o.ownerId===ownerId?{...o,request:{shopId,status:'pending'}}:o));}catch(e){setError(cloudErrorMessage(e));}finally{setBusy(false);}}}>
      <label className="block text-sm">Shop / Team<select required value={selected} onChange={e=>setSelected(e.target.value)} className="w-full border rounded-xl p-3 mt-2"><option value="">Select your shop</option>{options.map(o=><optgroup key={o.ownerId} label={o.name}>{o.shops.map(s=><option key={s.id} value={JSON.stringify([o.ownerId,s.id])}>{s.name}</option>)}</optgroup>)}</select></label>
      <button disabled={busy||!selected} className="bg-amber-700 text-white rounded-xl p-3 w-full disabled:opacity-50">{busy?'Sending…':'Request approval'}</button></form>
      {loaded&&!options.some(o=>o.shops.length>0)&&<p>No shops are available yet. Ask the admin to create shops inside the software.</p>}</>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
