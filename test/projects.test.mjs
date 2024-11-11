import fs from 'fs';

import { test, expect } from '@playwright/test';

import { capture } from '../lib/capture.mjs';
import { downloadProject, publishProject, visitEditorScene, visitLauncher } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { editorProjectUrl } from '../lib/url.mjs';

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
            test('goto editor (scene id) > goto launcher', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });

                // goto editor (scene)
                expect(await visitEditorScene(page, `${scenePath}/editor`, sceneId)).toStrictEqual([]);

                // goto launcher
                expect(await visitLauncher(page, `${scenePath}/launcher`, sceneId)).toStrictEqual([]);
            });

            test('download', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });

                // download
                expect(await downloadProject(page, `${scenePath}/download`, sceneId)).toStrictEqual([]);
            });

            test('publish > goto app > delete app', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });

                // publish
                expect(await publishProject(page, `${scenePath}/publish`, sceneId)).toStrictEqual([]);
            });
        });
    });
});
