import fs from 'fs';

import { expect, test } from '@playwright/test';

import { createProject, deleteProject, downloadProject, importProject, publishProject, visitEditor } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { idGenerator } from '../lib/utils.mjs';

const IN_PATH = 'test/fixtures/projects/migrations.zip';
const OUT_PATH = 'out/migrations';
const PROJECT_NAME = 'Migrations';
const MATERIAL_NAME = 'TEST_MATERIAL';
const TEXTURE_NAME = 'TEST_TEXTURE';
const ENTITY_NAME = 'Root';

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const nextId = idGenerator();

test('import > goto editor > check migrations > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    const {
        errors: importErrors,
        projectId
    } = await importProject(page, `${projectPath}/import`, IN_PATH);
    expect(importErrors).toStrictEqual([]);

    // goto editor (project)
    const {
        errors: editorErrors
    } = await visitEditor(page, `${projectPath}/editor`, projectId, async () => {

        // Check project settings migration
        const projectSettings = await page.evaluate(() => editor.call('settings:project').json());
        expect(projectSettings.hasOwnProperty('deviceTypes')).toBe(false);
        expect(projectSettings.hasOwnProperty('preferWebGl2')).toBe(false);
        expect(projectSettings.hasOwnProperty('useLegacyAudio')).toBe(false);
        expect(projectSettings.engineV2).toBe(true);
        expect(projectSettings.useLegacyScripts).toBe(false);
        expect(projectSettings.enableWebGpu).toBe(true);
        expect(projectSettings.enableWebGl2).toBe(false);

        // Check assets migration
        const assets = await page.evaluate((names) => {
            const assets = editor.call('assets:list');
            return names.map(name => assets.find(asset => asset.get('name') === name).json());
        }, [MATERIAL_NAME, TEXTURE_NAME]);

        const material = assets[0];
        expect(material.data.hasOwnProperty('fresnelModel')).toBe(false);
        expect(material.data.hasOwnProperty('useGammaTonemap')).toBe(false);
        expect(material.data.ambientTint).toBe(true);
        expect(material.data.ambient).toStrictEqual([1, 1, 1]);
        expect(material.data.diffuseTint).toBe(true);
        expect(material.data.diffuse).toStrictEqual([0, 0, 0]);
        expect(material.data.emissiveTint).toBe(true);
        expect(material.data.emissive).toStrictEqual([1, 1, 1]);
        expect(material.data.metalnessTint).toBe(true);
        expect(material.data.sheenTint).toBe(true);
        expect(material.data.sheenGlossTint).toBe(true);
        expect(material.data.useGamma).toBe(false);
        expect(material.data.shader).toBe('blinn');

        const texture = assets[1];
        expect(texture.data.hasOwnProperty('srgb')).toBe(true);

        // Check entity migration
        const entity = await page.evaluate((name) => {
            const entity = editor.call('entities:list').find(e => e.get('name') === name);
            return entity.json();
        }, ENTITY_NAME);

        // light
        expect(entity.components.light.shadowType).toBe(2); // VSM16

        // camera
        expect(entity.components.camera.toneMapping).toBe(4); // ACES2
        expect(entity.components.camera.gammaCorrection).toBe(1); // 2.2

    });
    expect(editorErrors).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});

test('import > fork project > goto editor > fork project > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    const {
        errors: importErrors,
        projectId
    } = await importProject(page, `${projectPath}/import`, IN_PATH);
    expect(importErrors).toStrictEqual([]);

    // fork > delete forked
    const {
        errors: forkBeforeErrors,
        projectId: forkedBeforeProjectId
    } = await createProject(page, `${projectPath}/fork-before-create`, `${PROJECT_NAME} FORK`, projectId);
    expect(forkBeforeErrors).toStrictEqual([]);
    expect(await deleteProject(page, `${projectPath}/fork-before-delete`, forkedBeforeProjectId)).toStrictEqual([]);

    // goto editor (project)
    const {
        errors: editorErrors
    } = await visitEditor(page, `${projectPath}/editor`, projectId);
    expect(editorErrors).toStrictEqual([]);

    // fork > delete forked
    const {
        errors: forkAfterErrors,
        projectId: forkedAfterProjectId
    } = await createProject(page, `${projectPath}/fork-after-create`, `${PROJECT_NAME} FORK`, projectId);
    expect(forkAfterErrors).toStrictEqual([]);
    expect(await deleteProject(page, `${projectPath}/fork-after-delete`, forkedAfterProjectId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});

test('import > goto editor > download > publish > goto app > delete app > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // import
    const {
        errors: importErrors,
        projectId
    } = await importProject(page, `${projectPath}/import`, IN_PATH);
    expect(importErrors).toStrictEqual([]);

    // goto editor (project)
    const {
        errors: editorErrors,
        sceneId
    } = await visitEditor(page, `${projectPath}/editor`, projectId);
    expect(editorErrors).toStrictEqual([]);

    // download
    expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);

    // publish
    expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});
