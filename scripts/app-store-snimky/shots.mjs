// Snímky do App Storu 6,9" (1320 x 2868): node shots.mjs <cs|en> <výstupní složka> [jen-jeden-název]
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [lang, outDir, only] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const here = dirname(fileURLToPath(import.meta.url));
const demo = (active) => execFileSync('node', [join(here, 'demo.mjs'), lang, active ? '1' : '0']).toString();
const BASE = 'http://localhost:8090';

const SHOTS = [
  { name: '1-dnesek', path: '/', active: false },
  { name: '2-trenink', path: '/workout', active: true },
  { name: '3-pokrok', path: '/pokrok', active: false },
  { name: '4-detail', path: 'LAST', active: false },
  { name: '5-kalendar', path: '/kalendar', active: false, clickDay: true },
];

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

for (const s of SHOTS) {
  if (only && s.name !== only) continue;
  const state = demo(s.active);
  const lastId = JSON.parse(state).workouts.filter((w) => w.finishedAt).at(-1).id;
  const url = BASE + (s.path === 'LAST' ? `/history/${lastId}` : s.path);
  const profil = mkdtempSync(join(tmpdir(), 'cdp-'));
  const port = 9333 + Math.floor(Math.random() * 500);
  const p = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profil}`, 'about:blank']);
  let tabs;
  for (let i = 0; i < 50; i++) {
    try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break; } catch { await wait(200); }
  }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } };
  const cmd = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Emulation.setDeviceMetricsOverride', { width: 440, height: 956, deviceScaleFactor: 3, mobile: true });
  await cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await cmd('Page.enable');
  const value = JSON.stringify({ state: JSON.parse(state), version: 0 });
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: `try { if (!sessionStorage.getItem('demo')) { localStorage.clear(); localStorage.setItem('steelset-store-v1', ${JSON.stringify(value)}); sessionStorage.setItem('demo','1'); } } catch (e) {}` });
  await cmd('Page.navigate', { url });
  await wait(7000);
  if (s.clickDay) {
    // vybrat včerejší den, ať se pod kalendářem ukáže trénink
    const day = String(new Date(Date.now() - 86400000).getDate());
    const r = await cmd('Runtime.evaluate', { returnByValue: true, expression: `(() => { const el = [...document.querySelectorAll('div')].filter(d => d.childElementCount === 0 && d.textContent.trim() === ${JSON.stringify(day)}).at(0); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; })()` });
    const pt = r.result?.value;
    if (pt) {
      for (const type of ['mousePressed', 'mouseReleased']) await cmd('Input.dispatchMouseEvent', { type, x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
      await wait(1500);
    }
  }
  const shot = await cmd('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, `${s.name}.png`);
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(file);
  ws.close(); p.kill();
  await wait(500);
}
