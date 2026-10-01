// Runs the actual handlers against an isolated synthetic store, never .env.
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, extname, sep } from 'node:path';

const scratch = mkdtempSync(join(tmpdir(), 'wds-validation-e2e-'));
process.env.TEMP = scratch;
process.env.TMP = scratch;
process.env.TMPDIR = scratch;
process.env.DEMO_MODE = '1';
process.env.NETLIFY_DEV = 'true';
process.env.CONTEXT = 'dev';
for (const key of Object.keys(process.env)) {
  if (/^(GOOGLE_|TELEGRAM_|PORTAL_PASSWORD|WDS_INTRO_DOC_ID)/.test(key)) delete process.env[key];
}
globalThis.fetch = async () => { throw new Error('External fetch forbidden in demo verification.'); };
const { default: createTask } = await import('../../netlify/functions/create-task.mjs');
const { default: tasks } = await import('../../netlify/functions/tasks.mjs');
const { demoStorePath } = await import('../../lib/demo.mjs');
if (!resolve(demoStorePath()).startsWith(scratch + sep)) throw new Error('Demo store is not isolated.');

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
const headers = Object.fromEntries(readFileSync(join(root, '_headers'), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('  ')).map((line) => {
    const colon = line.indexOf(':');
    return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
  }));
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8899');
    if (url.pathname === '/api/tasks' || url.pathname === '/api/create-task') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const request = new Request(url, {
        method: req.method, headers: req.headers,
        ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await (url.pathname === '/api/tasks' ? tasks : createTask)(request);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + sep) && path !== root) { res.writeHead(403); res.end(); return; }
    if (!extname(path)) path = join(root, 'index.html');
    if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { ...headers, 'Content-Type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(readFileSync(path));
  } catch (error) {
    console.error(error);
    res.writeHead(500); res.end('Local test server error.');
  }
});
server.listen(8899, '127.0.0.1');
function cleanup() {
  server.close();
  // scratch is an explicit directory created by this process, never user data.
  rmSync(scratch, { recursive: true, force: true });
  process.exit(0);
}
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
