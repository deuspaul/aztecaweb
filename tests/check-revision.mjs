// Pruebas sitio principal scroll-video (día+noche) + alias revision-video.
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const R = new URL('..', import.meta.url).pathname;
let n = 0;
const ok = (m) => { n++; console.log('ok', n, m); };
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

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
ok('progreso invertido');

assert.equal(Rev.timeFromProgress(0, 12.5), 0);
assert.equal(Rev.timeFromProgress(1, 12.5), 12.5);
assert.equal(Rev.timeFromProgress(0.5, 12.5), 6.25);
ok('mapeo progreso→tiempo');

assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK / 2), false);
assert.equal(Rev.shouldSeek(1.0, 1.0 + Rev.MIN_SEEK * 2), true);
ok('umbral seek');

assert.equal(Rev.videoSrcForTime('night'), Rev.VIDEO_SRC_NIGHT);
assert.equal(Rev.videoSrcForTime('morning'), Rev.VIDEO_SRC_DAY);
assert.equal(Rev.videoSrcForTime('afternoon'), Rev.VIDEO_SRC_DAY);
assert.equal(Rev.videoSrcForTime('sunset'), Rev.VIDEO_SRC_DAY);
assert.equal(Rev.fallbackSrcForTime('night'), Rev.FALLBACK_NIGHT);
assert.equal(Rev.fallbackSrcForTime('morning'), Rev.FALLBACK_DAY);
ok('elección fuente día/noche + fallback');

const html = fs.readFileSync(R + 'index.html', 'utf8');
const vtag = html.match(/<video\b[^>]*>/i)[0];
assert.ok(!/\bautoplay\b/i.test(vtag));
assert.ok(/\bmuted\b/i.test(vtag) && /\bplaysinline\b/i.test(vtag));
assert.ok(!/\bloop\b/i.test(vtag));
assert.ok(/preload="none"/.test(vtag));
assert.ok(!/rev-banner/.test(html));
assert.ok(/fallback-night\.webp/.test(html));
ok('markup: muted/playsinline, preload none, preload night fallback');

const js = fs.readFileSync(R + 'assets/js/revision.js', 'utf8');
assert.ok(!/fetch\(|XMLHttpRequest|geolocation|sendBeacon|WebSocket/.test(js));
assert.ok(!/\.play\s*\(/.test(js));
assert.ok(/detachVideo|removeAttribute\('src'\)/.test(js));
assert.ok(/videoSrcForTime|VIDEO_SRC_NIGHT|ensureVideoForTime/.test(js));
assert.ok(/reduced/.test(js) && /detachVideo/.test(js));
ok('JS: sin red/play; switch noche; detach reduced-motion');

assert.ok(fs.existsSync(R + Rev.VIDEO_SRC_DAY));
assert.ok(fs.existsSync(R + Rev.VIDEO_SRC_NIGHT));
assert.ok(fs.existsSync(R + Rev.FALLBACK_DAY));
assert.ok(fs.existsSync(R + Rev.FALLBACK_NIGHT));
ok('archivos día/noche + fallbacks existen');

function probe(path) {
  return JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=codec_type,codec_name,width,height,avg_frame_rate,nb_frames',
    '-of', 'json', path
  ], { encoding: 'utf8' }));
}
function icount(path) {
  return execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'frame=pts_time,pict_type', '-of', 'csv=p=0', path
  ], { encoding: 'utf8' }).trim().split('\n').filter(l => l.includes(',I')).length;
}

for (const [label, rel, expectSha] of [
  ['day', Rev.VIDEO_SRC_DAY, '132eb5cb37f8e2d6ee5b75d1fbd48dc6e333933086e62604ae303d647d89996a'],
  ['night', Rev.VIDEO_SRC_NIGHT, '08a53c9be34b4a87c07143d7083242d4f78f0682fd6f61196e5d193cd907e4be']
]) {
  const path = R + rel;
  const pr = probe(path);
  const v = pr.streams.find(s => s.codec_type === 'video');
  const audio = pr.streams.filter(s => s.codec_type === 'audio');
  assert.equal(v.width, 704); assert.equal(v.height, 432);
  assert.equal(v.avg_frame_rate, '24/1');
  assert.equal(Number(v.nb_frames), 300);
  assert.ok(Math.abs(Number(pr.format.duration) - 12.5) < 0.05);
  assert.equal(audio.length, 0);
  assert.ok(icount(path) >= 20, label + ' keyframes');
  assert.equal(sha(path), expectSha);
  ok('ffprobe+hash ' + label + ' video OK');
}

assert.equal(sha(R + Rev.FALLBACK_DAY), '2de8d066ea01ee78df061780c73a755e68d2b1a434656cd430795d8bc4c31763');
assert.equal(sha(R + Rev.FALLBACK_NIGHT), '3867ed21035e0af00047af949eb15eb35469019b2bdb8790a696aed0bbbfcd84');
ok('hashes fallback día/noche');

const man = JSON.parse(fs.readFileSync(R + 'assets/video/MANIFEST-night.json', 'utf8'));
assert.equal(man.source.sha256, '24b22197454da6fbdca32d08bb1d46817cf59ea3edef5d22b8864767ab6a0a36');
assert.equal(man.fallback.from_t_s, 1.5);
assert.equal(man.published.sha256, sha(R + Rev.VIDEO_SRC_NIGHT));
ok('manifest noche: source sha + fallback t=1.5s');

const nightBytes = fs.statSync(R + Rev.VIDEO_SRC_NIGHT).size;
const dayBytes = fs.statSync(R + Rev.VIDEO_SRC_DAY).size;
console.log('TRANSFER_DAY_BYTES', dayBytes);
console.log('TRANSFER_NIGHT_BYTES', nightBytes);
ok('costes transferencia medidos día+noche');

const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
[...html.matchAll(/href="#([^"]+)"/g)].forEach(m => assert.ok(ids.has(m[1]), m[1]));
ok('anclas internas');

const redir = fs.readFileSync(R + 'revision-video/index.html', 'utf8');
assert.ok(/http-equiv="refresh"/i.test(redir));
ok('revision-video redirect');

assert.equal(sha(R + 'version-3-fotogramas/index.html'),
  '84af274d9efac47597c29218a7b45a3b86d2635980f0e650f4631629845a782f');
ok('version-3-fotogramas index hash histórico');

assert.ok(fs.existsSync(R + 'prototipo-6/prototipo-6-dinamico.html'));
ok('P6 intacto');

assert.ok(/\?time=night/.test(fs.readFileSync(R + 'docs/NIGHT-VIDEO-V3.md', 'utf8')));
ok('docs documentan ?time=night');

console.log('TOTAL', n, 'pruebas revisión/raíz OK');
