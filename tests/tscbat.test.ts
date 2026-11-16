import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTscBat, DEFAULT_TSC_PRINTER } from '../src/lib/tscBat';

const job = 'SIZE 100 mm,15 mm\r\nCLS\r\nTEXT 264,10,"3",0,1,1,"RAY-BAN & CO"\r\nPRINT 1,1\r\n';

test('the print file carries the job as base64 that decodes to the exact bytes', () => {
  const bat = buildTscBat(job, 'TSC TTP-244 Pro');
  const lines = bat.split('\r\n');
  const b64 = lines.filter((l) => l.startsWith('>>"%JIYA_B64%" echo ')).map((l) => l.slice('>>"%JIYA_B64%" echo '.length)).join('');
  assert.equal(Buffer.from(b64, 'base64').toString('utf8'), job);
  assert.ok(lines.includes('set "JIYA_PRINTER=TSC TTP-244 Pro"'));
});

test('long jobs are split so no batch line is longer than cmd allows', () => {
  const big = 'TEXT 1,1,"3",0,1,1,"X"\r\n'.repeat(5000);
  const bat = buildTscBat(big, DEFAULT_TSC_PRINTER);
  assert.ok(bat.split('\r\n').every((l) => l.length < 4000 || !l.startsWith('>>')));
  const b64 = bat.split('\r\n').filter((l) => l.startsWith('>>"%JIYA_B64%" echo ')).map((l) => l.slice(20)).join('');
  assert.equal(Buffer.from(b64, 'base64').toString('utf8'), big);
});

test('the printer name cannot inject batch syntax, and an empty name falls back to the default', () => {
  assert.ok(buildTscBat(job, 'A" & del x & "B').includes('set "JIYA_PRINTER=A  del x  B"'));
  assert.ok(buildTscBat(job, '  ').includes(`set "JIYA_PRINTER=${DEFAULT_TSC_PRINTER}"`));
});

test('the PowerShell that sends the job follows the marker, after the batch file has exited', () => {
  const bat = buildTscBat(job, DEFAULT_TSC_PRINTER);
  assert.ok(bat.indexOf('exit /b 0') < bat.lastIndexOf('#PS-START'));
  assert.ok(bat.slice(bat.lastIndexOf('#PS-START')).includes('RAW'));
});
