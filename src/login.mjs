import fs from 'fs';

import { chromium } from '@playwright/test';

fs.mkdirSync('playwright/.auth', { recursive: true });

const authFile = 'playwright/.auth/user.json';

const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
});

const context = await browser.newContext();
const page = await context.newPage();
await page.goto('https://playcanvas.com/editor');

await page.context().storageState({ path: authFile });

page.on('close', async () => {
    await browser.close();
});
