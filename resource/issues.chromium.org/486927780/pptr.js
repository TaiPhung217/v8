const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Users\\EMIL\\Desktop\\asan\\chromium-146.0.7680.0-win64-asan\\chrome.exe',
    args: ['--no-sandbox'],
    headless: false,
    env: {
      ...process.env,
      // ASAN_OPTIONS: 'quarantine_size_mb=0'
    }
  });

  browser.process().stderr.on('data', (data) => {
    const output = data.toString();
    console.log(output);
  });

  const page = await browser.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    console.log('CONSOLE:', msg.text());
  });

  await page.goto(`file://${path.resolve(__dirname, 'poc.html')}`);
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer
  process.exit(1);
})();