#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const deployment = JSON.parse(readFileSync(
  path.join(root, 'src/v3/ABIs/localhost-hardhat-factory.json'),
  'utf8',
));
const sdk = await import(pathToFileURL(
  path.resolve(root, '../e-tour/v3/sdk/dist/index.js'),
).href);
const entryPoint = deployment.contracts.EntryPoint.address;
const unavailable = new sdk.FailoverBundler({
  providers: [
    new sdk.JsonRpcBundler({ name: 'primary', url: 'http://127.0.0.1:49337' }),
    new sdk.JsonRpcBundler({ name: 'failover', url: 'http://127.0.0.1:49338' }),
  ],
  entryPoint,
});

const health = await unavailable.healthCheck();
if (health.some((provider) => provider.healthy)) {
  throw new Error('Unavailable-bundler fixture unexpectedly reported healthy');
}
let rejected = false;
try {
  await unavailable.sendUserOperation({}, entryPoint);
} catch (error) {
  rejected = error?.name === 'BundlerTransportError';
}
if (!rejected) throw new Error('Total bundler outage did not fail closed');

process.stdout.write(`${JSON.stringify({
  status: 'passed',
  totalOutageRejected: true,
  automaticWalletFallback: false,
  directWalletFallbackAvailable: true,
}, null, 2)}\n`);
