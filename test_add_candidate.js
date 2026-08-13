import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173/recruitment/add-candidate');
  
  // wait for rendering
  await new Promise(r => setTimeout(r, 2000));
  
  const body = await page.evaluate(() => document.body.innerHTML);
  if (body.includes('Something went wrong') || body.includes('Unexpected Application Error')) {
     console.log("Error page detected.");
  }
  
  await browser.close();
})();
