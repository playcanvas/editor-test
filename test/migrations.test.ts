import * as fs from 'fs';

import { expect, test, type Page } from '@playwright/test';

import { createProject, deleteProject, downloadProject, importProject, publishProject, visitEditor } from '../lib/common';
import { middleware } from '../lib/middleware';
import { id } from '../lib/utils';

const IN_PATH = 'test/fixtures/projects/migrations.zip';
const OUT_PATH = 'out/migrations';
const PROJECT_NAME = 'Migrations';
const MATERIAL_NAME = 'TEST_MATERIAL';
const TEXTURE_NAME = 'TEST_TEXTURE';
const ENTITY_NAME = 'Root';

test.describe.configure({
    mode: 'serial'
});

const next = id();

test.describe('fork', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
    let projectId: number;
    let forkedProjectId: number;
    let page: Page;

    test.describe.configure({
        mode: 'serial'
    });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('import project', async () => {
        const res = await importProject(page, `${projectPath}/import`, IN_PATH);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('fork project', async () => {
        const res = await createProject(page, `${projectPath}/fork-create`, `${PROJECT_NAME} FORK`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        forkedProjectId = res.projectId;
    });

    test('delete forked project', async () => {
        expect(await deleteProject(page, `${projectPath}/fork-delete`, forkedProjectId)).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
    });
});

test.describe('migrations', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
    let projectId: number;
    let page: Page;

    test.describe.configure({
        mode: 'serial'
    });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('import project', async () => {
        const res = await importProject(page, `${projectPath}/import`, IN_PATH);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('check migrations', async () => {
        const res = await visitEditor(page, `${projectPath}/editor`, projectId, async () => {

            // Check project settings migration
            const projectSettings = await page.evaluate(() => window.editor.call('settings:project').json());
            expect(projectSettings.hasOwnProperty('deviceTypes')).toBe(false);
            expect(projectSettings.hasOwnProperty('preferWebGl2')).toBe(false);
            expect(projectSettings.hasOwnProperty('useLegacyAudio')).toBe(false);
            expect(projectSettings.engineV2).toBe(true);
            expect(projectSettings.useLegacyScripts).toBe(false);
            expect(projectSettings.enableWebGpu).toBe(true);
            expect(projectSettings.enableWebGl2).toBe(false);

            // Check assets migration
            const assets = await page.evaluate((names) => {
                const assets = window.editor.call('assets:list');
                return names.map(name => assets.find((asset: any) => asset.get('name') === name).json());
            }, [MATERIAL_NAME, TEXTURE_NAME]);

            const material = assets[0];
            expect(material.data.hasOwnProperty('fresnelModel')).toBe(false);
            expect(material.data.ambientTint).toBe(true);
            expect(material.data.ambient).toStrictEqual([1, 1, 1]);
            expect(material.data.diffuseTint).toBe(true);
            expect(material.data.diffuse).toStrictEqual([0, 0, 0]);
            expect(material.data.emissiveTint).toBe(true);
            expect(material.data.emissive).toStrictEqual([1, 1, 1]);
            expect(material.data.metalnessTint).toBe(true);
            expect(material.data.sheenTint).toBe(true);
            expect(material.data.sheenGlossTint).toBe(true);
            expect(material.data.useGammaTonemap).toBe(false);
            expect(material.data.useTonemap).toBe(false);
            expect(material.data.shader).toBe('blinn');

            // const texture = assets[1];
            // FIXME: Not enabled yet
            // expect(texture.data.hasOwnProperty('srgb')).toBe(true);

            // Check entity migration
            const entity = await page.evaluate((name) => {
                const entity = window.editor.call('entities:list').find((e: any) => e.get('name') === name);
                return entity.json();
            }, ENTITY_NAME);

            // light
            expect(entity.components.light.shadowType).toBe(2); // VSM16

            // camera
            // FIXME: Project on V2 so migrations not applied
            // expect(entity.components.camera.toneMapping).toBe(4); // ACES2
            expect(entity.components.camera.gammaCorrection).toBe(1); // 2.2

        });
        expect(res.errors).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
    });
});

test.describe('publish/download', () => {
    const projectPath = `${OUT_PATH}/${next()}`;
    let projectId: number;
    let sceneId: number;
    let page: Page;

    test.describe.configure({
        mode: 'serial'
    });

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        await fs.promises.mkdir(projectPath, { recursive: true });
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('import project', async () => {
        const res = await importProject(page, `${projectPath}/import`, IN_PATH);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('goto editor (project)', async () => {
        const res = await visitEditor(page, `${projectPath}/editor`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
        sceneId = res.sceneId;
    });

    test('download app', async () => {
        expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);
    });

    test('publish app', async () => {
        expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
    });
});
