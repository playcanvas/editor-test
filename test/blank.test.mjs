import fs from 'fs';

import { expect, test } from '@playwright/test';

import { capture } from './lib/capture.mjs';
import { jsdocHack } from './lib/hack.mjs';
import { HOST, editorProjectUrl, editorSceneUrl, launchSceneUrl } from './lib/url.mjs';

const OUT_PATH = 'out';

jsdocHack(test);

test.describe('Blank', () => {
    test('creating and deleting a blank project', async ({ page }) => {
        await page.goto(`https://${HOST}`);

        await page.getByText('NEW', { exact: true }).click();
        await page.getByRole('button', { name: 'CREATE' }).click();
        await page.waitForURL('**/project/**');
        await page.getByRole('link', { name: ' SETTINGS' }).click();
        await page.getByRole('button', { name: 'DELETE' }).click();
        await page.getByPlaceholder('type here').fill('Blank Project');
        await page.locator('input[type="submit"]').click();
        await page.waitForURL('**/user/**');
    });

    test('creates new blank project opens editor and launch page then deletes', async ({ page }) => {
        await page.goto(`https://${HOST}`);

        await page.getByText('NEW', { exact: true }).click();
        await page.getByRole('button', { name: 'CREATE' }).click();
        await page.waitForURL('**/project/**');
        const projectId = /project\/(\d+)/.exec(page.url())[1];

        const projectPath = `${OUT_PATH}/${projectId}`;
        await fs.promises.mkdir(projectPath, { recursive: true });
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

        const sceneLaunchUrl = launchSceneUrl(sceneId);
        expect(await capture({
            page,
            outPath: `${scenePath}/launch`,
            fn: async () => {
                await page.goto(sceneLaunchUrl, { waitUntil: 'networkidle' });
                await page.screenshot({ path: `${scenePath}/launch.png` });
            }
        })).toStrictEqual([]);

        expect(await capture({
            page,
            outPath: `${projectPath}/project`,
            fn: async () => {
                await page.goto(`https://${HOST}/project/${projectId}`);
                await page.getByRole('link', { name: ' SETTINGS' }).click();
                await page.getByRole('button', { name: 'DELETE' }).click();
                await page.getByPlaceholder('type here').fill('Blank Project');
                await page.locator('input[type="submit"]').click();
            }
        }));
    });
});
