import { expect, test, type Page } from '@playwright/test';

import { capture } from '../../lib/capture';
import {
    createProject,
    deleteProject,
    getSetting
} from '../../lib/common';
import { editorBlankUrl, editorUrl } from '../../lib/config';
import { middleware } from '../../lib/middleware';

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
            await page.getByRole('button', { name: 'Accept All Cookies' }).click();
            projectId = await createProject(page, PROJECT_NAME);
        })).toStrictEqual([]);
    });

    test('goto editor', async () => {
        expect(await capture('editor', page, async () => {
            await page.getByText('Blank Project').click();
            await page.getByRole('button', { name: 'EDITOR' }).click();
            await page.waitForURL('**/editor/scene/**', { waitUntil: 'networkidle' });
        })).toStrictEqual([]);
    });

    test('check settings', async () => {
        expect(await capture('editor', page, async () => {
            // open settings dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Settings$/ }).click();
            await page.waitForSelector('.pcui-container.settings');

            // check asset tasks
            await page.getByText('ASSET TASKS', { exact: true }).click();
            expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
            expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
    });
});
