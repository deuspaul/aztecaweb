// Pruebas estáticas y de lógica pura (Node, sin navegador). Uso: node tests/check.mjs
import fs from 'node:fs'; import crypto from 'node:crypto'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const R = new URL('..', import.meta.url).pathname; let n = 0; const ok = m => { n++; console.log('ok', n, m); };
const ctx = { globalThis: {}, console }; ctx.window = ctx.globalThis; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + 'assets/js/themes.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + 'assets/js/v4.js', 'utf8'), ctx);
const T = ctx.window.AztecaThemes, V = ctx.window.AztecaV4;
assert.ok(T && V); ok('módulos cargan sin DOM');
const at = h => T.timeFromDate(new Date(2026, 0, 1, h, 0));
assert.equal(at(8), 'morning'); assert.equal(at(14), 'afternoon'); assert.equal(at(18), 'sunset'); assert.equal(at(22), 'night'); assert.equal(at(3), 'night'); ok('franjas horarias');
for (const t of T.TIMES) assert.ok(T.PALETTES[t], t); for (const w of T.WEATHERS) assert.ok(T.WEATHER_MOD[w], w); ok('paletas y clima');
assert.equal(V.progress(1000, 1000), 0); assert.equal(V.progress(0, 1000), 1); assert.equal(V.progress(5, 0), 0); ok('progreso de subida');
let prev = [-1, -1, -1];
for (let i = 0; i <= 100; i++) { const o = V.sceneOpacities(i / 100, false); o.forEach((v, k) => { assert.ok(v >= 0 && v <= 1); assert.ok(v >= prev[k] - 1e-9); }); prev = o; }
assert.deepEqual([...V.sceneOpacities(0, false)].map(Math.round), [1, 0, 0]); assert.deepEqual([...V.sceneOpacities(0.55, false)].map(Math.round), [1, 1, 0]); assert.deepEqual([...V.sceneOpacities(1, false)], [1, 1, 1]); ok('fundidos monótonos paisaje→portal→galaxias');
for (let i = 0; i <= 20; i++) { const o = V.sceneOpacities(i / 20, true); o.forEach(v => assert.ok(v === 0 || v === 1)); assert.deepEqual([...V.parallax(i / 20, true, 800)], [0, 0, 0]); } ok('reduced-motion: cortes discretos, sin parallax');
for (let i = 0; i <= 10; i++) V.parallax(i / 10, false, 800).forEach(v => assert.ok(Math.abs(v) <= 24.01)); ok('parallax acotado ≤3% vh (cubierto por inset -4%)');
const html = fs.readFileSync(R + 'index.html', 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^https?:/.test(u));
refs.forEach(u => assert.ok(fs.existsSync(R + u), 'falta ' + u)); ok('referencias locales existen: ' + refs.length);
assert.ok(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, ''))); ok('index.html sin URLs externas');
const js = fs.readFileSync(R + 'assets/js/v4.js', 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|geolocation|sendBeacon|WebSocket/.test(js)); ok('v4.js sin red ni geolocalización');
const imgs = [...html.matchAll(/<img [^>]*src="([^"]+)"/g)].map(m => m[1]); assert.equal(imgs.length, 3); ok('carga exactamente 3 imágenes');
const man = JSON.parse(fs.readFileSync(R + 'docs/fondos-manifest.json', 'utf8'));
for (const e of man.escenas) { const b = fs.readFileSync(R + e.archivo); assert.equal(crypto.createHash('sha256').update(b).digest('hex'), e.sha256); assert.equal(b.toString('ascii', 0, 4), 'RIFF'); assert.equal(b.toString('ascii', 8, 12), 'WEBP'); } ok('hashes y formato WebP de las 3 escenas');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1])); [...html.matchAll(/href="#([^"]+)"/g)].forEach(m => assert.ok(ids.has(m[1]), m[1])); ok('anclas internas válidas');
console.log('TOTAL', n, 'pruebas OK');
