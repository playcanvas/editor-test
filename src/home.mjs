import fs from 'fs';

import { chromium } from '@playwright/test';

import { HOST } from '../lib/url.mjs';

const AUTH_PATH = 'playwright/.auth/user.json';

fs.mkdirSync('playwright/.auth', { recursive: true });

const browser = await chromium.launch({
    headless: false
});
const context = await browser.newContext({
    storageState: AUTH_PATH
});
const page = await context.newPage();
page.on('close', async () => {
    await browser.close();
});

await page.goto(`https://${HOST}`);
