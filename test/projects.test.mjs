import fs from 'fs';

import { test, expect } from '@playwright/test';

import projects from './fixtures/projects.mjs';
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

const editorProjectUrl = projectId => `https://${HOST}/editor/project/${projectId}?${SEARCH_PARAMS}`;
const editorSceneUrl = sceneId => `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`;
const launchSceneUrl = sceneId => `https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`;

// FIXME: This is a workaround for the JSDoc parser rate limiting.
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

test.describe('Projects', () => {
    projects.forEach((project) => {
        test.describe(project.name, () => {
            const projectPath = `${OUT_PATH}/${project.id}`;
            const projectUrl = editorProjectUrl(project.id);
            test(`checking ${projectUrl}`, async ({ page }) => {
                await fs.promises.mkdir(projectPath, { recursive: true });
                const errors = await navigate({
                    page,
                    url: projectUrl,
                    outPath: `${projectPath}/editor`
                });
                expect(errors).toStrictEqual([]);
            });

            project.scenes.forEach((sceneId) => {
                const scenePath = `${projectPath}/${sceneId}`;
                const sceneUrl = editorSceneUrl(sceneId);
                const sceneLaunchUrl = launchSceneUrl(sceneId);
                test(`checking ${sceneUrl}`, async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    const errors = await navigate({
                        page,
                        url: sceneUrl,
                        outPath: `${scenePath}/editor`
                    });
                    expect(errors).toStrictEqual([]);
                });

                test('downloading project', async ({ page }) => {
                    const errors = await download({
                        page,
                        url: sceneUrl,
                        outPath: `${scenePath}/download`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);
                });

                test('publishing project', async ({ page }) => {
                    const errors = await publish({
                        page,
                        url: sceneUrl,
                        outPath: `${scenePath}/publish`,
                        sceneId
                    });
                    expect(errors).toStrictEqual([]);
                });

                test(`checking https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`, async ({ page }) => {
                    const errors = await navigate({
                        page,
                        url: sceneLaunchUrl,
                        outPath: `${scenePath}/launch`
                    });
                    expect(errors).toStrictEqual([]);
                });
            });
        });
    });
});
