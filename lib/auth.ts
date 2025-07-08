import { chromium } from '@playwright/test';

import { LOGIN_HOST } from './config';

export const googleAuth = async (statePath: string, email: string, password: string) => {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    // modified from https://github.com/microsoft/playwright/issues/24374
    const context = await browser.newContext({
        bypassCSP: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML. like Gecko) Chrome/94.0.4606.61 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(`https://${LOGIN_HOST}`);
    await page.context().storageState({ path: statePath });

    const page1Promise = page.waitForEvent('popup');
    await page.getByText('Sign in with Google').click();
    const page1 = await page1Promise;
    await page1.getByLabel('Email or phone').fill(email);
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.getByLabel('Enter your password').fill(password);
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.waitForEvent('close');
    await page.waitForURL('**/user/**');

    await page.close();
    await context.close();
    await browser.close();
};

export const nativeAuth = async (statePath: string, email: string, password: string) => {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    // modified from https://github.com/microsoft/playwright/issues/24374
    const context = await browser.newContext({
        bypassCSP: true,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML. like Gecko) Chrome/94.0.4606.61 Safari/537.36'
    });
    const page = await context.newPage();
    await page.goto(`https://${LOGIN_HOST}`);
    await page.context().storageState({ path: statePath });

    await page.getByLabel('Email or Username').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: '  Log in' }).click();
    await page.waitForURL('**/user/**');

    await page.close();
    await context.close();
    await browser.close();
};
