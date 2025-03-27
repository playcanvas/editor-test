import fs from 'fs';

import { chromium } from '@playwright/test';

import { GMAIL, PASSWORD, LOGIN_HOST } from '../lib/url';

const AUTH_PATH = 'playwright/.auth/user.json';

fs.mkdirSync('playwright/.auth', { recursive: true });

const browser = await chromium.launch({
    headless: true,
    args: [
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
    ]
});

// Modified from https://github.com/microsoft/playwright/issues/24374
const context = await browser.newContext({
    bypassCSP: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML. like Gecko) Chrome/94.0.4606.61 Safari/537.36'
});
const page = await context.newPage();
await page.goto(`https://${LOGIN_HOST}`);
await page.context().storageState({ path: AUTH_PATH });

const page1Promise = page.waitForEvent('popup');
await page.getByText('Sign in with Google').click();
const page1 = await page1Promise;
await page1.getByLabel('Email or phone').fill(GMAIL);
await page1.getByRole('button', { name: 'Next' }).click();
await page1.getByLabel('Enter your password').fill(PASSWORD);
await page1.getByRole('button', { name: 'Next' }).click();
await page1.waitForEvent('close');
await page.waitForURL('**/user/**');

console.log('Authenticated');

await browser.close();
