import test from 'node:test';
import assert from 'node:assert/strict';
import { branchCode, companyCode, financialYear, invoiceNoPrefix, nextInvoiceNo } from '../src/lib/invoiceNo';

test('financial year runs 1 April to 31 March', () => {
  assert.equal(financialYear(new Date(2026, 9, 15)), '26-27');
  assert.equal(financialYear(new Date(2026, 3, 1)), '26-27');
  assert.equal(financialYear(new Date(2027, 2, 31)), '26-27');
  assert.equal(financialYear(new Date(2027, 3, 1)), '27-28');
  assert.equal(financialYear(new Date(2026, 2, 31)), '25-26');
});

test('company and branch codes', () => {
  assert.equal(companyCode('Jiya Opticals'), 'JO');
  assert.equal(companyCode('JIYA OPTICALS'), 'JO');
  assert.equal(companyCode('Vision Hub Opticals'), 'VHO');
  assert.equal(companyCode('Jiya Opticals', 'jo-x'), 'JOX');
  assert.equal(branchCode('Centre 1'), 'C1');
  assert.equal(branchCode('Centre 2 (Gurugram)'), 'C2');
  assert.equal(branchCode('Centre 3 - Delhi'), 'C3');
  assert.equal(branchCode('Main Branch'), 'MB');
});

test('numbers run per branch and restart each financial year', () => {
  const prefix = invoiceNoPrefix({ storeName: 'Jiya Opticals', shopName: 'Centre 1', date: new Date(2026, 9, 15) });
  assert.equal(prefix, 'JO/26-27/C1/');
  assert.equal(nextInvoiceNo(prefix, []), 'JO/26-27/C1/001');
  const existing = [{ invoiceNo: 'JO/26-27/C1/001' }, { invoiceNo: 'JO/26-27/C1/002' }, { invoiceNo: 'JO/26-27/C2/009' }, { invoiceNo: 'INV/25-26/1041' }];
  assert.equal(nextInvoiceNo(prefix, existing), 'JO/26-27/C1/003');
  assert.equal(nextInvoiceNo('JO/26-27/C2/', existing), 'JO/26-27/C2/010');
  assert.equal(nextInvoiceNo('JO/27-28/C1/', existing), 'JO/27-28/C1/001');
});
