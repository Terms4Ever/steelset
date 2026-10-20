// Snímky z Apple Watch pro App Store (422 x 514, Ultra): node hodinky.mjs <cs|en> <výstupní složka>
// Obrazovky jsou překreslené v hodinky.html podle targets/watch/Views.swift.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [lang, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const page = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'hodinky.html')).href;
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [i, screen] of ['metrics', 'rest', 'summary'].entries()) {
  const profil = mkdtempSync(join(tmpdir(), 'cdp-'));
  const port = 9333 + Math.floor(Math.random() * 500);
  const p = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank']);
  let tabs;
  for (let k = 0; k < 50; k++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await wait(200); }
  }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  const cmd = (method, params = {}) => new Promise((r) => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  await cmd('Emulation.setDeviceMetricsOverride', { width: 211, height: 257, deviceScaleFactor: 2, mobile: false });
  await cmd('Page.enable');
  await cmd('Page.navigate', { url: `${page}?screen=${screen}&lang=${lang}` });
  for (let k = 0; k < 40; k++) {
    const r = await cmd('Runtime.evaluate', { expression: "document.body && document.body.getAttribute('data-ready')", returnByValue: true });
    if (r.result?.value === '1') break;
    await wait(250);
  }
  await wait(500);
  const shot = await cmd('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, `${i + 1}-${screen}.png`);
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(file);
  ws.close(); p.kill();
  await wait(400);
}
