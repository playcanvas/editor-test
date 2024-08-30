import fs from 'fs';

import { test, expect } from '@playwright/test';

import { capture } from '../lib/capture.mjs';
import { middleware } from '../lib/middleware.mjs';
import { editorProjectUrl, editorSceneUrl, launchSceneUrl } from '../lib/url.mjs';
import { poll } from '../lib/utils.mjs';
import { initInterface } from '../lib/web-interface.mjs';

const OUT_PATH = 'out';
const PROJECTS = fs.existsSync('cache/projects.json') ? JSON.parse(fs.readFileSync('cache/projects.json', 'utf8')) : [];

middleware(test);

test.describe.configure({
    mode: 'serial'
});

PROJECTS.forEach((project) => {
    test.describe(`${project.name} (${project.id})`, () => {
        const projectPath = `${OUT_PATH}/${project.id}`;
        const projectUrl = editorProjectUrl(project.id);
        test('goto editor (project id)', async ({ page }) => {
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
            test('goto editor (scene id) > goto launcher', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });
                expect(await capture({
                    page,
                    outPath: `${scenePath}/editor`,
                    fn: async () => {
                        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
                        await page.screenshot({ path: `${scenePath}/editor.png` });
                    }
                }));

                expect(await capture({
                    page,
                    outPath: `${scenePath}/launch`,
                    fn: async () => {
                        await page.goto(sceneLaunchUrl, { waitUntil: 'networkidle' });
                        await page.screenshot({ path: `${scenePath}/launch.png` });
                    }
                }));
            });

            test('download', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });
                expect(await capture({
                    page,
                    outPath: `${scenePath}/download`,
                    fn: async (errors) => {
                        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
                        await page.evaluate(initInterface);

                        const scenes = await page.evaluate(() => wi.getScenes());
                        if (!scenes.length) {
                            errors.push('[FETCH ERROR] Scenes not found');
                            return;
                        }
                        const sceneIds = scenes
                        .map(scene => scene.id)
                        .sort((a, b) => {
                            if (a === sceneId) return -1;
                            if (b === sceneId) return 1;
                            return 0;
                        });

                        const download = await page.evaluate(sceneIds => wi.postDownload(sceneIds), sceneIds);
                        if (download.error) {
                            errors.push(`[JOB ERROR] ${download.error}`);
                            return;
                        }

                        const job = await poll(async () => {
                            const job = await page.evaluate(downloadId => wi.checkDownload(downloadId), download.id);
                            if (job.status !== 'running') {
                                return job;
                            }
                        });
                        if (job.error) {
                            errors.push(`[JOB ERROR] ${job.error}`);
                        } else if (job.status !== 'complete') {
                            errors.push(`[JOB STATUS] ${job.status}`);
                        }
                    }
                })).toStrictEqual([]);
            });

            test('publish > goto app > delete app', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });
                expect(await capture({
                    page,
                    outPath: `${scenePath}/publish`,
                    fn: async (errors) => {
                        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
                        await page.evaluate(initInterface);

                        const scenes = await page.evaluate(() => wi.getScenes());
                        if (!scenes.length) {
                            errors.push('[FETCH ERROR] Scenes not found');
                            return;
                        }
                        const sceneIds = scenes
                        .map(scene => scene.id)
                        .sort((a, b) => {
                            if (a === sceneId) return -1;
                            if (b === sceneId) return 1;
                            return 0;
                        });

                        const app = await page.evaluate(sceneIds => wi.postPublish(sceneIds), sceneIds);
                        if (app.task.error) {
                            errors.push(`[JOB ERROR] ${app.task.error}`);
                            return;
                        }

                        const pubJob = await poll(async () => {
                            const job = await page.evaluate(appId => wi.checkPublish(appId), app.id);
                            if (job.status !== 'running') {
                                return job;
                            }
                        });

                        if (pubJob.error) {
                            errors.push(`[JOB ERROR] ${pubJob.error}`);
                        } else if (pubJob.status !== 'complete') {
                            errors.push(`[JOB STATUS] ${pubJob.status}`);
                        }
                        if (errors.length) {
                            return;
                        }

                        // launch app
                        await page.goto(app.url, { waitUntil: 'networkidle' });
                        await page.screenshot({ path: `${scenePath}/publish.png` });

                        // delete app
                        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
                        await page.evaluate(initInterface);
                        const delJob = await page.evaluate(appId => wi.deleteApp(appId), app.id);
                        if (delJob.error) {
                            errors.push(`[JOB ERROR] ${delJob.error}`);
                        } else if (delJob.status !== 'complete') {
                            errors.push(`[JOB STATUS] ${delJob.status}`);
                        }
                    }
                })).toStrictEqual([]);
            });
        });
    });
});
