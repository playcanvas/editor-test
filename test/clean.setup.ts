import { test as setup, expect } from '@playwright/test';

import { HOST } from '../lib/url';
import { initInterface } from '../lib/web-interface';

setup('removing old projects', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await page.evaluate(initInterface);

    const projects = await page.evaluate(() => window.wi.getProjects(window.config.self.id));

    let deletePromise = Promise.resolve();
    for (const project of projects) {
        deletePromise = deletePromise.then(async () => {
            expect(await page.evaluate(id => window.wi.deleteProject(id), project.id)).toBe(true);
        });
    }

    await deletePromise;
});
