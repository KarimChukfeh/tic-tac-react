import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');

describe('V3 production security policy', () => {
  it('ships an HTTP-header CSP with narrow script and object policies', () => {
    const headers = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("script-src 'self'");
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).not.toMatch(/script-src[^\n;]*unsafe-/u);
  });

  it('keeps security checks in the release gate', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(packageJson.scripts['v3:release:check']).toContain('v3:security:check');
  });
});
