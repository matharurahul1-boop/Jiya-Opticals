import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {cloudErrorMessage} from '../src/lib/cloudErrors';

test('cloud errors preserve messages and separate key, schema and credential failures',()=>{
  assert.equal(cloudErrorMessage({message:'Invalid login credentials'}),'Invalid login credentials');
  assert.match(cloudErrorMessage({message:'No API key found in request'}),/Running SQL will not fix/);
  assert.doesNotMatch(cloudErrorMessage({message:'No API key found in request'}),/Run supabase\/LIVE_SETUP/);
  assert.match(cloudErrorMessage({code:'PGRST202',message:'Function missing'}),/LIVE_SETUP/);
  assert.doesNotMatch(cloudErrorMessage({code:'42501',message:'Permission denied'}),/LIVE_SETUP/);
  assert.doesNotMatch(cloudErrorMessage({}),/object Object/);
});
test('installed SDK sends public key on both auth and workspace RPC requests',async()=>{
  const seen:string[]=[];
  const client=createClient('https://example.supabase.co','sb_publishable_test',{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(input,init)=>{assert.equal(new Headers(init?.headers).get('apikey'),'sb_publishable_test');seen.push(String(input));return new Response(JSON.stringify({message:'Test response'}),{status:400,headers:{'content-type':'application/json'}});}}
  });
  await client.auth.signInWithPassword({email:'test@example.com',password:'test-only'});
  await client.rpc('optical_team_list');
  assert.equal(seen.length,2);
  assert.ok(seen.some(url=>url.includes('/auth/v1/token')));
  assert.ok(seen.some(url=>url.includes('/rest/v1/rpc/optical_team_list')));
});
