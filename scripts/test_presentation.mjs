import path from 'path';
import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const htmlPath = path.resolve('presentation/index.html');

async function testStaticWeb() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', err => errors.push(err.message));

  console.log('Loading static web:', htmlPath);
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle2' });

  console.log('Title:', await page.title());

  // 1. Verify all sections exist
  const sections = await page.evaluate(() => {
    const ids = ['hero', 'overview', 'step-1', 'step-2', 'step-3', 'step-4', 'step-5', 'monitoring'];
    return ids.map(id => ({ id, exists: !!document.getElementById(id) }));
  });
  console.log('Sections check:', JSON.stringify(sections));

  // 2. Verify all images loaded with naturalWidth > 0
  const imageStatus = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.map(img => ({
      src: img.getAttribute('src'),
      loaded: img.complete && img.naturalWidth > 0,
      width: img.naturalWidth,
      height: img.naturalHeight
    }));
  });
  console.log(`Total images checked: ${imageStatus.length}`);
  const brokenImages = imageStatus.filter(i => !i.loaded);
  if (brokenImages.length > 0) {
    console.error('BROKEN IMAGES:', brokenImages);
  } else {
    console.log('All images loaded successfully!');
  }

  // 3. Take a screenshot of the top hero & overview
  await page.screenshot({ path: 'presentation-assets/ui-desktop/static_web_preview_hero.png' });

  // Scroll to step-1
  await page.evaluate(() => document.getElementById('step-1').scrollIntoView());
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'presentation-assets/ui-desktop/static_web_preview_steps.png' });

  // Scroll to monitoring
  await page.evaluate(() => document.getElementById('monitoring').scrollIntoView());
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'presentation-assets/ui-desktop/static_web_preview_monitoring.png' });

  // 4. Test opening PPT mode
  console.log('Testing PPT Mode Modal...');
  await page.evaluate(() => openPptMode());
  await new Promise(r => setTimeout(r, 400));
  const isPptOpen = await page.evaluate(() => {
    const modal = document.getElementById('ppt-modal');
    return !modal.classList.contains('hidden');
  });
  console.log('PPT Modal Open:', isPptOpen);

  for (let s = 1; s <= 8; s++) {
    const currentNum = await page.evaluate(() => document.getElementById('ppt-current-num').textContent);
    console.log(`PPT Slide ${s} current: ${currentNum}`);
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Total console errors:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  }

  await browser.close();
  console.log('Static web testing completed successfully!');
}

testStaticWeb().catch(err => {
  console.error(err);
  process.exit(1);
});
