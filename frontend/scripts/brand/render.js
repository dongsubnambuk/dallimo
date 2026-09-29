const { chromium } = require('playwright'); const fs = require('fs');
const jobs = JSON.parse(process.argv[2]);
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
 for (const [svg, out, w, h] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const s = fs.readFileSync(svg, 'utf8').replace(/<svg /, `<svg style="display:block;width:${w}px;height:${h}px" `);
  await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
  await p.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } }); await p.close(); }
 await b.close(); })();
