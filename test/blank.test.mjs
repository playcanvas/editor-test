import fs from 'fs';

import { expect, test } from '@playwright/test';

import { capture } from '../lib/capture.mjs';
import { middleware } from '../lib/middleware.mjs';
import { HOST, editorProjectUrl, editorSceneUrl, launchSceneUrl } from '../lib/url.mjs';

const OUT_PATH = 'out';

middleware(test);

test.describe.configure({
    mode: 'serial'
});

/**
 * @param {import('@playwright/test').Page} page - The page to search in.
 * @param {string} name - The name of the setting to find.
 * @returns {import('@playwright/test').Locator} - The div containing the setting.
 */
const getSetting = (page, name) => {
    return page.locator('div').filter({ hasText: new RegExp(`^${name}$`) }).locator('div');
};

const projectPath = `${OUT_PATH}/blank`;
test('create > fork > delete forked > goto editor > goto launcher > delete', async ({ page }) => {
    await fs.promises.mkdir(projectPath, { recursive: true });
    let projectId = '';

    // create
    expect(await capture({
        page,
        outPath: `${projectPath}/create`,
        fn: async () => {
            await page.goto(`https://${HOST}`);

            await page.getByText('NEW', { exact: true }).click();
            await page.getByText('Accept All Cookies', { exact: true }).click();
            await page.getByRole('button', { name: 'CREATE' }).click();
            await page.waitForURL('**/project/**');
            projectId = /project\/(\d+)/.exec(page.url())[1];
        }
    })).toStrictEqual([]);

    // fork > delete forked
    expect(await capture({
        page,
        outPath: `${projectPath}/fork`,
        fn: async () => {
            await page.getByText(' Fork').first().click();
            await page.getByPlaceholder('Project Name').fill('Blank Project FORK');
            await page.getByRole('button', { name: 'FORK' }).click();
            await page.waitForURL('**/project/**/overview/**-fork');

            await page.getByRole('link', { name: ' SETTINGS' }).click();
            await page.getByRole('button', { name: 'DELETE' }).click();
            await page.getByPlaceholder('type here').fill('Blank Project FORK');
            await page.locator('input[type="submit"]').click();
            await page.waitForURL('**/user/**');
        }
    })).toStrictEqual([]);

    // goto editor (project)
    const projectUrl = editorProjectUrl(projectId);
    expect(await capture({
        page,
        outPath: `${projectPath}/editor`,
        fn: async () => {
            await page.goto(projectUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${projectPath}/editor.png` });
        }
    })).toStrictEqual([]);

    await page.waitForURL('**/scene/**');
    const sceneId = /scene\/(\d+)/.exec(page.url())[1];

    // goto editor (scene)
    const scenePath = `${projectPath}/${sceneId}`;
    await fs.promises.mkdir(scenePath, { recursive: true });
    const sceneUrl = editorSceneUrl(sceneId);
    expect(await capture({
        page,
        outPath: `${scenePath}/editor`,
        fn: async () => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${scenePath}/editor.png` });
        }
    })).toStrictEqual([]);

    // goto launcher
    const sceneLaunchUrl = launchSceneUrl(sceneId);
    expect(await capture({
        page,
        outPath: `${scenePath}/launch`,
        fn: async () => {
            await page.goto(sceneLaunchUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${scenePath}/launch.png` });
        }
    })).toStrictEqual([]);

    // delete
    expect(await capture({
        page,
        outPath: `${projectPath}/delete`,
        fn: async () => {
            await page.goto(`https://${HOST}/project/${projectId}`, { waitUntil: 'networkidle' });
            await page.getByRole('link', { name: ' SETTINGS' }).click();
            await page.getByRole('button', { name: 'DELETE' }).click();
            await page.getByPlaceholder('type here').fill('Blank Project');
            await page.locator('input[type="submit"]').click();
        }
    })).toStrictEqual([]);
});

test('check default settings', async ({ page }) => {
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    await page.goto(`https://${HOST}`);
    await page.getByText('NEW', { exact: true }).click();
    await page.getByText('Accept All Cookies', { exact: true }).click();
    await page.getByRole('button', { name: 'CREATE' }).click();
    await page.waitForURL('**/project/**');
    const projectId = /project\/(\d+)/.exec(page.url())[1];

    // goto editor
    const projectUrl = editorProjectUrl(projectId);
    await page.goto(projectUrl, { waitUntil: 'networkidle' });
    await page.waitForURL('**/scene/**');

    // open settings
    await page.getByRole('button', { name: '' }).click();

    // open asset tasks
    await page.getByText('ASSET TASKS', { exact: true }).click();
    expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
    expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');

    // delete
    await page.goto(`https://${HOST}/project/${projectId}`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: ' SETTINGS' }).click();
    await page.getByRole('button', { name: 'DELETE' }).click();
    await page.getByPlaceholder('type here').fill('Blank Project');
    await page.locator('input[type="submit"]').click();
});
