import fs from 'fs';

import { test as setup } from '@playwright/test';

import { HOST } from './lib/url.mjs';
import { initInterface } from './lib/web-interface.mjs';

const USER = 'kpal';

setup('fetch user projects', async ({ page }) => {
    await page.goto(`https://${HOST}/editor`);
    await page.evaluate(initInterface);
    const user = await page.evaluate(name => wi.getUser(name), USER);
    const projects = await page.evaluate(userId => wi.getProjects(userId), user.id);
    const data = await Promise.all(projects.map(async (project) => {
        const scenes = await page.evaluate(projectId => wi.getScenes(projectId), project.id);
        return {
            id: project.id,
            name: project.name,
            scenes: scenes.map(scene => scene.id)
        };
    }));
    page.close();
    await fs.promises.writeFile('test/fixtures/projects.cache.json', JSON.stringify(data, null, 4));
});
