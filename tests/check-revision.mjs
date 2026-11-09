// Pruebas estáticas/lógica revisión scroll-video. Uso: node tests/check-revision.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const R = new URL('..', import.meta.url).pathname;
const RV = R + 'revision-video/';
let n = 0;
const ok = (m) => { n++; console.log('ok', n, m); };

const ctx = { globalThis: {}, console };
ctx.window = ctx.globalThis;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(RV + 'assets/js/themes.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(RV + 'assets/js/revision.js', 'utf8'), ctx);
const T = ctx.window.AztecaThemes, Rev = ctx.window.AztecaRevision;
assert.ok(T && Rev); ok('módulos revisión cargan sin DOM');

assert.equal(Rev.progress(1000, 1000), 0);
assert.equal(Rev.progress(0, 1000), 1);
assert.equal(Rev.progress(500, 1000), 0.5);
ok('progreso invertido (abajo=0 pirámide, arriba=1 galaxias)');

assert.equal(Rev.timeFromProgress(0, 12.5), 0);
assert.equal(Rev.timeFromProgress(1, 12.5), 12.5);
assert.equal(Rev.timeFromProgress(0.5, 12.5), 6.25);
assert.equal(Rev.timeFromProgress(-1, 12.5), 0);
assert.equal(Rev.timeFromProgress(2, 12.5), 12.5);
ok('mapeo progreso→tiempo acotado');

assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK / 2), false);
assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK * 2), true);
assert.equal(Rev.shouldSeek(5, 0), true);
ok('umbral de seek evita micro-ajustes');

const html = fs.readFileSync(RV + 'index.html', 'utf8');
const vtag = html.match(/<video\b[^>]*>/i)[0];
assert.ok(vtag);
assert.ok(!/\bautoplay\b/i.test(vtag));
assert.ok(/\bmuted\b/i.test(vtag) && /\bplaysinline\b/i.test(vtag));
assert.ok(!/\bloop\b/i.test(vtag));
assert.ok(/preload="none"/.test(vtag));
ok('markup: muted playsinline, sin autoplay/loop, preload none');

const js = fs.readFileSync(RV + 'assets/js/revision.js', 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|geolocation|sendBeacon|WebSocket/.test(js));
assert.ok(!/\.play\s*\(/.test(js), 'no debe llamar play()');
assert.ok(/reduced/.test(js) && /detachVideo|removeAttribute\('src'\)/.test(js));
ok('revision.js: sin red/geo, sin play(), detach en reduced-motion');

const refs = [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1])
  .filter(u => !/^https?:/.test(u) && !u.startsWith('../'));
refs.forEach(u => assert.ok(fs.existsSync(RV + u), 'falta ' + u));
ok('referencias locales existen: ' + refs.length);

assert.ok(html.includes('assets/bg/fallback.webp'));
assert.ok(fs.existsSync(RV + 'assets/bg/fallback.webp'));
assert.ok(fs.existsSync(RV + 'assets/video/scroll.mp4'));
ok('fallback still + video presentes');

// Live root untouched expectations
const live = fs.readFileSync(R + 'index.html', 'utf8');
assert.ok(live.includes('escena1-paisaje-t01.50s.webp'));
assert.ok(!live.includes('scroll-video'));
assert.ok(fs.existsSync(R + 'prototipo-6/prototipo-6-dinamico.html'));
ok('live index y P6 intactos');

const vid = RV + 'assets/video/scroll.mp4';
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
ok('keyframes I ≥20 (GOP ~0.5s): ' + kf.length);

const sha = crypto.createHash('sha256').update(fs.readFileSync(vid)).digest('hex');
assert.equal(sha, '132eb5cb37f8e2d6ee5b75d1fbd48dc6e333933086e62604ae303d647d89996a');
const fb = crypto.createHash('sha256').update(fs.readFileSync(RV + 'assets/bg/fallback.webp')).digest('hex');
assert.equal(fb, '2de8d066ea01ee78df061780c73a755e68d2b1a434656cd430795d8bc4c31763');
ok('hashes video+fallback');

const mb = (st.size / (1024 * 1024)).toFixed(2);
console.log('TRANSFER_COST_BYTES', st.size);
console.log('TRANSFER_COST_MiB', mb);
ok('coste transferencia medido: ' + st.size + ' bytes (' + mb + ' MiB)');

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
[...html.matchAll(/href="#([^"]+)"/g)].forEach(m => assert.ok(ids.has(m[1]), m[1]));
ok('anclas internas válidas');

console.log('TOTAL', n, 'pruebas revisión OK');
