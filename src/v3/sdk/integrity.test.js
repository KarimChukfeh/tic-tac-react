import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SDK_ROOT = path.resolve(import.meta.dirname, '..', 'vendor', 'sdk');
const MANIFEST_PATH = path.join(SDK_ROOT, 'integrity.json');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function files(directory, relativeRoot = directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return files(entryPath, relativeRoot);
      if (!entry.isFile()) return [];
      const relativePath = path.relative(relativeRoot, entryPath).split(path.sep).join('/');
      if (['integrity.json', 'README.md'].includes(relativePath)) return [];
      const contents = fs.readFileSync(entryPath);
      return [{
        path: relativePath,
        bytes: contents.byteLength,
        sha256: sha256(contents),
      }];
    });
}

describe('vendored V3 SDK integrity', () => {
  it('matches every synchronized file and the deterministic tree hash', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const actualFiles = files(SDK_ROOT);

    expect(fs.readFileSync(path.join(SDK_ROOT, 'README.md'), 'utf8'))
      .toContain('Do not edit files in this directory manually.');
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.source.commit).toMatch(/^[0-9a-f]{40}$/u);
    expect(actualFiles).toEqual(manifest.files);

    const treeRecords = actualFiles.map((file) => ({
      ...file,
      path: file.path.replace(/^dist\//u, ''),
    }));
    const treeHash = sha256(treeRecords
      .map((file) => `${file.path}\0${file.bytes}\0${file.sha256}\n`)
      .join(''));
    expect(treeHash).toBe(manifest.treeSha256);
  });

  it('loads the immutable session entry through the generated browser entry', () => {
    const userOperationSource = fs.readFileSync(
      path.join(SDK_ROOT, 'dist', 'user-operation.js'),
      'utf8',
    );
    const adapterSource = fs.readFileSync(
      path.resolve(import.meta.dirname, 'adapter.js'),
      'utf8',
    );
    const generatedSource = fs.readFileSync(
      path.resolve(import.meta.dirname, 'generated', 'user-operation.js'),
      'utf8',
    );

    expect(userOperationSource).toContain('createRequire');
    expect(adapterSource).not.toContain("vendor/sdk/dist/index.js");
    expect(adapterSource).toContain("generated/session-client.js");
    expect(generatedSource).toContain('V3_DEPLOYMENTS.shared.simpleAccountFactory.abi');
    expect(generatedSource).not.toContain('privateKey');
  });
});
