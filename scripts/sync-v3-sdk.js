#!/usr/bin/env node

import {
  createHash,
} from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const destinationRoot = path.join(frontendRoot, 'src', 'v3', 'vendor', 'sdk');
const manifestPath = path.join(destinationRoot, 'integrity.json');
const noticePath = path.join(destinationRoot, 'README.md');
const GENERATED_NOTICE = `# Generated V3 SDK

Do not edit files in this directory manually.

Run \`npm run v3:sdk:sync\` with the backend repository available to rebuild
and synchronize the SDK, or \`npm run v3:sdk:check\` to verify integrity.
`;

function parseArguments(argv) {
  const options = {
    backendRoot: path.resolve(frontendRoot, '..', 'e-tour'),
    build: true,
    check: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--backend-root' && argv[index + 1]) {
      options.backendRoot = path.resolve(argv[index + 1]);
      index += 1;
    } else if (argument === '--skip-build') {
      options.build = false;
    } else if (argument === '--check') {
      options.check = true;
      options.build = false;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function walkFiles(directory, relativeRoot = directory) {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(entryPath, relativeRoot);
      if (!entry.isFile()) return [];
      return [path.relative(relativeRoot, entryPath).split(path.sep).join('/')];
    });
}

function fileRecords(directory, excluded = new Set()) {
  return walkFiles(directory)
    .filter((fileName) => !excluded.has(fileName))
    .map((fileName) => {
      const contents = readFileSync(path.join(directory, fileName));
      return {
        path: fileName,
        bytes: contents.byteLength,
        sha256: sha256(contents),
      };
    });
}

function treeHash(files) {
  return sha256(files
    .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
    .join(''));
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout.trim();
}

function readBackendMetadata(backendRoot) {
  const packagePath = path.join(backendRoot, 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error(`Backend package not found at ${packagePath}`);
  }
  const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));
  const commit = run('git', ['rev-parse', 'HEAD'], backendRoot);
  const dirty = run('git', ['status', '--porcelain=v1', '--untracked-files=no'], backendRoot) !== '';
  return {
    repository: packageData.name || 'e-tour',
    repositoryVersion: packageData.version || null,
    commit,
    dirty,
  };
}

function buildBackendSdk(backendRoot) {
  const compiler = path.join(backendRoot, 'node_modules', '.bin', 'tsc');
  const config = path.join(backendRoot, 'v3', 'sdk', 'tsconfig.json');
  if (!existsSync(compiler) || !existsSync(config)) {
    throw new Error('Backend TypeScript compiler or V3 SDK tsconfig is missing');
  }
  run(compiler, ['--project', config], backendRoot);
}

function syncSdk(options) {
  const sourceRoot = path.join(options.backendRoot, 'v3', 'sdk', 'dist');
  if (options.build) buildBackendSdk(options.backendRoot);
  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
    throw new Error(`Built backend SDK not found at ${sourceRoot}`);
  }

  const metadata = readBackendMetadata(options.backendRoot);
  const files = fileRecords(sourceRoot);
  if (!files.some((file) => file.path === 'index.js')) {
    throw new Error('Backend SDK dist is missing index.js');
  }
  if (!files.some((file) => file.path === 'index.d.ts')) {
    throw new Error('Backend SDK dist is missing index.d.ts');
  }

  rmSync(destinationRoot, { recursive: true, force: true });
  mkdirSync(destinationRoot, { recursive: true });
  cpSync(sourceRoot, path.join(destinationRoot, 'dist'), {
    recursive: true,
    force: true,
  });
  writeFileSync(noticePath, GENERATED_NOTICE);

  const manifest = {
    schemaVersion: 1,
    source: {
      ...metadata,
      sdkPath: 'v3/sdk/dist',
    },
    files: files.map((file) => ({
      ...file,
      path: `dist/${file.path}`,
    })),
    treeSha256: treeHash(files),
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(
    `Synced ${files.length} SDK files from ${metadata.commit.slice(0, 12)} (${manifest.treeSha256}).\n`,
  );
}

function checkSdk() {
  if (!existsSync(manifestPath)) {
    throw new Error(`SDK integrity manifest is missing at ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f]{40}$/u.test(manifest.source?.commit || '')) {
    throw new Error('SDK integrity manifest metadata is invalid');
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error('SDK integrity manifest has no files');
  }

  if (readFileSync(noticePath, 'utf8') !== GENERATED_NOTICE) {
    throw new Error('Vendored SDK generated-file notice is missing or modified');
  }
  const actualFiles = fileRecords(
    destinationRoot,
    new Set(['integrity.json', 'README.md']),
  );
  const expectedFiles = manifest.files;
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error('Vendored SDK files do not match integrity.json');
  }
  const distRecords = actualFiles.map((file) => ({
    ...file,
    path: file.path.replace(/^dist\//u, ''),
  }));
  if (treeHash(distRecords) !== manifest.treeSha256) {
    throw new Error('Vendored SDK tree hash does not match integrity.json');
  }
  process.stdout.write(
    `Verified ${actualFiles.length} SDK files (${manifest.treeSha256}).\n`,
  );
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.check) checkSdk();
  else syncSdk(options);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
