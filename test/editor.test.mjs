import fs from 'fs';

import { test, expect } from '@playwright/test';

import projects from './fixtures/projects.mjs';
import { app } from './lib/app.mjs';
import { delete_ } from './lib/delete.mjs';
import { download } from './lib/download.mjs';
import { navigate } from './lib/navigate.mjs';
import { publish } from './lib/publish.mjs';

const OUT_PATH = 'out';

const HOST = process.env.PC_HOST ?? 'playcanvas.com';
const FRONTEND = process.env.PC_FRONTEND ?? '';
const ENGINE = process.env.PC_ENGINE ?? '';

const searchParams = {};
if (FRONTEND) {
    searchParams.use_local_frontend = undefined;
}
if (ENGINE) {
    searchParams.use_local_engine = ENGINE;
}
const SEARCH_PARAMS = Object.entries(searchParams).map(([key, value]) => {
    if (value === undefined) {
        return key;
    }
    return `${key}=${value}`;
}).join('&');

test.beforeEach(({ context }) => {
    context.route(/jsdoc-parser\/types\/lib\..+\.d\.ts/, (route) => {
        const matches = /jsdoc-parser\/types\/(lib\..+\.d\.ts)/.exec(route.request().url());
        const filePath = `./test/fixtures/jsdoc-parser/types/${matches[1]}`;
        route.fulfill({
            status: 200,
            contentType: 'text/plain',
            body: fs.readFileSync(filePath, 'utf8')
        });
    });
});

test.describe('Basic editor operations', () => {
    projects.forEach((project) => {
        test.describe(`Project: ${project.name}`, () => {
            const projectPath = `${OUT_PATH}/${project.id}`;
            test(`checking https://${HOST}/editor/project/${project.id}?${SEARCH_PARAMS}`, async ({ page }) => {
                await fs.promises.mkdir(projectPath, { recursive: true });
                const errors = await navigate({
                    page,
                    url: `https://${HOST}/editor/project/${project.id}?${SEARCH_PARAMS}`,
                    outPath: `${projectPath}/editor`
                });
                expect(errors).toStrictEqual([]);
            });

            project.scenes.forEach((sceneId) => {
                const scenePath = `${projectPath}/${sceneId}`;
                test(`checking https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    const errors = await navigate({
                        page,
                        url: `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`,
                        outPath: `${scenePath}/editor`
                    });
                    expect(errors).toStrictEqual([]);
                });

                test('downloading project', async ({ page }) => {
                    await page.goto(`https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, { waitUntil: 'networkidle' });
                    const errors = await download({
                        page,
                        outPath: `${scenePath}/download`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);
                });

                test('publishing project', async ({ page }) => {
                    await page.goto(`https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, { waitUntil: 'networkidle' });
                    let errors = await publish({
                        page,
                        outPath: `${scenePath}/publish`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);

                    errors = await app({
                        page,
                        outPath: `${scenePath}/app`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);

                    await page.goto(`https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, { waitUntil: 'networkidle' });
                    errors = await delete_({
                        page,
                        outPath: `${scenePath}/delete`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);
                });

                test(`checking https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`, async ({ page }) => {
                    const errors = await navigate({
                        page,
                        url: `https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`,
                        outPath: `${scenePath}/launch`
                    });
                    expect(errors).toStrictEqual([]);
                });
            });
        });
    });
});
