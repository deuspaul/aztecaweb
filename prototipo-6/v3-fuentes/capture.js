/* Capture comparative PNGs + scroll/theme showcase MP4s for prototipo-6 */
const p = require('puppeteer-core');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = '/workspace/aztecaweb';
const FILE = 'file://' + ROOT + '/prototipo-6-dinamico.html';

const SHOTS = [
  { time: 'morning', weather: 'clear', tag: 'morning-clear', scroll: 'hero' },
  { time: 'afternoon', weather: 'cloudy', tag: 'afternoon-cloudy', scroll: 'hero' },
  { time: 'sunset', weather: 'clear', tag: 'sunset-clear', scroll: 'hero' },
  { time: 'night', weather: 'clear', tag: 'night-clear', scroll: 'hero' },
  { time: 'night', weather: 'rain', tag: 'night-rain', scroll: 'hero' },
  { time: 'night', weather: 'storm', tag: 'night-storm', scroll: 'hero' },
  { time: 'night', weather: 'clear', tag: 'galaxy-night', scroll: 'galaxy' },
  { time: 'morning', weather: 'clear', tag: 'galaxy-morning', scroll: 'galaxy' }
];

async function setTheme(pg, time, weather) {
  await pg.evaluate((t, w) => {
    window.setAztecaTheme({ time: t, weather: w, windKmh: w === 'storm' ? 45 : w === 'rain' ? 28 : 14 });
  }, time, weather);
  await new Promise(r => setTimeout(r, 950)); // wait blend
}

async function gotoScroll(pg, where) {
  if (where === 'galaxy') {
    await pg.evaluate(() => scrollTo(0, 0));
  } else if (where === 'mid') {
    await pg.evaluate(() => {
      const m = document.documentElement.scrollHeight - innerHeight;
      scrollTo(0, m * 0.45);
    });
  } else {
    await pg.evaluate(() => scrollTo(0, 1e6));
  }
  await new Promise(r => setTimeout(r, 500));
}

(async () => {
  const browser = await p.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader']
  });

  for (const [w, h, device] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
    const pg = await browser.newPage();
    pg.on('pageerror', e => console.log('ERR', device, e.message));
    await pg.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await pg.goto(FILE + '?time=sunset&weather=clear', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    for (const s of SHOTS) {
      // galaxy shots only needed for desktop (brief asks desktop for galaxy-morning/night)
      if (s.tag.startsWith('galaxy-') && device === 'mobile') continue;
      await setTheme(pg, s.time, s.weather);
      await gotoScroll(pg, s.scroll);
      const out = path.join(ROOT, `prototipo-6-${s.tag}-${device}.png`);
      await pg.screenshot({ path: out });
      console.log('shot', out);
    }

    // controls open — desktop only
    if (device === 'desktop') {
      await setTheme(pg, 'night', 'clear');
      await gotoScroll(pg, 'hero');
      await pg.evaluate(() => {
        const pill = document.getElementById('az-theme-pill');
        if (pill) pill.click();
      });
      await new Promise(r => setTimeout(r, 300));
      const out = path.join(ROOT, 'prototipo-6-controls-open-desktop.png');
      await pg.screenshot({ path: out });
      console.log('shot', out);
      await pg.keyboard.press('Escape');
    }

    await pg.close();
  }

  // ---- Videos: theme cycle + upward scroll ----
  async function makeVideo(tag, vw, vh) {
    const pg = await browser.newPage();
    await pg.setViewport({ width: vw, height: vh, deviceScaleFactor: 1 });
    await pg.goto(FILE + '?time=morning&weather=clear', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 700));
    await pg.evaluate(() => scrollTo(0, 1e6));
    await new Promise(r => setTimeout(r, 400));

    const dir = `/tmp/fr6${tag}`;
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir);

    const sequence = [
      // hold morning clear
      ...Array(30).fill(['morning', 'clear']),
      // blend to sunset
      ...Array(40).fill(['sunset', 'clear']),
      // blend to jade night rain
      ...Array(50).fill(['night', 'rain'])
    ];

    let lastT = '', lastW = '';
    for (let k = 0; k < sequence.length; k++) {
      const [t, w] = sequence[k];
      if (t !== lastT || w !== lastW) {
        await pg.evaluate((tt, ww) => window.setAztecaTheme({ time: tt, weather: ww, windKmh: ww === 'rain' ? 30 : 14 }), t, w);
        lastT = t; lastW = w;
      }
      await pg.mouse.move(vw * (0.3 + 0.2 * Math.sin(k / 20)), vh * (0.45 + 0.05 * Math.cos(k / 15)));
      await new Promise(r => setTimeout(r, 28));
      await pg.screenshot({ path: `${dir}/${String(k).padStart(4, '0')}.png` });
    }

    // upward scroll through sky to galaxy in jade night
    const mx = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const N = 160;
    for (let k = 0; k < N; k++) {
      const q = k / (N - 1);
      const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
      await pg.evaluate(v => scrollTo(0, v), mx * (1 - e));
      await pg.mouse.move(vw * (0.35 + 0.25 * Math.sin(k / 25)), vh * (0.4 + 0.1 * Math.cos(k / 20)));
      if (k === 90) await pg.mouse.click(vw * 0.5, vh * 0.45);
      await new Promise(r => setTimeout(r, 25));
      await pg.screenshot({ path: `${dir}/${String(sequence.length + k).padStart(4, '0')}.png` });
    }

    const out = path.join(ROOT, `prototipo-6-scroll-${tag}.mp4`);
    execSync(`ffmpeg -y -loglevel error -framerate 30 -i ${dir}/%04d.png -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 ${out}`);
    console.log('video', out);
    fs.rmSync(dir, { recursive: true, force: true });
    await pg.close();
  }

  await makeVideo('desktop', 1280, 720);
  await makeVideo('mobile', 390, 844);

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error(e); process.exit(1); });
