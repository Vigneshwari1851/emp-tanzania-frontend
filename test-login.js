import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`PAGE LOG: ${msg.type().toUpperCase()} ${msg.text()}`);
  });
  
  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
  });

  page.on('response', response => {
    if (!response.ok()) {
      console.log(`RESPONSE ERROR: ${response.url()} - Status: ${response.status()}`);
    }
  });

  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:5175/eep/login', { waitUntil: 'networkidle0' });
    console.log("Navigated to login page successfully.");
    
    // Attempt clicking login
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      console.log("Form buttons found. Setting inputs...");
      // Not actually testing the backend, but let's see if there are any immediate UI/Router errors
    } else {
      console.log("No submit button found? Render failed?");
    }
    
  } catch (err) {
    console.error("Puppeteer error:", err.message);
  } finally {
    await browser.close();
  }
})();
