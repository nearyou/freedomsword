#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const domain = 'freedomsword.org';
const target = '45.61.162.179';
const baseUrl = 'https://api.porkbun.com/api/json/v3';
const webTypes = new Set(['A', 'AAAA', 'CNAME', 'ALIAS']);

function recordsAt(records, label) {
  const names = label ? [label, `${label}.${domain}`] : ['', '@', domain];
  return records.filter((record) =>
    webTypes.has(record.type) && names.includes(String(record.name).replace(/\.$/, '').toLowerCase()));
}

export function planWebDns(records) {
  const apex = recordsAt(records, '');
  if (apex.length !== 1 || apex[0].type !== 'A' || !/^\d+$/.test(String(apex[0].id)))
    throw new Error('Expected exactly one apex A record and no conflicting apex web records.');

  const changes = [];
  if (apex[0].content !== target)
    changes.push({ action: 'edit', label: 'apex', id: apex[0].id, body: { content: target, ttl: 600 } });

  for (const label of ['www', 'api']) {
    const current = recordsAt(records, label);
    if (current.length > 1 || (current.length === 1 && !/^\d+$/.test(String(current[0].id))))
      throw new Error(`Ambiguous ${label} DNS records; refusing to change them.`);
    if (current.length === 0) {
      changes.push({ action: 'create', label, body: { name: label, type: 'CNAME', content: domain, ttl: 600 } });
    } else if (current[0].type !== 'CNAME' || current[0].content.replace(/\.$/, '') !== domain) {
      changes.push({ action: 'edit', label, id: current[0].id,
        body: { type: 'CNAME', content: domain, ttl: 600 } });
    }
  }
  return changes;
}

export async function configureWebDns({ apiKey, secretKey, apply, request = fetch }) {
  if (!apiKey || !secretKey) throw new Error('Set PORKBUN_API_KEY and PORKBUN_SECRET_API_KEY.');
  const read = async () => {
    const response = await request(`${baseUrl}/dns/retrieve/${domain}`, {
      headers: { 'X-API-Key': apiKey, 'X-Secret-API-Key': secretKey },
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'SUCCESS' || !Array.isArray(result.records))
      throw new Error(`Porkbun DNS read failed: ${result.message ?? response.status}`);
    return result.records;
  };
  const changes = planWebDns(await read());
  const write = async (change, dryRun) => {
    const url = `${baseUrl}/dns/${change.action}/${domain}${change.id ? `/${change.id}` : ''}`;
    const response = await request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apikey: apiKey, secretapikey: secretKey, ...change.body, dryRun }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'SUCCESS' || result.wouldSucceed === false)
      throw new Error(`Porkbun ${change.label} DNS ${change.action} failed: ${result.message ?? response.status}`);
    if (result.warnings?.length) throw new Error(`Porkbun ${change.label} DNS warning: ${result.warnings.join('; ')}`);
  };
  for (const change of changes) await write(change, true);
  if (apply) {
    for (const change of changes) await write(change, false);
    const remaining = planWebDns(await read());
    if (remaining.length) throw new Error(`Porkbun DNS verification failed for: ${remaining.map((x) => x.label).join(', ')}`);
  }
  return { changed: apply && changes.length > 0, changes };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const apply = process.argv.includes('--apply');
  if (process.argv.some((argument, index) => index > 1 && argument !== '--apply')) {
    console.error('Usage: node deploy/vps/porkbun-apex.mjs [--apply]');
    process.exitCode = 1;
  } else {
    configureWebDns({
      apiKey: process.env.PORKBUN_API_KEY,
      secretKey: process.env.PORKBUN_SECRET_API_KEY,
      apply,
    }).then(({ changes }) => {
      if (!changes.length) console.log('Apex, www and api DNS records already point to the VPS.');
      else console.log(`${apply ? 'Applied' : 'Dry run passed for'}: ${changes.map((x) => x.label).join(', ')}.`);
    }).catch((error) => {
      console.error(error instanceof Error ? error.message : 'Porkbun DNS request failed.');
      process.exitCode = 1;
    });
  }
}
