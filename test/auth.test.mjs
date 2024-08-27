import { test, expect } from '@playwright/test';

import { HOST } from './lib/url.mjs';

test('signed in', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await expect(page).toHaveTitle(/Editor/);
});
