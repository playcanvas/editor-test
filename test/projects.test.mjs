import fs from 'fs';

import { test, expect } from '@playwright/test';

import projects from './fixtures/projects.mjs';
import { capture } from './lib/capture.mjs';
import { download } from './lib/download.mjs';
import { jsdocHack } from './lib/hack.mjs';
import { publish } from './lib/publish.mjs';
import { editorProjectUrl, editorSceneUrl, launchSceneUrl } from './lib/url.mjs';

const OUT_PATH = 'out';

jsdocHack(test);

test.describe('Projects', () => {
    projects.forEach((project) => {
        test.describe(project.name, () => {
            const projectPath = `${OUT_PATH}/${project.id}`;
            const projectUrl = editorProjectUrl(project.id);
            test(`checking ${projectUrl}`, async ({ page }) => {
                await fs.promises.mkdir(projectPath, { recursive: true });
                expect(await capture({
                    page,
                    outPath: `${projectPath}/editor`,
                    fn: async () => {
                        await page.goto(projectUrl, { waitUntil: 'networkidle' });
                        await page.screenshot({ path: `${projectPath}/editor.png` });
                    }
                }));
            });

            project.scenes.forEach((sceneId) => {
                const scenePath = `${projectPath}/${sceneId}`;
                const sceneUrl = editorSceneUrl(sceneId);
                const sceneLaunchUrl = launchSceneUrl(sceneId);
                test(`checking ${sceneUrl}`, async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    expect(await capture({
                        page,
                        outPath: `${scenePath}/editor`,
                        fn: async () => {
                            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
                            await page.screenshot({ path: `${scenePath}/editor.png` });
                        }
                    }));
                });

                test('downloading project', async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    expect(await download({
                        page,
                        url: sceneUrl,
                        outPath: `${scenePath}/download`,
                        sceneId
                    })).toStrictEqual([]);
                });

                test('publish project, open app then delete published app', async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    expect(await publish({
                        page,
                        url: sceneUrl,
                        outPath: `${scenePath}/publish`,
                        sceneId
                    })).toStrictEqual([]);
                });

                test(`checking ${sceneLaunchUrl}`, async ({ page }) => {
                    await fs.promises.mkdir(scenePath, { recursive: true });
                    expect(await capture({
                        page,
                        outPath: `${scenePath}/launch`,
                        fn: async () => {
                            await page.goto(sceneLaunchUrl, { waitUntil: 'networkidle' });
                            await page.screenshot({ path: `${scenePath}/launch.png` });
                        }
                    }));
                });
            });
        });
    });
});
