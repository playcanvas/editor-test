import fs from 'fs';

import { chromium } from '@playwright/test';

import { HOST } from '../lib/url.mjs';
import { initInterface } from '../lib/web-interface.mjs';

const USER = 'kpal';
const YEAR = 2020;
const AUTH_PATH = 'playwright/.auth/user.json';

fs.mkdirSync('cache', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
    storageState: AUTH_PATH
});
const page = await context.newPage();

await page.goto(`https://${HOST}/editor`);
await page.evaluate(initInterface);

const user = await page.evaluate(name => wi.getUser(name), USER);
const projects = await page.evaluate(userId => wi.getProjects(userId), user.id);
const filtered = projects.filter(project => !/FORK$/.test(project.name) && new Date(project.created).getFullYear() > YEAR);
const data = await Promise.all(filtered.map(async (project) => {
    const scenes = await page.evaluate(projectId => wi.getScenes(projectId), project.id);
    return {
        id: project.id,
        name: project.name,
        scenes: scenes.map(scene => scene.id)
    };
}));

browser.close();

await fs.promises.writeFile('cache/projects.json', JSON.stringify(data, null, 4));
