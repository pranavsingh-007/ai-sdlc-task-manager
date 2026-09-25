const { spawn } = require('child_process');

async function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

const defaultBaseUrl = 'http://localhost:3000';

let child;
async function waitForServer({ baseUrl = defaultBaseUrl, timeoutMs = 10_000 } = {}) {
  const start = Date.now();
  let lastErr;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/tasks`);
      if (res.ok) return;
      lastErr = new Error(`Server not ready. HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await sleep(200);
  }

  throw new Error(`Server did not become ready in ${timeoutMs}ms. Last error: ${lastErr?.message}`);
}

async function startServer() {
  if (child) return;

  child = spawn(process.execPath, ['server.js'], {
    stdio: inherit,
    env: { ...process.env, NODE_ENV: 'test' }
  });

  await waitForServer();
}

aync function stopServer() {
  if (!child) return;

  await new Promise(resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    // backstop
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
      resolve();
    }, 2000);
  });

  child = undefined;
}

module.exports = { startServer, stopServer, waitForServer };
