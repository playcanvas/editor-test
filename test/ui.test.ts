import type { Observer } from '@playcanvas/observer';
import { expect, test, type Page } from '@playwright/test';

import { capture } from '../lib/capture';
import {
    createProject,
    deleteProject,
    getSetting
} from '../lib/common';
import { editorBlankUrl, editorUrl } from '../lib/config';
import { middleware } from '../lib/middleware';
import { wait } from '../lib/utils';

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
            await page.getByRole('button', { name: 'Accept All Cookies' }).click();
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

test.describe('checkpoint/diff/merge/conficts', () => {
    let projectId: number;
    let page: Page;
    let materialId: number;

    let mainBranchId: string;
    let mainCheckpointId: string;

    let redBranchId: string;

    let greenBranchId: string;

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

    test('prepare project', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });
            await page.getByRole('button', { name: 'Accept All Cookies' }).click();

            [materialId, mainBranchId, mainCheckpointId] = await page.evaluate(async () => {
                // Setup material
                const material = await window.editor.api.globals.assets.createMaterial({ name: 'TEST_MATERIAL' });

                // Create checkpoint
                const checkpoint = await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'BASE'
                }).promisify();

                return [
                    material.get('id'),
                    window.editor.api.globals.branchId,
                    checkpoint.id
                ];
            });
        })).toStrictEqual([]);
    });

    test('create red branch', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // create red branch
            await page.locator(`#checkpoint-${mainCheckpointId}`).getByText('').click();
            await page.locator('div').filter({ hasText: /^New Branch$/ }).nth(1).click();
            await page.getByRole('textbox').nth(3).click();
            await page.getByRole('textbox').nth(3).fill('red');
            await page.getByText('Create New Branch').click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
            redBranchId = await page.evaluate(() => window.editor.api.globals.branchId);

            // set material color RED
            await page.evaluate(async (materialId) => {
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [1, 0, 0]);
            }, materialId);

            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).first().click();

            // create checkpoint
            await page.getByText('Checkpoint', { exact: true }).click();
            await page.getByRole('textbox').nth(3).fill('RED');
            await page.getByText('Create Checkpoint', { exact: true }).click();
            await page.getByText('RED', { exact: true }).waitFor({ state: 'visible' });
        })).toStrictEqual([]);
    });

    test('create green branch', async () => {
        expect(await capture('editor', page, async () => {
            // select main branch
            await page.getByText('main', { exact: true }).click();

            // create green branch
            await page.locator(`#checkpoint-${mainCheckpointId}`).getByText('').click();
            await page.locator('div').filter({ hasText: /^New Branch$/ }).nth(1).click();
            await page.getByRole('textbox').nth(3).click();
            await page.getByRole('textbox').nth(3).fill('green');
            await page.getByText('Create New Branch').click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
            greenBranchId = await page.evaluate(() => window.editor.api.globals.branchId);

            // set material color GREEN
            await page.evaluate(async (materialId) => {
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [0, 1, 0]);
            }, materialId);

            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).first().click();

            // create checkpoint
            await page.getByText('Checkpoint', { exact: true }).click();
            await page.getByRole('textbox').nth(3).fill('GREEN');
            await page.getByText('Create Checkpoint', { exact: true }).click();
            await page.getByText('GREEN', { exact: true }).waitFor({ state: 'visible' });
        })).toStrictEqual([]);
    });

    test('switch to main branch', async () => {
        expect(await capture('editor', page, async () => {
            // select main branch
            await page.getByText('main', { exact: true }).click();

            // switch to main branch
            await page.locator(`#branch-${mainBranchId}`).getByText('').click();
            await page.getByText('Switch To This Branch').click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('merge red branch', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // start merge
            await page.locator('li').filter({ hasText: redBranchId }).locator('div').nth(2).click();
            await page.getByText('Merge Into Current Branch').click();

            // uncheck checkpoint create
            await page.locator('div:nth-child(3) > div > div:nth-child(2) > .content > .ui-checkbox').click();

            // check close branch
            await page.locator('div:nth-child(3) > .content > .ui-checkbox').first().click();

            // create merge
            await page.getByText('START MERGE').click();

            // apply merge
            await page.getByText('COMPLETE MERGE').click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('merge green branch', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // start merge
            await page.locator('li').filter({ hasText: greenBranchId }).locator('div').nth(2).click();
            await page.getByText('Merge Into Current Branch').click();

            // uncheck checkpoint create
            await page.locator('div:nth-child(3) > div > div:nth-child(2) > .content > .ui-checkbox').click();

            // create merge
            await page.getByText('START MERGE').click();

            // review conflicts
            await page.getByText('USE ALL FROM THIS BRANCH').nth(1).click();
            await page.getByText('REVIEW MERGE').click();

            // apply merge
            await page.getByText('COMPLETE MERGE').click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('restore checkpoint', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // start restore checkpoint
            await page.locator(`#checkpoint-${mainCheckpointId}`).getByText('').click();
            await page.locator('div').filter({ hasText: /^Restore$/ }).nth(1).click();

            // uncheck checkpoint create
            await page.locator('.content > div:nth-child(2) > .content > .ui-checkbox').first().click();

            // restore checkpoint
            await page.getByText('Restore Checkpoint', { exact: true }).click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('hard reset checkpoint', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // start hard reset
            await page.locator(`#checkpoint-${mainCheckpointId}`).getByText('').click();
            await page.locator('div').filter({ hasText: /^Hard Reset$/ }).nth(1).click();

            // confirm hard reset
            await page.locator('div').filter({ hasText: /^ARE YOU SURE\?Type "hard reset" to confirm$/ })
            .getByRole('textbox').fill('hard reset');

            // hard reset
            await page.getByText('Hard Reset To Checkpoint', { exact: true }).click();

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('delete red branch', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // change filter to closed branches
            await page.locator('div').filter({ hasText: /^Favorite Branches$/ }).click();
            await page.getByText('Closed Branches').click();

            // start delete red branch
            await page.locator(`#branch-${redBranchId}`).getByText('').click();
            await page.locator('div').filter({ hasText: 'Delete This Branch' }).nth(4).click();

            // confirm delete
            await page.getByRole('textbox').nth(3).fill('red');

            // delete branch
            await page.getByText('Delete Branch', { exact: true }).click();

            // reload page
            // FIXME: branch list currently not updated on delete
            await page.reload({ waitUntil: 'networkidle' });
        })).toStrictEqual([]);
    });

    test('delete green branch', async () => {
        expect(await capture('editor', page, async () => {
            // open version control dialog
            await page.locator('button').first().click();
            await page.locator('span').filter({ hasText: /^Version Control$/ }).click();

            // start delete green branch
            await page.locator(`#branch-${greenBranchId}`).getByText('').click();
            await page.locator('div').filter({ hasText: 'Delete This Branch' }).nth(4).click();

            // confirm delete
            await page.getByRole('textbox').nth(3).fill('green');

            // delete branch
            await page.getByText('Delete Branch', { exact: true }).click();
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
