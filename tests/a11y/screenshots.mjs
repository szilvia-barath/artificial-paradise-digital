// Screenshots of the pilot for a report or the portfolio, with no artwork in them: the
// key visual is hidden on the title screen, the viewer's picture is replaced by a neutral
// panel, the works are taken out of the 3D scene and the camera looks at the floor.
// Usage: npm run build && npm run preview &   then   node tests/a11y/screenshots.mjs <folder>
import { mkdirSync } from 'node:fs';
import { launch, openWalk, BASE } from './lib.mjs';

const out = process.argv[2] || 'screenshots';
mkdirSync(out, { recursive: true });
const browser = await launch();
const NEUTRAL = `.loader-bg, .loader-grain { visibility: hidden !important; }
#viewer-img, #viewer-video, #viewer-frame { visibility: hidden !important; }
.viewer-media::after { content: "artwork not shown"; display: grid; place-items: center; width: min(70%, 640px); aspect-ratio: 4 / 3; background: #2a2c31; color: #9a9a98; font: 12px ui-monospace, Menlo, monospace; letter-spacing: .1em; text-transform: uppercase; position: absolute; }`;

// ---------------- text edition
for (const [path, lang] of [['text/', 'en'], ['text/hu/', 'hu']]) {
  for (const [w, h] of [[1200, 820], [375, 720]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.goto(BASE + path);
    await page.screenshot({ path: `${out}/text-${lang}-${w}-top.png` });
    await page.evaluate(() => document.getElementById('w06-artificial-paradise-singapore').scrollIntoView());
    await page.keyboard.press('Tab');
    await page.screenshot({ path: `${out}/text-${lang}-${w}-work.png` });
    await ctx.close();
  }
}

// ---------------- the walk
for (const lang of ['en', 'hu']) {
  const { page, ctx } = await openWalk(browser, { lang, viewport: { width: 1280, height: 800 } }); // 1x: the 3D view renders in software here
  await page.addStyleTag({ content: NEUTRAL });
  const shot = (name) => page.screenshot({ path: `${out}/walk-${lang}-${name}.png`, timeout: 120000 });
  const tabTo = async (sel) => { for (let i = 0; i < 80; i++) { await page.keyboard.press('Tab'); if (await page.evaluate((s) => document.activeElement === document.querySelector(s), sel)) return; } };
  await page.evaluate(() => document.activeElement.blur());
  await page.focus('.skip-link');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await shot('1-title-skip-link');
  await tabTo('#site-foot [data-nav="accessibility"]');
  await shot('2-title-footer-focus');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await shot('3-statement-panel');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await shot('4-statement-panel-link-focus');
  await page.keyboard.press('Escape');
  if (lang === 'en') {
    await tabTo('#site-nav [data-nav="works"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await shot('5-works-panel-focus');
    await page.keyboard.press('Escape');
    await tabTo('#enter');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    // nothing of the exhibition in the picture: works out of the scene, camera on the floor of Room 2
    await page.evaluate(() => { const a = window.__ap; a.scene.getObjectByName('gallery').visible = false; a.controls.setPose(8.6, 3.3, 0, -1.25); });
    await page.waitForTimeout(2500);
    await shot('6-sound-question');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    await shot('7-inside-3d-view-focus');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);
    await shot('8-inside-rooms-menu-focus');
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.__ap.viewer.open(window.__ap.data.works[6]));
    await page.waitForTimeout(1200);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(600);
    await shot('9-viewer-focus');
  }
  await ctx.close();
}
await browser.close();
console.log(`screenshots in ${out}`);
