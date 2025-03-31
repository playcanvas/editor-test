import * as fs from 'fs';

import { test, expect, type Page } from '@playwright/test';

import { deleteProject, downloadProject, importProject, publishProject, visitEditor, visitEditorScene, visitLauncher } from '../lib/common';
import { middleware } from '../lib/middleware';
import { id } from '../lib/utils';

const PROJECTS = fs.existsSync('projects') ? fs.readdirSync('projects') : [];

middleware(test);

test.describe.configure({
    mode: 'serial',
    timeout: 5 * 60 * 1000 // Increase timeout for importing large projects
});

const next = id();

PROJECTS.forEach((project) => {
    const FILE_NAME = project.split('.')[0];
    const IN_PATH = `projects/${project}`;
    const OUT_PATH = `out/${FILE_NAME}`;

    test.describe(`${project}: import/delete`, () => {
        const projectPath = `${OUT_PATH}/${next()}`;
        let projectId: number;
        let sceneId: number;
        let page: Page;

        test.describe.configure({
            mode: 'serial'
        });

        test.beforeAll(async ({ browser }) => {
            page = await browser.newPage();
            await fs.promises.mkdir(projectPath, { recursive: true });
        });

        test.afterAll(async () => {
            await page.close();
        });

        test('import project', async () => {
            const res = await importProject(page, `${projectPath}/import`, IN_PATH);
            expect(res.errors).toStrictEqual([]);
            expect(res.projectId).toBeDefined();
            projectId = res.projectId;
        });

        test('goto editor (project)', async () => {
            const res = await visitEditor(page, `${projectPath}/editor`, projectId);
            expect(res.errors).toStrictEqual([]);
            expect(res.sceneId).toBeDefined();
            sceneId = res.sceneId;
        });

        test('goto editor (scene)', async () => {
            const scenePath = `${projectPath}/${sceneId}`;
            await fs.promises.mkdir(scenePath, { recursive: true });
            expect(await visitEditorScene(page, `${scenePath}/editor`, sceneId)).toStrictEqual([]);
        });

        test('goto launcher', async () => {
            expect(await visitLauncher(page, `${projectPath}/launcher`, sceneId)).toStrictEqual([]);
        });

        test('delete project', async () => {
            expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
        });
    });

    test.describe(`${project}: publish/download`, () => {
        const projectPath = `${OUT_PATH}/${next()}`;
        let projectId: number;
        let sceneId: number;
        let page: Page;

        test.describe.configure({
            mode: 'serial'
        });

        test.beforeAll(async ({ browser }) => {
            page = await browser.newPage();
            await fs.promises.mkdir(projectPath, { recursive: true });
        });

        test.afterAll(async () => {
            await page.close();
        });

        test('import project', async () => {
            const res = await importProject(page, `${projectPath}/import`, IN_PATH);
            expect(res.errors).toStrictEqual([]);
            expect(res.projectId).toBeDefined();
            projectId = res.projectId;
        });

        test('goto editor (project)', async () => {
            const res = await visitEditor(page, `${projectPath}/editor`, projectId);
            expect(res.errors).toStrictEqual([]);
            expect(res.sceneId).toBeDefined();
            sceneId = res.sceneId;
        });

        test('download app', async () => {
            expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);
        });

        test('publish app', async () => {
            expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);
        });

        test('delete project', async () => {
            expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
        });
    });
});
