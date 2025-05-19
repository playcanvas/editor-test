import { expect, test, type Page } from '@playwright/test';

import { capture } from '../lib/capture';
import {
    createProject,
    deleteProject,
    downloadProject,
    publishProject,
    visitEditor,
    visitLauncher
} from '../lib/common';
import { codeEditorUrl } from '../lib/config';
import { middleware } from '../lib/middleware';

const PROJECT_NAME = 'Blank Project';

test.describe.configure({
    mode: 'serial'
});

test.describe('create/delete', () => {
    let projectId: number;
    let forkedProjectId: number;
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

    test('create project', async () => {
        const res = await createProject(page, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('fork project', async () => {
        const res = await createProject(page, `${PROJECT_NAME} FORK`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        forkedProjectId = res.projectId;
    });

    test('delete forked project', async () => {
        expect(await deleteProject(page, forkedProjectId)).toStrictEqual([]);
    });

    test('goto editor', async () => {
        const res = await visitEditor(page, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
        sceneId = res.sceneId;
    });

    test('goto code editor', async () => {
        expect(await capture('code-editor', page, async () => {
            await page.goto(codeEditorUrl(projectId), { waitUntil: 'networkidle' });
        })).toStrictEqual([]);
    });

    test('goto launcher', async () => {
        expect(await visitLauncher(page, sceneId)).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});

test.describe('publish/download', () => {
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

    test('create project', async () => {
        const res = await createProject(page, PROJECT_NAME);
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
