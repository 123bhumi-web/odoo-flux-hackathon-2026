import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const FRAMES_DIR = 'C:\\Users\\Raunak\\.gemini\\antigravity\\scratch\\brightloop-subscription-system\\frames';
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('Launching Chrome via puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 820 },
  });

  const page = await browser.newPage();
  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // Frame 1: Dashboard Overview
  console.log('Capturing Frame 1: Dashboard Overview (SQL Edition)...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_01_dashboard.png') });
  await sleep(500);

  // Frame 2: Open Gravity AI Risk Assessment Modal
  console.log('Triggering Gravity AI Evaluation...');
  const evalButtons = await page.$$('button');
  for (const btn of evalButtons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Evaluate Risk')) {
      await btn.click();
      break;
    }
  }
  await sleep(1000);
  console.log('Capturing Frame 2: Gravity AI Risk Assessment Modal...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_02_gravity_ai.png') });
  await sleep(500);

  // Frame 3: Switch to WhatsApp Channel in Gravity AI Modal
  console.log('Switching to WhatsApp channel tab...');
  const buttonsInModal = await page.$$('button');
  for (const btn of buttonsInModal) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('WhatsApp')) {
      await btn.click();
      break;
    }
  }
  await sleep(600);
  console.log('Capturing Frame 3: WhatsApp Dunning Copy...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_03_whatsapp_dunning.png') });
  await sleep(500);

  // Close Modal
  const closeBtns = await page.$$('button');
  for (const btn of closeBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text === 'Close') {
      await btn.click();
      break;
    }
  }
  await sleep(600);

  // Frame 4: Run Automated Billing Trigger
  console.log('Triggering Run Automated Billing SQL Procedure...');
  const headerBtns = await page.$$('button');
  for (const btn of headerBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Run Automated Billing')) {
      await btn.click();
      break;
    }
  }
  await sleep(1000);
  console.log('Capturing Frame 4: SQL Billing Procedure Execution...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_04_billing_run.png') });
  await sleep(500);

  // Frame 5: Subscriptions View
  console.log('Navigating to Subscriptions view...');
  const navItems = await page.$$('.bl-nav-item');
  for (const item of navItems) {
    const text = await page.evaluate((el) => el.innerText, item);
    if (text.includes('Subscriptions')) {
      await item.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 5: Subscriptions View...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_05_subscriptions.png') });
  await sleep(500);

  // Frame 6: Open Subscription Lifecycle State Machine Modal
  console.log('Opening Subscription Details...');
  const manageBtns = await page.$$('button');
  for (const btn of manageBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text === 'Manage') {
      await btn.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 6: Lifecycle State Stepper...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_06_lifecycle_stepper.png') });
  await sleep(500);

  // Close Modal
  const subCloseBtns = await page.$$('button');
  for (const btn of subCloseBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text === 'Close') {
      await btn.click();
      break;
    }
  }
  await sleep(600);

  // Frame 7: Quotations View
  console.log('Navigating to Quotations view...');
  for (const item of navItems) {
    const text = await page.evaluate((el) => el.innerText, item);
    if (text.includes('Quotations')) {
      await item.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 7: Quotations View...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_07_quotations.png') });
  await sleep(500);

  // Frame 8: Invoices View
  console.log('Navigating to Invoices view...');
  for (const item of navItems) {
    const text = await page.evaluate((el) => el.innerText, item);
    if (text.includes('Invoices')) {
      await item.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 8: Invoices View with 18% GST...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_08_invoices.png') });
  await sleep(500);

  // Frame 9: SQL Workbench View!
  console.log('Navigating to SQL Workbench...');
  for (const item of navItems) {
    const text = await page.evaluate((el) => el.innerText, item);
    if (text.includes('SQL Workbench')) {
      await item.click();
      break;
    }
  }
  await sleep(800);
  // Execute sample query in SQL Workbench
  const runQueryBtns = await page.$$('button');
  for (const btn of runQueryBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Execute SQL Query')) {
      await btn.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 9: SQL Workbench & Live Query Execution...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_09_sql_workbench.png') });
  await sleep(500);

  // Frame 10: Customer Self-Service Portal
  console.log('Switching to Customer Self-Service Portal...');
  const portalCard = await page.$('.bl-portal-switch-card');
  if (portalCard) {
    await portalCard.click();
  }
  await sleep(1000);
  console.log('Capturing Frame 10: Customer Portal View...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_10_customer_portal.png') });
  await sleep(500);

  // Frame 11: Click Pay Balance Now in Customer Portal
  console.log('Opening Portal Instant Settlement Checkout...');
  const portalBtns = await page.$$('button');
  for (const btn of portalBtns) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('Pay Balance Now')) {
      await btn.click();
      break;
    }
  }
  await sleep(800);
  console.log('Capturing Frame 11: Instant UPI / Card Checkout...');
  await page.screenshot({ path: path.join(FRAMES_DIR, 'frame_11_portal_checkout.png') });

  await browser.close();
  console.log('All frames captured successfully!');
}

run().catch((err) => {
  console.error('Error capturing frames:', err);
  process.exit(1);
});
