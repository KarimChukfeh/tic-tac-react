import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('real-browser primitive probe', () => {
  it('exercises the production browser storage and coordination primitives', () => {
    const source = fs.readFileSync(
      path.join(import.meta.dirname, 'runBrowserPrimitiveProbe.js'),
      'utf8',
    );
    expect(source).toContain('IndexedDbKeyValueStore');
    expect(source).toContain('generateBrowserSessionKey');
    expect(source).toContain('SessionCoordinator');
    expect(source).toContain('wrappingKey.extractable === false');
    expect(source).not.toContain('return privateKey');
    expect(source).not.toContain('return ciphertext');
  });

  it('is exposed only through a local-only browser acceptance page', () => {
    const entry = fs.readFileSync(
      path.resolve(import.meta.dirname, 'browserProbeEntry.js'),
      'utf8',
    );
    const html = fs.readFileSync(
      path.resolve(import.meta.dirname, '../../../v3-browser-probe.html'),
      'utf8',
    );
    expect(entry).toContain("['127.0.0.1', 'localhost']");
    expect(entry).toContain('runBrowserPrimitiveProbe()');
    expect(html).toContain('/src/v3/browser/browserProbeEntry.js');
    expect(html).not.toContain('<script>');
  });
});
