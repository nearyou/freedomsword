import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectApexA, switchApexA } from '../deploy/vps/porkbun-apex.mjs';

test('selects only the apex A record and refuses ambiguous changes', () => {
  const records = [
    { id: '10', name: 'freedomsword.org', type: 'A', content: '216.198.79.1' },
    { id: '11', name: 'api.freedomsword.org', type: 'CNAME', content: 'vercel.example' },
    { id: '12', name: 'freedomsword.org', type: 'MX', content: 'mail.example' },
  ];
  assert.equal(selectApexA(records).id, '10');
  assert.throws(() => selectApexA([...records, { ...records[0], id: '13' }]));
});

test('dry run and apply edit only the selected apex A record', async () => {
  const calls = [];
  const request = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => calls.length === 1
        ? { status: 'SUCCESS', records: [{ id: '10', name: 'freedomsword.org', type: 'A', content: '216.198.79.1' }] }
        : { status: 'SUCCESS', wouldSucceed: true },
    };
  };
  const result = await switchApexA({ apiKey: 'api', secretKey: 'secret', apply: true, request });
  assert.equal(result.changed, true);
  assert.equal(calls.length, 3);
  assert.match(calls[1].url, /\/dns\/edit\/freedomsword\.org\/10$/);
  assert.equal(JSON.parse(calls[1].options.body).dryRun, true);
  assert.equal(JSON.parse(calls[2].options.body).dryRun, false);
  assert.equal(JSON.parse(calls[2].options.body).content, '45.61.162.179');
});
