import { test as setup, expect } from '@playwright/test';

import { HOST } from '../lib/url.mjs';

setup('check if authed', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await expect(page).toHaveTitle(/Editor/);
});
