const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

    console.log("Navigating...");
    await page.goto('http://localhost:3000/performance', { waitUntil: 'networkidle2' });
    
    // We expect a redirect to /login
    console.log("Current URL after navigation:", page.url());
    
    if (page.url().includes('/login')) {
      console.log("Typing login...");
      await page.type('input[type="email"]', 'mabdulla');
      await page.type('input[type="password"]', 'password123'); // assuming standard dummy auth or just typing any password
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      console.log("Current URL after login:", page.url());
    }
    
    console.log("Done waiting. Checking if there is content.");
    const content = await page.content();
    if (content.includes("Performance Overview")) {
      console.log("Performance Overview text found!");
    } else {
      console.log("Performance Overview NOT found in HTML.");
    }
    
    await browser.close();
  } catch (err) {
    console.error("Script error:", err);
  }
})();
