// node render.cjs <w> <h> <outdir> — renderiza todos los tramos del vuelo como PNG numerados
const { chromium } = require('playwright');
const fs = require('fs');
const FPS = 24, DIVE_S = 3, CONN_S = 0;
(async () => {
  const [w, h, out] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.goto(`http://localhost:8123/vinyl.html?w=${w}&h=${h}&pr=1.5`);
  await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  const segs = await p.evaluate(() => window.SEGMENTS);
  const t0 = Date.now(); let total = 0;
  for (const s of segs) {
    const name = s.kind === 'dive' ? `dive${s.i}` : `conn${s.i}`;
    const dir = `${out}/${name}`; fs.mkdirSync(dir, { recursive: true });
    const n = Math.round((s.kind === 'dive' ? DIVE_S : CONN_S) * FPS);
    for (let k = 0; k <= n; k++) {
      const u = s.from + (s.to - s.from) * (k / n);
      const data = await p.evaluate((u) => { window.renderAt(u, u * 40); return document.querySelector('canvas').toDataURL('image/png'); }, u);
      fs.writeFileSync(`${dir}/${String(k).padStart(4, '0')}.png`, Buffer.from(data.split(',')[1], 'base64'));
      total++;
    }
    console.log(name, n + 1, 'frames', Math.round((Date.now() - t0) / 1000), 's');
  }
  console.log('done', total);
  await b.close();
})();
