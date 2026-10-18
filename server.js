const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = process.env.PORT || 4567;
const PUBLIC_DIR = path.join(__dirname, 'public');
const IS_WIN = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

// Find ADB binary path cross-platform
function resolveAdbPath() {
  if (IS_WIN) {
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidates = [
      'adb.exe',
      'adb',
      path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
      'C:\\Program Files\\Android\\platform-tools\\adb.exe',
      'C:\\Android\\platform-tools\\adb.exe'
    ];
    for (const c of candidates) {
      if (c.includes('\\') && fs.existsSync(c)) {
        return `"${c}"`;
      }
    }
    return 'adb';
  } else if (IS_MAC) {
    const home = os.homedir();
    const candidates = [
      '/opt/homebrew/bin/adb',
      '/usr/local/bin/adb',
      path.join(home, 'Library/Android/sdk/platform-tools/adb'),
      'adb'
    ];
    for (const c of candidates) {
      if (c.startsWith('/') && fs.existsSync(c)) {
        return `"${c}"`;
      }
    }
    return 'adb';
  }
  return 'adb';
}

const ADB_CMD = resolveAdbPath();

function runCommand(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: 12000, windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
        error: error ? error.message : null
      });
    });
  });
}

function openBrowser(url) {
  if (IS_WIN) {
    exec(`start "" "${url}"`);
  } else if (IS_MAC) {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ interface: name, address: net.address });
      }
    }
  }
  return addresses;
}

async function getMdnsServices() {
  const res = await runCommand(`${ADB_CMD} mdns services`);
  const services = [];
  if (res.stdout) {
    const lines = res.stdout.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('List of discovered')) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 3) {
        services.push({
          name: parts[0],
          type: parts[1],
          address: parts[2]
        });
      }
    }
  }
  return services;
}

async function getConnectedDevices() {
  const res = await runCommand(`${ADB_CMD} devices -l`);
  const devices = [];
  if (res.stdout) {
    const lines = res.stdout.split('\n').slice(1);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const serial = parts[0];
      const state = parts[1];
      const details = {};
      parts.slice(2).forEach(p => {
        const [k, v] = p.split(':');
        if (k && v) details[k] = v;
      });
      devices.push({ serial, state, details, raw: trimmed });
    }
  }
  return devices;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: Get Status
  if (url.pathname === '/api/status' && req.method === 'GET') {
    const [mdns, devices] = await Promise.all([
      getMdnsServices(),
      getConnectedDevices()
    ]);

    let detectedPairing = null;
    let detectedConnect = null;
    let detectedPhoneIp = null;
    let detectedPairingPort = null;
    let detectedConnectPort = null;

    for (const s of mdns) {
      if (s.type.includes('pairing')) {
        detectedPairing = s.address; // e.g. 192.168.200.173:37605
        const [ip, port] = s.address.split(':');
        detectedPhoneIp = ip;
        detectedPairingPort = port;
      } else if (s.type.includes('connect')) {
        detectedConnect = s.address; // e.g. 192.168.200.173:37553
        const [ip, port] = s.address.split(':');
        if (!detectedPhoneIp) detectedPhoneIp = ip;
        detectedConnectPort = port;
      }
    }

    // Also inspect connected/offline devices in adb table
    for (const dev of devices) {
      const match = dev.serial.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
      if (match) {
        if (!detectedPhoneIp) detectedPhoneIp = match[1];
        if (!detectedConnectPort) detectedConnectPort = match[2];
      }
    }

    // Default fallback from local subnet if still not detected
    if (!detectedPhoneIp) {
      detectedPhoneIp = '192.168.200.173';
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      platform: process.platform,
      adbPath: ADB_CMD,
      localIPs: getLocalIPs(),
      mdnsServices: mdns,
      detectedPhoneIp,
      detectedPairingPort,
      detectedConnectPort,
      detectedPairing,
      detectedConnect,
      devices
    }));
    return;
  }

  // API: Pair Device
  if (url.pathname === '/api/pair' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { ip, pairPort, code, connectPort } = data;
        if (!ip || !pairPort || !code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'IP, 페어링 포트, 페어링 코드를 모두 입력해주세요.' }));
          return;
        }

        const pairTarget = `${ip.trim()}:${pairPort.trim()}`;
        const pairCmd = `${ADB_CMD} pair ${pairTarget} ${code.trim()}`;
        console.log(`[PAIR] Executing: ${pairCmd}`);
        const pairRes = await runCommand(pairCmd);

        let connectRes = null;
        if (pairRes.stdout.includes('Successfully paired') || pairRes.success) {
          const targetPort = connectPort ? connectPort.trim() : null;
          if (targetPort) {
            const connectTarget = `${ip.trim()}:${targetPort}`;
            console.log(`[CONNECT] Executing: ${ADB_CMD} connect ${connectTarget}`);
            connectRes = await runCommand(`${ADB_CMD} connect ${connectTarget}`);
          } else {
            // Auto connect via mDNS
            await new Promise(r => setTimeout(r, 1200));
            const mdns = await getMdnsServices();
            const conn = mdns.find(s => s.type.includes('connect') && s.address.startsWith(ip.trim()));
            if (conn) {
              console.log(`[CONNECT AUTO] Executing: ${ADB_CMD} connect ${conn.address}`);
              connectRes = await runCommand(`${ADB_CMD} connect ${conn.address}`);
            }
          }
        }

        const devices = await getConnectedDevices();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: pairRes.stdout.includes('Successfully paired') || pairRes.success,
          pairResult: pairRes,
          connectResult: connectRes,
          devices
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Connect
  if (url.pathname === '/api/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { ip, port } = JSON.parse(body || '{}');
        if (!ip || !port) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'IP와 포트를 입력해주세요.' }));
          return;
        }
        const target = `${ip.trim()}:${port.trim()}`;
        const result = await runCommand(`${ADB_CMD} connect ${target}`);
        const devices = await getConnectedDevices();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.stdout.includes('connected to'),
          result,
          devices
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Disconnect
  if (url.pathname === '/api/disconnect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { target } = JSON.parse(body || '{}');
        const cmd = target ? `${ADB_CMD} disconnect ${target.trim()}` : `${ADB_CMD} disconnect`;
        const result = await runCommand(cmd);
        const devices = await getConnectedDevices();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, result, devices }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API: Launch Android Studio
  if (url.pathname === '/api/launch-studio' && req.method === 'POST') {
    let cmd = '';
    if (IS_MAC) {
      cmd = 'open -a "Android Studio"';
    } else if (IS_WIN) {
      cmd = 'start "" "C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe"';
    } else {
      cmd = 'android-studio || which studio.sh';
    }
    const result = await runCommand(cmd);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: result.success }));
    return;
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` ADB Wireless Debugging Manager v1.0.0`);
  console.log(` Running at: http://localhost:${PORT}`);
  console.log(` Platform:   ${process.platform} (${process.arch})`);
  console.log(` ADB binary: ${ADB_CMD}`);
  console.log(`====================================================`);
});
