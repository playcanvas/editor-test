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

test.describe('create/delete', () => {
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
            await page.getByRole('button', { name: 'NEW PROJECT' }).click();
            await page.locator('div').filter({ hasText: /^NameDescriptionPrivate \(Premium\)$/ })
            .locator('input[type="text"]').fill(PROJECT_NAME);
            await page.getByRole('button', { name: 'CREATE' }).click();
            await page.getByRole('button', { name: 'Open New Project' }).click();
            await page.waitForURL('**/editor/scene/**');
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await page.getByText(PROJECT_NAME).click();
            await page.getByRole('button', { name: 'DELETE PROJECT' }).click();
            await page.getByRole('textbox').nth(4).fill(PROJECT_NAME);
            await page.getByRole('button', { name: 'DELETE', exact: true }).click();
        })).toStrictEqual([]);
    });
});

test.describe('publish/download', () => {
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

    test('goto editor', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });
        })).toStrictEqual([]);
    });

    test('download app', async () => {
        expect(await capture('download-project', page, async () => {
            // open publish dialog
            await page.getByRole('button', { name: '' }).click();

            // download app
            await page.getByRole('button', { name: 'Download .zip' }).click();
            await page.getByText('Download', { exact: true }).nth(1).click();

            // download link
            const downloadPagePromise = page.waitForEvent('popup');
            const downloadPromise = page.waitForEvent('download');
            await page.locator('span').filter({ hasText: 'Your build is readyDownload' })
            .locator('div').click();
            await downloadPagePromise;
            await downloadPromise;
        })).toStrictEqual([]);
    });

    test('publish app', async () => {
        expect(await capture('publish-project', page, async () => {
            // open publish dialog
            await page.getByRole('button', { name: '' }).click();

            // publish app
            await page.getByRole('button', { name: 'Publish To PlayCanvas' }).click();
            await page.getByText('Publish Now').click();
            await page.waitForSelector('.ui-list-item.primary.complete');

            // launch app
            const appPagePromise = page.waitForEvent('popup');
            await page.getByText('Blank Project', { exact: true }).click();
            const appPage = await appPagePromise;
            await appPage.close();

            // delete app
            await page.getByRole('button', { name: '' }).click();
            await page.locator('div:nth-child(174) > .inner > .ui-menu-item > .title').click();
            await page.getByRole('button', { name: 'Yes' }).click();
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
    });
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
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
    });
});
