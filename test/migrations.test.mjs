import fs from 'fs';

import { expect, test } from '@playwright/test';

import { deleteProject, downloadProject, forkProject, getProjectId, getSceneId, importProject, publishProject, visitEditor } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { idGenerator } from '../lib/utils.mjs';

const OUT_PATH = 'out/migrations';
const PROJECT_NAME = 'Migrations';
const MATERIAL_NAME = 'TEST_MATERIAL';
const TEXTURE_NAME = 'TEST_TEXTURE';

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const nextId = idGenerator();

test('import > goto editor > check migrations > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    expect(await importProject(page, `${projectPath}/import`, 'test/fixtures/migrations.zip')).toStrictEqual([]);
    const projectId = getProjectId(page);

    // goto editor (project)
    expect(await visitEditor(page, `${projectPath}/editor`, projectId, async () => {
        // Check settings migration
        const settings = await page.evaluate(() => editor.call('settings:project').json());
        await expect(settings.hasOwnProperty('deviceTypes')).toBe(false);
        await expect(settings.hasOwnProperty('preferWebGl2')).toBe(false);
        await expect(settings.hasOwnProperty('useLegacyAudio')).toBe(false);
        await expect(settings.enableWebGpu).toBe(true);
        await expect(settings.enableWebGl2).toBe(false);

        // Check assets migration
        const assets = await page.evaluate((names) => {
            const assets = editor.call('assets:list');
            return names.map(name => assets.find(asset => asset.get('name') === name).json());
        }, [MATERIAL_NAME, TEXTURE_NAME]);

        const material = assets[0];
        await expect(material.data.hasOwnProperty('ambientTint')).toBe(false);
        await expect(material.data.hasOwnProperty('diffuseTint')).toBe(false);
        await expect(material.data.hasOwnProperty('emissiveTint')).toBe(false);
        await expect(material.data.hasOwnProperty('normalTint')).toBe(false);
        await expect(material.data.hasOwnProperty('opacityTint')).toBe(false);
        await expect(material.data.hasOwnProperty('heightTint')).toBe(false);
        await expect(material.data.hasOwnProperty('lightTint')).toBe(false);
        await expect(material.data.hasOwnProperty('metalnessTint')).toBe(false);
        await expect(material.data.hasOwnProperty('glossTint')).toBe(false);
        await expect(material.data.hasOwnProperty('clearCoatTint')).toBe(false);
        await expect(material.data.hasOwnProperty('clearCoatGlossTint')).toBe(false);
        await expect(material.data.hasOwnProperty('clearCoatNormalTint')).toBe(false);
        await expect(material.data.hasOwnProperty('sheenTint')).toBe(false);
        await expect(material.data.hasOwnProperty('sheenGlossTint')).toBe(false);
        await expect(material.data.hasOwnProperty('refractionTint')).toBe(false);
        await expect(material.data.hasOwnProperty('thicknessTint')).toBe(false);
        await expect(material.data.hasOwnProperty('iridescenceTint')).toBe(false);
        await expect(material.data.hasOwnProperty('iridescenceThicknessTint')).toBe(false);
        await expect(material.data.hasOwnProperty('fresnelModel')).toBe(false);
        await expect(material.data.hasOwnProperty('shader')).toBe(false);
        await expect(material.data.hasOwnProperty('useGammaTonemap')).toBe(false);
        await expect(material.data.hasOwnProperty('useGamma')).toBe(true);

        const texture = assets[1];
        await expect(texture.data.hasOwnProperty('srgb')).toBe(true);
    })).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});

test('import > fork project > goto editor > fork project > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    expect(await importProject(page, `${projectPath}/import`, 'test/fixtures/migrations.zip')).toStrictEqual([]);
    const projectId = getProjectId(page);

    // fork > delete forked
    expect(await forkProject(page, `${projectPath}/fork-before`, projectId, PROJECT_NAME)).toStrictEqual([]);

    // goto editor (project)
    expect(await visitEditor(page, `${projectPath}/editor`, projectId)).toStrictEqual([]);

    // fork > delete forked
    expect(await forkProject(page, `${projectPath}/fork-after`, projectId, PROJECT_NAME)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});


test('import > goto editor > download > publish > goto app > delete app > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    expect(await importProject(page, `${projectPath}/import`, 'test/fixtures/migrations.zip')).toStrictEqual([]);
    const projectId = getProjectId(page);

    // goto editor (project)
    expect(await visitEditor(page, `${projectPath}/editor`, projectId)).toStrictEqual([]);
    const sceneId = getSceneId(page);

    // download
    expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);

    // publish
    expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});
