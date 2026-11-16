// Bundles each *.test.jsx/js with esbuild (JSX + import.meta.env support) and runs them with `node --test`.
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
let esbuild;
for (const base of [root + '/', '/opt/npm-tools/node_modules/']) {
  try { esbuild = createRequire(base)('esbuild'); break; } catch { /* try next */ }
}
if (!esbuild) { console.error('esbuild not found - run `npm install` first'); process.exit(2); }

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'carevo-unit-'));
const entries = fs.readdirSync(here).filter((f) => /\.test\.jsx?$/.test(f)).map((f) => path.join(here, f));
await esbuild.build({
  entryPoints: entries, outdir: out, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' },
  jsx: 'automatic', loader: { '.js': 'jsx' }, logLevel: 'warning',
  nodePaths: [path.join(root, 'node_modules'), '/opt/npm-tools/node_modules'],
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://api.test/api"' },
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
const files = fs.readdirSync(out).filter((f) => f.endsWith('.mjs')).map((f) => path.join(out, f));
const args = ['--test', ...(process.env.UNIT_REPORT ? ['--test-reporter=spec'] : []), ...files];
const r = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
process.exit(r.status ?? 1);
