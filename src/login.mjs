import fs from 'fs';

import { chromium } from '@playwright/test';

import { GMAIL, PASSWORD, HOST } from '../lib/url.mjs';

const AUTH_PATH = 'playwright/.auth/user.json';

fs.mkdirSync('playwright/.auth', { recursive: true });

const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
});

const context = await browser.newContext();
const page = await context.newPage();
await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle' });
await page.context().storageState({ path: AUTH_PATH });

const page1Promise = page.waitForEvent('popup');
await page.getByText('Sign in with Google').click();
const page1 = await page1Promise;
await page1.getByLabel('Email or phone').fill(GMAIL);
await page1.getByRole('button', { name: 'Next' }).click();
await page1.getByLabel('Enter your password').fill(PASSWORD);
await page1.getByRole('button', { name: 'Next' }).click();
await page1.waitForEvent('close');
await page.waitForURL('**/editor/');

console.log('Authenticated');

await browser.close();

await import('./projects.mjs');
console.log('Projects cached');
