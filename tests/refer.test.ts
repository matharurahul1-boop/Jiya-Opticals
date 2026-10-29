import test from 'node:test';
import assert from 'node:assert/strict';
import { referralUrl } from '../src/components/ReferButton';

test('the referral link carries who is referring', () => {
  assert.equal(referralUrl(), 'https://referral-umber.vercel.app/');
  assert.equal(referralUrl('  '), 'https://referral-umber.vercel.app/');
  const u = new URL(referralUrl('anil.k@example.com', 'Anil Kumar'));
  assert.equal(u.origin, 'https://referral-umber.vercel.app');
  assert.equal(u.searchParams.get('referrerEmail'), 'anil.k@example.com');
  assert.equal(u.searchParams.get('referrerName'), 'Anil Kumar');
});

test('the name falls back to the part of the email before the @', () => {
  assert.equal(new URL(referralUrl('shivam@x.com', '')).searchParams.get('referrerName'), 'shivam');
  assert.equal(new URL(referralUrl('shivam@x.com', 'shivam@x.com')).searchParams.get('referrerName'), 'shivam');
});
