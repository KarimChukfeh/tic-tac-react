#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const sdkRoot = path.join(frontendRoot, 'src', 'v3', 'vendor', 'sdk', 'dist');
const outputRoot = path.join(frontendRoot, 'src', 'v3', 'sdk', 'generated');
const check = process.argv.includes('--check');

function generateUserOperation() {
  const source = readFileSync(path.join(sdkRoot, 'user-operation.js'), 'utf8');
  return source
    .replace(
      'import { createRequire } from "module";',
      'import { V3_DEPLOYMENTS } from "../../config/deploymentLoader.js";',
    )
    .replace('const require = createRequire(import.meta.url);\n', '')
    .replace(
      'const SIMPLE_ACCOUNT_ARTIFACT = require("@account-abstraction/contracts/artifacts/SimpleAccount.json");',
      'const SIMPLE_ACCOUNT_ARTIFACT = { abi: V3_DEPLOYMENTS.shared.simpleAccountImplementation.abi };',
    )
    .replace(
      'const SIMPLE_ACCOUNT_FACTORY_ARTIFACT = require("@account-abstraction/contracts/artifacts/SimpleAccountFactory.json");',
      'const SIMPLE_ACCOUNT_FACTORY_ARTIFACT = { abi: V3_DEPLOYMENTS.shared.simpleAccountFactory.abi };',
    )
    .replace(/\n\/\/# sourceMappingURL=user-operation\.js\.map\s*$/u, '\n');
}

function generateSessionClient() {
  const source = readFileSync(path.join(sdkRoot, 'session-client.js'), 'utf8');
  return source
    .replace(
      /from "\.\/(?!user-operation\.js)([^"]+\.js)";/gu,
      'from "../../vendor/sdk/dist/$1";',
    )
    .replace(/\n\/\/# sourceMappingURL=session-client\.js\.map\s*$/u, '\n');
}

const outputs = new Map([
  ['user-operation.js', generateUserOperation()],
  ['session-client.js', generateSessionClient()],
]);

if (check) {
  for (const [fileName, expected] of outputs) {
    const outputPath = path.join(outputRoot, fileName);
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== expected) {
      throw new Error(`Generated V3 browser SDK entry is stale: ${fileName}`);
    }
  }
  process.stdout.write('Verified generated V3 browser SDK entries.\n');
} else {
  mkdirSync(outputRoot, { recursive: true });
  for (const [fileName, contents] of outputs) {
    writeFileSync(path.join(outputRoot, fileName), contents);
  }
  process.stdout.write('Generated browser-compatible V3 SDK session entries.\n');
}
