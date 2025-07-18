import * as fs from 'fs';

import { chromium } from '@playwright/test';

import { AUTH_STATE, HOST } from '../lib/config';

const browser = await chromium.launch({
    headless: false
});
const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_STATE) ? AUTH_STATE : undefined
});
const page = await context.newPage();
page.on('close', async () => {
    await browser.close();
});

await page.goto(`https://${HOST}`);
