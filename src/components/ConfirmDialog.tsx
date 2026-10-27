import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export interface AskOptions {
  title: string;
  /** Anything to show under the title: text, a list, a summary box. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for deleting things. */
  danger?: boolean;
  /** A notice with a single OK button (nothing to decide). */
  notice?: boolean;
}

function Dialog({ options, onResult }: { options: AskOptions; onResult: (ok: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (options.notice ? okRef : cancelRef).current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onResult(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [options.notice, onResult]);
  const Icon = options.danger ? AlertTriangle : Info;
  return (
    <div className="fixed inset-0 z-[70] bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4" onClick={() => onResult(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={options.title}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-5 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3">
          <span className={'shrink-0 w-10 h-10 rounded-full flex items-center justify-center ' + (options.danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700')}><Icon className="w-5 h-5" /></span>
          <h3 className="text-base font-bold text-stone-900 leading-snug pt-1.5">{options.title}</h3>
        </div>
        {options.body && <div className="text-sm text-stone-600 space-y-3">{options.body}</div>}
        <div className={'grid gap-2 pt-1 ' + (options.notice ? 'grid-cols-1' : 'grid-cols-2')}>
          {!options.notice && (
            <button ref={cancelRef} type="button" onClick={() => onResult(false)} className="py-3 rounded-xl border border-stone-300 bg-white text-stone-800 font-bold text-sm">{options.cancelLabel || 'Cancel'}</button>
          )}
          <button ref={okRef} type="button" onClick={() => onResult(true)} className={'py-3 rounded-xl text-white font-bold text-sm ' + (options.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700')}>{options.confirmLabel || (options.notice ? 'OK' : 'Confirm')}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * A friendlier replacement for the browser's confirm() and alert(): a bottom sheet on phones, a card on desktop.
 * `const [ask, dialog] = useAsk();` then render {dialog} once and `if (await ask({...})) ...`.
 */
export function useAsk(): [(options: AskOptions) => Promise<boolean>, React.ReactNode] {
  const [options, setOptions] = useState<AskOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = useCallback((next: AskOptions) => new Promise<boolean>((resolve) => { resolver.current = resolve; setOptions(next); }), []);
  const finish = useCallback((ok: boolean) => { const resolve = resolver.current; resolver.current = null; setOptions(null); resolve?.(ok); }, []);
  return [ask, options ? <Dialog options={options} onResult={finish} /> : null];
}

/** A small label/value row for the summary inside a dialog. */
export function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><span className="text-stone-500">{label}</span><span className={'text-right break-words min-w-0 ' + (strong ? 'font-bold text-stone-900' : 'text-stone-800')}>{value}</span></div>;
}
