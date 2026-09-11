import React, { useEffect, useRef, useState } from 'react';
export function NumberInput({value,onChange,onFocus,onBlur,...props}:React.InputHTMLAttributes<HTMLInputElement>) {
  const format=(v:typeof value)=>v===0||v==='0'?'':String(v??'');
  const [draft,setDraft]=useState(()=>format(value));
  const focused=useRef(false);
  useEffect(()=>{if(!focused.current)setDraft(format(value));},[value]);
  return <input {...props} type="number" value={draft}
    onFocus={e=>{focused.current=true;onFocus?.(e);}}
    onChange={e=>{setDraft(e.target.value);onChange?.(e);}}
    onBlur={e=>{focused.current=false;onBlur?.(e);}} />;
}
