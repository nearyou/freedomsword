#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const domain = 'freedomsword.org';
const target = '45.61.162.179';
const baseUrl = 'https://api.porkbun.com/api/json/v3';

export function selectApexA(records) {
  const matches = records.filter((record) =>
    record.type === 'A' && ['', '@', domain, `${domain}.`].includes(record.name));
  if (matches.length !== 1 || !/^\d+$/.test(String(matches[0].id)))
    throw new Error(`Expected exactly one editable apex A record; found ${matches.length}.`);
  return matches[0];
}

export async function switchApexA({ apiKey, secretKey, apply, request = fetch }) {
  if (!apiKey || !secretKey) throw new Error('Set PORKBUN_API_KEY and PORKBUN_SECRET_API_KEY.');
  const read = await request(`${baseUrl}/dns/retrieve/${domain}`, {
    headers: { 'X-API-Key': apiKey, 'X-Secret-API-Key': secretKey },
  });
  const current = await read.json();
  if (!read.ok || current.status !== 'SUCCESS' || !Array.isArray(current.records))
    throw new Error(`Porkbun DNS read failed: ${current.message ?? read.status}`);
  const record = selectApexA(current.records);
  if (record.content === target) return { changed: false, from: record.content, to: target };

  const editUrl = `${baseUrl}/dns/edit/${domain}/${record.id}`;
  const editBody = { apikey: apiKey, secretapikey: secretKey, content: target, ttl: 600 };
  const write = async (dryRun) => {
    const response = await request(editUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editBody, dryRun }),
    });
    const result = await response.json();
    if (!response.ok || result.status !== 'SUCCESS' || result.wouldSucceed === false)
      throw new Error(`Porkbun DNS edit failed: ${result.message ?? response.status}`);
  };
  await write(true);
  if (apply) await write(false);
  return { changed: apply, from: record.content, to: target };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const apply = process.argv.includes('--apply');
  if (process.argv.some((argument, index) => index > 1 && argument !== '--apply')) {
    console.error('Usage: node deploy/vps/porkbun-apex.mjs [--apply]');
    process.exitCode = 1;
  } else {
    switchApexA({
      apiKey: process.env.PORKBUN_API_KEY,
      secretKey: process.env.PORKBUN_SECRET_API_KEY,
      apply,
    }).then((result) => {
      if (result.from === result.to) console.log(`Apex A already points to ${result.to}.`);
      else if (result.changed) console.log(`Apex A changed from ${result.from} to ${result.to}.`);
      else console.log(`Dry run passed: apex A ${result.from} -> ${result.to}. Run with --apply to switch DNS.`);
    }).catch((error) => {
      console.error(error instanceof Error ? error.message : 'Porkbun DNS request failed.');
      process.exitCode = 1;
    });
  }
}
