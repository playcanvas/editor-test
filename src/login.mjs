import fs from 'fs';

import { chromium } from '@playwright/test';

import { HOST } from '../lib/url.mjs';

const AUTH_PATH = 'playwright/.auth/user.json';

fs.mkdirSync('playwright/.auth', { recursive: true });

const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
});

const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`https://${HOST}/editor`);

await page.context().storageState({ path: AUTH_PATH });

page.on('close', async () => {
    await browser.close();
});
