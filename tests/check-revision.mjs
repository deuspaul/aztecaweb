// Pruebas sitio principal scroll-video (raíz) + alias revision-video. Uso: node tests/check-revision.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const R = new URL('..', import.meta.url).pathname;
let n = 0;
const ok = (m) => { n++; console.log('ok', n, m); };

const ctx = { globalThis: {}, console };
ctx.window = ctx.globalThis;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R + 'assets/js/themes.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(R + 'assets/js/revision.js', 'utf8'), ctx);
const T = ctx.window.AztecaThemes, Rev = ctx.window.AztecaRevision;
assert.ok(T && Rev); ok('módulos raíz scroll-video cargan sin DOM');

assert.equal(Rev.progress(1000, 1000), 0);
assert.equal(Rev.progress(0, 1000), 1);
assert.equal(Rev.progress(500, 1000), 0.5);
ok('progreso invertido (abajo=0 pirámide, arriba=1 galaxias)');

assert.equal(Rev.timeFromProgress(0, 12.5), 0);
assert.equal(Rev.timeFromProgress(1, 12.5), 12.5);
assert.equal(Rev.timeFromProgress(0.5, 12.5), 6.25);
ok('mapeo progreso→tiempo acotado');

assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK / 2), false);
assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK * 2), true);
ok('umbral de seek evita micro-ajustes');

const html = fs.readFileSync(R + 'index.html', 'utf8');
const vtag = html.match(/<video\b[^>]*>/i)[0];
assert.ok(vtag);
assert.ok(!/\bautoplay\b/i.test(vtag));
assert.ok(/\bmuted\b/i.test(vtag) && /\bplaysinline\b/i.test(vtag));
assert.ok(!/\bloop\b/i.test(vtag));
assert.ok(/preload="none"/.test(vtag));
assert.ok(!/rev-banner/.test(html), 'banner Revisión no debe estar en raíz');
assert.ok(/version-3-fotogramas\//.test(html), 'enlace a versión guardada');
ok('markup raíz: muted/playsinline, sin autoplay/loop/banner revisión');

const js = fs.readFileSync(R + 'assets/js/revision.js', 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|geolocation|sendBeacon|WebSocket/.test(js));
assert.ok(!/\.play\s*\(/.test(js));
assert.ok(/detachVideo|removeAttribute\('src'\)/.test(js));
ok('revision.js: sin red/geo, sin play(), detach reduced-motion');

const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1])
  .filter(u => !/^https?:/.test(u) && !u.endsWith('/') && !u.includes('version-3-fotogramas'));
refs.forEach(u => assert.ok(fs.existsSync(R + u), 'falta ' + u));
ok('referencias locales raíz existen: ' + refs.length);

assert.ok(fs.existsSync(R + 'assets/bg/fallback.webp'));
assert.ok(fs.existsSync(R + 'assets/video/scroll.mp4'));
assert.ok(fs.existsSync(R + 'version-3-fotogramas/index.html'));
ok('fallback + video + versión guardada presentes');

const vid = R + 'assets/video/scroll.mp4';
const st = fs.statSync(vid);
const probe = JSON.parse(execFileSync('ffprobe', [
  '-v', 'error', '-show_entries', 'format=duration,size',
  '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_frames',
  '-of', 'json', vid
], { encoding: 'utf8' }));
const v = probe.streams.find(s => s.codec_type === 'video');
const audio = probe.streams.filter(s => s.codec_type === 'audio');
assert.equal(v.width, 704); assert.equal(v.height, 432);
assert.equal(v.avg_frame_rate, '24/1');
assert.equal(Number(v.nb_frames), 300);
assert.ok(Math.abs(Number(probe.format.duration) - 12.5) < 0.05);
assert.equal(audio.length, 0);
ok('ffprobe: 704x432 24fps 12.5s 300f sin audio');

const kf = execFileSync('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0',
  '-show_entries', 'frame=pts_time,pict_type', '-of', 'csv=p=0', vid
], { encoding: 'utf8' }).trim().split('\n').filter(l => l.includes(',I'));
assert.ok(kf.length >= 20, 'keyframes insuficientes: ' + kf.length);
ok('keyframes I ≥20: ' + kf.length);

assert.equal(crypto.createHash('sha256').update(fs.readFileSync(vid)).digest('hex'),
  '132eb5cb37f8e2d6ee5b75d1fbd48dc6e333933086e62604ae303d647d89996a');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(R + 'assets/bg/fallback.webp')).digest('hex'),
  '2de8d066ea01ee78df061780c73a755e68d2b1a434656cd430795d8bc4c31763');
ok('hashes video+fallback');

console.log('TRANSFER_COST_BYTES', st.size);
ok('coste transferencia: ' + st.size + ' bytes');

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
[...html.matchAll(/href="#([^"]+)"/g)].forEach(m => assert.ok(ids.has(m[1]), m[1]));
ok('anclas internas válidas');

const redir = fs.readFileSync(R + 'revision-video/index.html', 'utf8');
assert.ok(/http-equiv="refresh"/i.test(redir) || /url=\.\.\//i.test(redir));
assert.ok(/\.\.\//.test(redir));
ok('revision-video/ index redirige a raíz');

assert.ok(fs.existsSync(R + 'prototipo-6/prototipo-6-dinamico.html'));
ok('P6 intacto');

console.log('TOTAL', n, 'pruebas revisión/raíz OK');
