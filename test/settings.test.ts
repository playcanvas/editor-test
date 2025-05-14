import { expect, test, type Page } from '@playwright/test';

import {
    createProject,
    deleteProject,
    getSetting,
    visitEditor
} from '../lib/common';
import { middleware } from '../lib/middleware';

const PROJECT_NAME = 'Blank Project';

test.describe.configure({
    mode: 'serial'
});

test.describe('settings', () => {
    let projectId: number;
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
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});
