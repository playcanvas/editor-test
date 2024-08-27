import { test, expect } from '@playwright/test';

test.describe('Auth', () => {
    test('check if signed in', async ({ page }) => {
        await page.goto('https://playcanvas.com/editor', { waitUntil: 'networkidle' });

        await expect(page).toHaveTitle(/Editor/);
    });
});
