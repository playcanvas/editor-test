import { test as setup, expect } from '@playwright/test';

import { HOST } from '../lib/url';

setup('check if authed', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await expect(page).toHaveTitle(/Editor/);
});
