import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('cloud refresh applies server role on mobile resume and preserves unsaved edits', async () => {
  const refs: any[] = [], states: any[] = [], effects: (() => any)[] = [];
  const timers = new Map<number, () => Promise<void>>();
  const events = new Map<string, () => any>();
  let refIndex = 0, stateIndex = 0, mounted = false;
  let response: any;
  const react = {
    useRef: (value: any) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: value }),
    useState: (value: any) => {
      const i = stateIndex++;
      if (!mounted) states[i] = value;
      return [states[i], (next: any) => { states[i] = next; }];
    },
    useEffect: (fn: () => any) => { if (!mounted) effects.push(fn); },
  };
  const target = {
    setInterval: (fn: () => Promise<void>, ms: number) => { timers.set(ms, fn); return ms; },
    clearInterval: (ms: number) => timers.delete(ms),
    addEventListener: (name: string, fn: () => any) => events.set(name, fn),
    removeEventListener: (name: string) => events.delete(name),
    visibilityState: 'visible',
  };
  const exported: any = {};
  const source = ts.transpileModule(readFileSync('src/lib/workspace.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports: exported, window: target, document: target,
    require: (name: string) => name === 'react' ? react : name === './supabase'
      ? { supabase: { rpc: async () => response } } : {},
  });
  const applied: any[] = [];
  const render = (snapshot: any) => {
    refIndex = 0; stateIndex = 0;
    return exported.useCloudSave('owner', 1, snapshot, (data: any, user: any) => applied.push({ data, user }));
  };
  render({ shops: ['a'] });
  const cleanup = effects.map(fn => fn()); mounted = true;
  response = { data: { version: 2, data: { shops: ['a', 'b'] }, user: { role: 'Admin' } } };
  events.get('visibilitychange')!();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(applied[0].user.role, 'Admin');
  assert.equal(JSON.stringify(applied[0].data.shops), '["a","b"]');
  render({ shops: ['a', 'b'] });
  response = { data: { version: 3, data: { shops: ['a'] }, user: { role: 'Shop Manager' } } };
  await events.get('focus')!();
  assert.equal(applied[1].user.role, 'Shop Manager');
  render({ shops: ['a'], unsaved: true });
  response = { data: { version: 4, data: { shops: ['b'] }, user: { role: 'Admin' } } };
  await timers.get(30000)!();
  assert.equal(applied.length, 2, 'do not overwrite edits when permissions change');
  assert.ok(states.includes('Reload required'));
  cleanup.forEach(fn => fn?.());
  assert.equal(events.size, 0);
  assert.equal(timers.size, 0);
});
