import { expect, test, type Page } from '@playwright/test';

import { capture } from '../lib/capture';
import {
    createProject,
    deleteProject,
    getSetting
} from '../lib/common';
import { editorBlankUrl, editorUrl } from '../lib/config';
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
        expect(await capture('create-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            projectId = await createProject(page, PROJECT_NAME);
        })).toStrictEqual([]);
    });

    test('check settings', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            // open settings
            await page.getByRole('button', { name: '' }).click();

            // check asset tasks
            await page.getByText('ASSET TASKS', { exact: true }).click();
            expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
            expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});
