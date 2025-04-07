import * as fs from 'fs';

import { test, expect, type Page } from '@playwright/test';

import { deleteProject, downloadProject, importProject, publishProject, visitEditor, visitLauncher } from '../lib/common';
import { middleware } from '../lib/middleware';

const PROJECTS_PATH = 'test/fixtures/projects/basic';
const PROJECTS = fs.existsSync(PROJECTS_PATH) ? fs.readdirSync(PROJECTS_PATH) : [];

test.describe.configure({
    mode: 'serial'
});

PROJECTS.forEach((project) => {
    const IN_PATH = `${PROJECTS_PATH}/${project}`;

    test.describe(`${project}: import/delete`, () => {
        let projectId: number;
        let sceneId: number;
        let page: Page;

        test.describe.configure({
            mode: 'serial',
            timeout: 5 * 60 * 1000 // Increase timeout for importing large projects
        });

        test.beforeAll(async ({ browser }) => {
            page = await browser.newPage();
            await middleware(page.context());
        });

        test.afterAll(async () => {
            await page.close();
        });

        test('import project', async () => {
            const res = await importProject(page, IN_PATH);
            expect(res.errors).toStrictEqual([]);
            expect(res.projectId).toBeDefined();
            projectId = res.projectId;
        });

        test('goto editor', async () => {
            const res = await visitEditor(page, projectId);
            expect(res.errors).toStrictEqual([]);
            expect(res.sceneId).toBeDefined();
            sceneId = res.sceneId;
        });

        test('goto launcher', async () => {
            expect(await visitLauncher(page, sceneId)).toStrictEqual([]);
        });

        test('delete project', async () => {
            expect(await deleteProject(page, projectId)).toStrictEqual([]);
        });
    });

    test.describe(`${project}: publish/download`, () => {
        let projectId: number;
        let sceneId: number;
        let page: Page;

        test.describe.configure({
            mode: 'serial'
        });

        test.beforeAll(async ({ browser }) => {
            page = await browser.newPage();
            await middleware(page.context());
        });

        test.afterAll(async () => {
            await page.close();
        });

        test('import project', async () => {
            const res = await importProject(page, IN_PATH);
            expect(res.errors).toStrictEqual([]);
            expect(res.projectId).toBeDefined();
            projectId = res.projectId;
        });

        test('goto editor (project)', async () => {
            const res = await visitEditor(page, projectId);
            expect(res.errors).toStrictEqual([]);
            expect(res.sceneId).toBeDefined();
            sceneId = res.sceneId;
        });

        test('download app', async () => {
            expect(await downloadProject(page, sceneId)).toStrictEqual([]);
        });

        test('publish app', async () => {
            expect(await publishProject(page, sceneId)).toStrictEqual([]);
        });

        test('delete project', async () => {
            expect(await deleteProject(page, projectId)).toStrictEqual([]);
        });
    });
});
