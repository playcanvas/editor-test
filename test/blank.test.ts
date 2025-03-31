import * as fs from 'fs';

import { expect, test, type Page } from '@playwright/test';

import {
    createProject,
    deleteProject,
    downloadProject,
    getSetting,
    publishProject,
    visitEditor,
    visitEditorScene,
    visitLauncher
} from '../lib/common';
import { middleware } from '../lib/middleware';
import { id } from '../lib/utils';

const OUT_PATH = 'out/blank';
const PROJECT_NAME = 'Blank Project';

const next = id();

test.describe('create/delete', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
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
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('create project', async () => {
        const res = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('fork project', async () => {
        const res = await createProject(page, `${projectPath}/fork-create`, `${PROJECT_NAME} FORK`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        forkedProjectId = res.projectId;
    });

    test('delete forked project', async () => {
        expect(await deleteProject(page, `${projectPath}/fork-delete`, forkedProjectId)).toStrictEqual([]);
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

test.describe('publish/download', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
    let projectId: number;
    let sceneId: number;
    let page: Page;

    test.describe.configure({
        mode: 'serial'
    });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('create project', async () => {
        const res = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
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

test.describe('settings', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
    let projectId: number;
    let page: Page;

    test.describe.configure({
        mode: 'serial'
    });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('create project', async () => {
        const res = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('goto editor (project)', async () => {
        const res = await visitEditor(page, `${projectPath}/editor`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('open settings', async () => {
        await page.getByRole('button', { name: '' }).click();
    });

    test('check asset tasks', async () => {
        await page.getByText('ASSET TASKS', { exact: true }).click();
        expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
        expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');
    });

    test('delete project', async () => {
        expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
    });
});
