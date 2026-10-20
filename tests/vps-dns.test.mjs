import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureWebDns, planWebDns } from '../deploy/vps/porkbun-apex.mjs';

const initial = [
  { id: '10', name: 'freedomsword.org', type: 'A', content: '216.198.79.1' },
  { id: '11', name: 'api.freedomsword.org', type: 'CNAME', content: 'vercel.example' },
  { id: '12', name: '*.freedomsword.org', type: 'CNAME', content: 'pixie.porkbun.com' },
  { id: '13', name: 'freedomsword.org', type: 'MX', content: 'mail.example' },
];

test('plans apex, www and api without changing unrelated records', () => {
  assert.deepEqual(planWebDns(initial).map(({ action, label }) => [action, label]), [
    ['edit', 'apex'], ['create', 'www'], ['edit', 'api'],
  ]);
  assert.throws(() => planWebDns([...initial, { ...initial[0], id: '14' }]));
  assert.throws(() => planWebDns([...initial, { id: '14', name: 'freedomsword.org', type: 'AAAA', content: '::1' }]));
  assert.throws(() => planWebDns([...initial, { id: '14', name: 'www.freedomsword.org', type: 'AAAA', content: '::1' },
    { id: '15', name: 'www.freedomsword.org', type: 'A', content: '1.2.3.4' }]));
});

test('dry run validates all writes and apply verifies resulting zone', async () => {
  let records = structuredClone(initial);
  const calls = [];
  const request = async (url, options) => {
    if (url.endsWith('/retrieve/freedomsword.org'))
      return { ok: true, json: async () => ({ status: 'SUCCESS', records }) };
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    if (!body.dryRun) {
      if (url.endsWith('/create/freedomsword.org'))
        records.push({ id: '20', name: `www.freedomsword.org`, ...body });
      else {
        const id = url.split('/').at(-1);
        records = records.map((record) => record.id === id ? { ...record, ...body } : record);
      }
    }
    return { ok: true, json: async () => ({ status: 'SUCCESS', wouldSucceed: true }) };
  };
  const dryRun = await configureWebDns({ apiKey: 'api', secretKey: 'secret', apply: false, request });
  assert.equal(dryRun.changed, false);
  assert.equal(calls.length, 3);
  assert(calls.every(({ body }) => body.dryRun));
  const applied = await configureWebDns({ apiKey: 'api', secretKey: 'secret', apply: true, request });
  assert.equal(applied.changed, true);
  assert.equal(calls.length, 9);
  assert.deepEqual(planWebDns(records), []);
  assert.equal(records.find((record) => record.type === 'MX').content, 'mail.example');
});
