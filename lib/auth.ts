import { chromium, type Page } from '@playwright/test';

import { LOGIN_HOST } from './config';

// modified from https://github.com/microsoft/playwright/issues/24374
const SILENT_ARGS = [
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled'
];
const SILENT_CTX = {
    bypassCSP: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'
};

const captchaFound = async (page: Page) => {
    const footer = await page.locator('#login-form div').first();
    if ((await footer.getAttribute('class'))?.includes('captcha')) {
        return true;
    }
    return false;
};

export const googleAuth = async (statePath: string, email: string, password: string, headless: boolean = true) => {
    const browser = await chromium.launch({
        headless,
        args: SILENT_ARGS
    });
    const context = await browser.newContext(SILENT_CTX);
    const page = await context.newPage();
    await page.goto(`https://${LOGIN_HOST}`, { waitUntil: 'networkidle' });

    // check for reCAPTCHA
    if (await captchaFound(page)) {
        throw new Error('Please complete the reCAPTCHA manually.');
    }

    // sign in with Google
    const page1Promise = page.waitForEvent('popup');
    await page.getByText('Sign in with Google').click();
    const page1 = await page1Promise;
    await page1.getByLabel('Email or phone').fill(email);
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.getByLabel('Enter your password').fill(password);
    await page1.getByRole('button', { name: 'Next' }).click();
    await page1.waitForEvent('close');
    await page.waitForURL('**/user/**');

    // save the storage state
    await page.context().storageState({ path: statePath });

    await page.close();
    await context.close();
    await browser.close();
};

export const nativeAuth = async (statePath: string, email: string, password: string, headless: boolean = true) => {
    const browser = await chromium.launch({
        headless,
        args: SILENT_ARGS
    });
    const context = await browser.newContext(SILENT_CTX);
    const page = await context.newPage();
    await page.goto(`https://${LOGIN_HOST}`, { waitUntil: 'networkidle' });

    // check for reCAPTCHA
    if (await captchaFound(page)) {
        throw new Error('Please complete the reCAPTCHA manually.');
    }

    // sign in with native auth
    await page.getByRole('textbox', { name: 'Email or Username' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: '  Log in' }).click();
    await page.waitForURL('**/user/**');

    // save the storage state
    await page.context().storageState({ path: statePath });

    await page.close();
    await context.close();
    await browser.close();
};
