import fs from 'fs';

import { expect, test } from '@playwright/test';

import { deleteProject, downloadProject, forkProject, getProjectId, getSceneId, importProject, publishProject, visitEditor } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { idGenerator } from '../lib/utils.mjs';

const OUT_PATH = 'out/migrations';
const PROJECT_NAME = 'Migrations';
const MATERIAL_NAME = 'TEST_MATERIAL';
const TEXTURE_NAME = 'TEST_TEXTURE';

// const resetSettings = () => {
//     const settings = editor.call('settings:project');
//     settings.set('deviceTypes', ['webgpu']);
//     settings.set('preferWebGl2', true);
//     settings.set('useLegacyAudio', false);

//     settings.unset('enableWebGpu');
//     settings.unset('enableWebGl2');
// };

// const resetMaterial = (id) => {
//     const material = editor.call('assets:get', id);
//     material.set('data.ambientTint', false);
//     material.set('data.ambient', [1, 0, 0]);
//     material.set('data.diffuseTint', false);
//     material.set('data.diffuse', [1, 0, 0]);
//     material.set('data.emissiveTint', false);
//     material.set('data.emissive', [1, 0, 0]);
//     material.set('data.fresnelModel', 0);
//     material.set('data.shader', 'phong');
//     material.set('data.useGammaTonemap', false);

//     material.unset('data.metalnessTint');
//     material.unset('data.sheenTint');
//     material.unset('data.sheenGlossTint');
//     material.unset('data.useGamma');
// };

// const resetTexture = (id) => {
//     const texture = editor.call('assets:get', id);
//     texture.unset('data.srgb');
// };

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
        expect(settings.hasOwnProperty('deviceTypes')).toBe(false);
        expect(settings.hasOwnProperty('preferWebGl2')).toBe(false);
        expect(settings.hasOwnProperty('useLegacyAudio')).toBe(false);
        expect(settings.enableWebGpu).toBe(true);
        expect(settings.enableWebGl2).toBe(false);

        // Check assets migration
        const assets = await page.evaluate((names) => {
            const assets = editor.call('assets:list');
            return names.map(name => assets.find(asset => asset.get('name') === name).json());
        }, [MATERIAL_NAME, TEXTURE_NAME]);

        const material = assets[0];
        expect(material.data.ambientTint).toBe(true);
        expect(material.data.ambient).toStrictEqual([1, 1, 1]);
        expect(material.data.diffuseTint).toBe(true);
        expect(material.data.diffuse).toStrictEqual([1, 1, 1]);
        expect(material.data.emissiveTint).toBe(true);
        expect(material.data.emissive).toStrictEqual([1, 0, 0]);
        expect(material.data.metalnessTint).toBe(true);
        expect(material.data.sheenTint).toBe(true);
        expect(material.data.sheenGlossTint).toBe(true);
        expect(material.data.hasOwnProperty('fresnelModel')).toBe(false);
        expect(material.data.hasOwnProperty('shader')).toBe(false);
        expect(material.data.hasOwnProperty('useGammaTonemap')).toBe(false);
        expect(material.data.hasOwnProperty('useGamma')).toBe(true);

        const texture = assets[1];
        expect(texture.data.hasOwnProperty('srgb')).toBe(true);
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
