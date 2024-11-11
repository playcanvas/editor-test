import fs from 'fs';

import { test, expect } from '@playwright/test';

import { downloadProject, publishProject, visitEditor, visitEditorScene, visitLauncher } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';

const OUT_PATH = 'out';
const PROJECTS = fs.existsSync('cache/projects.json') ? JSON.parse(fs.readFileSync('cache/projects.json', 'utf8')) : [];

middleware(test);

test.describe.configure({
    mode: 'serial'
});

PROJECTS.forEach((project) => {
    test.describe(`${project.name} (${project.id})`, () => {
        const projectPath = `${OUT_PATH}/${project.id}`;
        test('goto editor (project id)', async ({ page }) => {
            await fs.promises.mkdir(projectPath, { recursive: true });
            expect(await visitEditor(page, `${projectPath}/editor`, project.id)).toStrictEqual([]);
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

            test('download > publish > goto app > delete app', async ({ page }) => {
                await fs.promises.mkdir(scenePath, { recursive: true });

                // download
                expect(await downloadProject(page, `${scenePath}/download`, sceneId)).toStrictEqual([]);

                // publish
                expect(await publishProject(page, `${scenePath}/publish`, sceneId)).toStrictEqual([]);
            });
        });
    });
});
