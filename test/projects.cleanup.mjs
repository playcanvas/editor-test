import { test as cleanup } from '@playwright/test';

import { HOST } from '../lib/url.mjs';
import { initInterface } from '../lib/web-interface.mjs';

const USER = 'kpal';

cleanup('cleanup lone project forks', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await page.evaluate(initInterface);
    const user = await page.evaluate(name => wi.getUser(name), USER);
    const projects = await page.evaluate(userId => wi.getProjects(userId), user.id);
    const forked = projects.filter(project => /FORK$/.test(project.name));
    await Promise.all(forked.map(project => page.evaluate(projectId => wi.deleteProject(projectId), project.id)));
    page.close();
});
