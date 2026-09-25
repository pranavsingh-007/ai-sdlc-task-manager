/*eslint-env node */
const { spawn } = require('child_process');

const BASE_URL = 'http://localhost:3000';

let child;

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function waitForServer({ baseUrl = BASE_URL, timeoutMs = 10_000 } = {}) {
  const start = Date.now();
  let lastErr;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/tasks`);
      if (res.ok) return;
      lastErr = new Error(`Health check returned ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(200);
  }

  throw new Error(`Server did not become ready within ${timeoutMs}ms. Last error: ${lastErr?.message}`);
}

async function startServer() {
  if (child) return;

  child = spawn(process.execPath, ['server.js'], {
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'test' }
  });

  child.stdout.on('data', d => process.stdout.write(`[SERVER] ${i}`)));
  child.stderr.on('data', d => process.stderr.write(`[SERVER ERR] ${d}`));

  await waitForServer();
}

async function stopServer() {
  if (!child) return;

  const p = child;
  child = undefined;

  await new Promise(resolve => {
    p.once('exit', () => resolve());
    try { p.kill('SIGTERM'); } catch {}
    setTimeout(() => {
      try { p.kill('SIGKILL'); } catch {}
      resolve();
    }, 2_000);
  });
}

module.exports = { BASE_URL, startServer, stopServer, waitForServer };
