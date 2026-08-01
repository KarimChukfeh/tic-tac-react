import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const v3Root = path.join(root, 'src', 'v3');
const failures = [];

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  if (fs.statSync(directory).isFile()) return [directory];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

const sourceFiles = filesUnder(v3Root).filter((file) => (
  /\.(?:js|jsx)$/u.test(file)
  && !/\.(?:test|spec)\.(?:js|jsx)$/u.test(file)
  && !file.includes(`${path.sep}vendor${path.sep}`)
  && !file.includes(`${path.sep}generated${path.sep}`)
));
const unsafeSinks = [
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/u],
  ['innerHTML assignment', /\.innerHTML\s*=/u],
  ['eval', /\beval\s*\(/u],
  ['Function constructor', /\bnew\s+Function\s*\(/u],
  ['document.write', /\bdocument\.write\s*\(/u],
];

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [label, pattern] of unsafeSinks) {
    if (pattern.test(source)) failures.push(`${path.relative(root, file)}: ${label}`);
  }
}

const headerPath = path.join(root, 'public', '_headers');
const headers = fs.existsSync(headerPath) ? fs.readFileSync(headerPath, 'utf8') : '';
for (const directive of [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  'connect-src',
]) {
  if (!headers.includes(directive)) failures.push(`CSP is missing ${directive}`);
}
if (/script-src[^\n;]*(?:'unsafe-inline'|'unsafe-eval')/u.test(headers)) {
  failures.push('CSP permits unsafe inline/eval scripts');
}

const secretTargets = [
  path.join(v3Root, 'logs.txt'),
  path.join(v3Root, 'evidence'),
  path.join(root, 'dist'),
];
const knownLocalMnemonic = /test test test test test test test test test test test junk/iu;
const labeledPrivateKey = /(?:private[_ -]?key|secret[_ -]?key)\s*[:=]\s*["']?0x[0-9a-f]{64}/iu;
for (const file of secretTargets.flatMap(filesUnder)) {
  if (!fs.statSync(file).isFile()) continue;
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  const source = bytes.toString('utf8');
  if (knownLocalMnemonic.test(source) || labeledPrivateKey.test(source)) {
    failures.push(`${path.relative(root, file)}: test wallet secret material`);
  }
}

const maps = filesUnder(path.join(root, 'dist')).filter((file) => file.endsWith('.map'));
if (maps.length) failures.push(`production sourcemaps present: ${maps.length}`);

if (failures.length) {
  console.error(`V3 security check failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`V3 security check passed (${sourceFiles.length} production source files scanned).`);
}
