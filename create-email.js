const puppeteer = require('puppeteer-core');

async function createTempEmail() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/firefox',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Go to temp mail service
  await page.goto('https://temp-mail.io', { waitUntil: 'networkidle0' });
  
  // Get the email address
  const email = await page.$eval('[data-testid="mail-address"]', el => el.textContent).catch(() => null);
  
  if (!email) {
    // Try alternative selector
    const email2 = await page.$eval('.email-address, .copy-text, [data-testid="email-address"]', el => el.textContent).catch(() => null);
    console.log('Email:', email2 || 'Not found');
  } else {
    console.log('Email:', email);
  }
  
  await browser.close();
}

createTempEmail().catch(console.error);
