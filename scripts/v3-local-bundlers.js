#!/usr/bin/env node

import { createServer } from 'node:http';
import {
  existsSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  Contract,
  HDNodeWallet,
  JsonRpcProvider,
  NonceManager,
} from 'ethers';
import { createRequestSerializer } from '../src/v3/integration/serializeRequests.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const backendRoot = path.resolve(frontendRoot, '..', 'e-tour');
const localBundlerModule = path.join(backendRoot, 'v3', 'sdk', 'dist', 'local-bundler.js');
const deploymentPath = path.join(frontendRoot, 'src', 'v3', 'ABIs', 'hardhat-factory.json');
const RPC_URL = process.env.V3_RPC_URL || 'http://127.0.0.1:8545';
const PRIMARY_PORT = Number(process.env.V3_BUNDLER_PRIMARY_PORT || 4337);
const FAILOVER_PORT = Number(process.env.V3_BUNDLER_FAILOVER_PORT || 4338);
const PRIMARY_SIGNER_INDEX = Number(
  process.env.V3_BUNDLER_PRIMARY_SIGNER_INDEX || 240,
);
const FAILOVER_SIGNER_INDEX = Number(
  process.env.V3_BUNDLER_FAILOVER_SIGNER_INDEX || 241,
);
const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';

function json(value) {
  return JSON.stringify(value, (_key, item) => (
    typeof item === 'bigint' ? `0x${item.toString(16)}` : item
  ));
}

function errorDiagnostics(error) {
  const details = [];
  const seen = new WeakSet();

  function visit(value) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized && !details.includes(normalized)) details.push(normalized);
      return;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);

    for (const key of ['shortMessage', 'reason', 'message', 'data']) {
      visit(value[key]);
    }
    visit(value.error);
    visit(value.info);
    visit(value.cause);
  }

  visit(error);
  return details.slice(0, 12);
}

export function createBundlerHttpServer({ name, bundler }) {
  const serializeRequest = createRequestSerializer();

  return createServer(async (request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'content-type');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Private-Network', 'true');
    response.setHeader('Content-Type', 'application/json');

    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method === 'GET') {
      response.end(json({ name, status: 'ready' }));
      return;
    }
    if (request.method !== 'POST') {
      response.writeHead(405);
      response.end(json({ error: 'Method not allowed' }));
      return;
    }

    let payload;
    try {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await serializeRequest(() => bundler.request({
          method: payload.method,
          params: payload.params || [],
        }));
      response.end(json({
        jsonrpc: '2.0',
        id: payload.id ?? null,
        result,
      }));
    } catch (error) {
      const diagnostics = errorDiagnostics(error);
      process.stderr.write(
        `${name} ${error?.name || 'Error'}: ${diagnostics.join(' | ')}\n`,
      );
      response.end(json({
        jsonrpc: '2.0',
        id: payload?.id ?? null,
        error: {
          code: Number(error?.code) || -32603,
          message: error?.message || 'Local bundler request failed',
          data: diagnostics,
        },
      }));
    }
  });
}

async function start() {
  if (!existsSync(localBundlerModule)) {
    throw new Error(
      `Backend V3 SDK is required at ${localBundlerModule}. Build the sibling e-tour repository first.`,
    );
  }
  const deployment = JSON.parse(readFileSync(deploymentPath, 'utf8'));
  const entryPoint = deployment.contracts?.EntryPoint;
  if (!entryPoint?.address || !entryPoint?.abi) {
    throw new Error('The synchronized V3 deployment is missing EntryPoint metadata');
  }

  const { LocalBundler } = await import(pathToFileURL(localBundlerModule).href);
  const provider = new JsonRpcProvider(RPC_URL, 412346, { staticNetwork: true });
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 412346) {
    throw new Error(`Expected local V3 chain 412346, received ${network.chainId}`);
  }

  const entryPointContract = new Contract(entryPoint.address, entryPoint.abi, provider);
  const configurations = [
    { name: 'HardhatBundlerA', port: PRIMARY_PORT, signerIndex: PRIMARY_SIGNER_INDEX },
    { name: 'HardhatBundlerB', port: FAILOVER_PORT, signerIndex: FAILOVER_SIGNER_INDEX },
  ];
  const signerIndexes = new Set(configurations.map(({ signerIndex }) => signerIndex));
  if (
    signerIndexes.size !== configurations.length
    || configurations.some(({ signerIndex }) => (
      !Number.isInteger(signerIndex) || signerIndex < 0 || signerIndex >= 250
    ))
  ) {
    throw new Error('V3 bundler signer indexes must be distinct integers from 0 through 249');
  }

  for (const configuration of configurations) {
    const wallet = HDNodeWallet.fromPhrase(
      HARDHAT_MNEMONIC,
      undefined,
      `m/44'/60'/0'/0/${configuration.signerIndex}`,
    ).connect(provider);
    const signer = new NonceManager(wallet);
    const bundler = new LocalBundler({
      entryPoint: entryPointContract,
      bundlerSigner: signer,
      beneficiary: wallet.address,
    });
    const server = createBundlerHttpServer({
      name: configuration.name,
      bundler,
    });
    server.listen(configuration.port, '127.0.0.1', () => {
      process.stdout.write(
        `${configuration.name} listening at http://127.0.0.1:${configuration.port}\n`,
      );
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
