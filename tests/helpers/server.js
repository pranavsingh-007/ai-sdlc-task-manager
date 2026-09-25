const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

let serverProcess = null;

async function waitForServer(url, timeout = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Server returned ${res.statusCode}`));
          }
        }).on('error', reject);
      });
      return;
    } catch (err) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

async function waitForPortFree(port, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isFree = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });

    if (isFree) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Port ${port} did not become free within ${timeout}ms`);
}

async function startServer() {
  if (serverProcess) {
    throw new Error('Server is already running');
  }

  // Wait for port to be free before starting
  await waitForPortFree(3000);

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js'], {
      stdio: 'pipe',
      cwd: process.cwd()
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Task Manager running') || output.includes('localhost:3000')) {
        if (!serverReady) {
          serverReady = true;
          // Give it a moment to fully initialize
          setTimeout(async () => {
            try {
              await waitForServer('http://localhost:3000/api/tasks');
              resolve();
            } catch (err) {
              reject(err);
            }
          }, 500);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      if (!serverReady && code !== 0) {
        reject(new Error(`Server exited with code ${code} before becoming ready`));
      }
    });

    // Fallback timeout
    setTimeout(() => {
      if (!serverReady) {
        reject(new Error('Server did not signal readiness within timeout'));
      }
    }, 10000);
  });
}

async function stopServer() {
  if (!serverProcess) {
    return;
  }

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        serverProcess = null;
        // Give the port time to be released
        setTimeout(resolve, 300);
      }
    };

    serverProcess.on('exit', cleanup);

    try {
      // On Windows, SIGTERM doesn't exist - use SIGINT or direct kill
      if (process.platform === 'win32') {
        serverProcess.kill();
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (err) {
      // Process may have already exited
      cleanup();
      return;
    }

    // Force kill after 2 seconds
    setTimeout(() => {
      if (serverProcess && !resolved) {
        try {
          serverProcess.kill('SIGKILL');
        } catch (err) {
          // Ignore if already dead
        }
        cleanup();
      }
    }, 2000);
  });
}

module.exports = {
  startServer,
  stopServer
};
