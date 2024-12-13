import { test as setup, expect } from '@playwright/test';

import { HOST } from '../lib/url.mjs';
import { initInterface } from '../lib/web-interface.mjs';

setup('removing old projects', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await page.evaluate(initInterface);

    const projects = await page.evaluate(() => wi.getProjects(config.self.id));

    let deletePromise = Promise.resolve();
    for (const project of projects) {
        deletePromise = deletePromise.then(async () => {
            expect(await page.evaluate(id => wi.deleteProject(id), project.id)).toBe(true);
        });
    }

    await deletePromise;
});
