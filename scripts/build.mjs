import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { build } from 'esbuild';

// Local .env is optional; Vercel injects these values in the build environment.
try { process.loadEnvFile(new URL('../.env', import.meta.url)); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before building. See .env.example.');
if (new URL(url).protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
if (!key.startsWith('sb_publishable_')) throw new Error('Use the Supabase publishable key (sb_publishable_); secret and service-role keys are forbidden.');

let html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
let applicationScript='';
for (const [, script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  new Script(script);
  if(script.trim()) applicationScript+=script;
}
html=html.replace(/<script>([\s\S]*?)<\/script>/gi,'<script src="/app.js"></script>');
const output = new URL('../dist/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(new URL('app.js',output),applicationScript);
await build({
  entryPoints:[new URL('../src/backend.mjs',import.meta.url).pathname],
  outfile:new URL('backend.js',output).pathname,
  bundle:true, minify:true, platform:'browser', target:'es2022',
  define:{SUPABASE_URL:JSON.stringify(url), SUPABASE_PUBLISHABLE_KEY:JSON.stringify(key)}
});
await writeFile(new URL('index.html', output), html);
console.log('Built dist/index.html; inline JavaScript syntax checked.');
