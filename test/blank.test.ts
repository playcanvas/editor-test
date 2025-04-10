import { type Observer } from '@playcanvas/observer';
import { expect, test, type Page } from '@playwright/test';

import {
    createProject,
    deleteProject,
    downloadProject,
    getSetting,
    publishProject,
    visitCodeEditor,
    visitEditor,
    visitLauncher
} from '../lib/common';
import { middleware } from '../lib/middleware';
import { wait } from '../lib/utils';

const PROJECT_NAME = 'Blank Project';

test.describe.configure({
    mode: 'serial'
});

test.describe('create/delete', () => {
    let projectId: number;
    let forkedProjectId: number;
    let sceneId: number;
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
        const res = await createProject(page, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('fork project', async () => {
        const res = await createProject(page, `${PROJECT_NAME} FORK`, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        forkedProjectId = res.projectId;
    });

    test('delete forked project', async () => {
        expect(await deleteProject(page, forkedProjectId)).toStrictEqual([]);
    });

    test('goto editor', async () => {
        const res = await visitEditor(page, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
        sceneId = res.sceneId;
    });

    test('goto code editor', async () => {
        expect(await visitCodeEditor(page, projectId)).toStrictEqual([]);
    });

    test('goto launcher', async () => {
        expect(await visitLauncher(page, sceneId)).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});

test.describe('publish/download', () => {
    let projectId: number;
    let sceneId: number;
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
        const res = await createProject(page, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('goto editor', async () => {
        const res = await visitEditor(page, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
        sceneId = res.sceneId;
    });

    test('download app', async () => {
        expect(await downloadProject(page, sceneId)).toStrictEqual([]);
    });

    test('publish app', async () => {
        expect(await publishProject(page, sceneId)).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
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
        const res = await createProject(page, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('goto editor', async () => {
        const res = await visitEditor(page, projectId);
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('open settings', async () => {
        await page.getByRole('button', { name: '' }).click();
    });

    test('check asset tasks', async () => {
        await page.getByText('ASSET TASKS', { exact: true }).click();
        expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
        expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});

test.describe('version-control', () => {
    let projectId: number;
    let page: Page;
    let materialId: number;

    let mainBranchId: string;
    let mainCheckpointId: string;

    let redBranchId: string;
    let redCheckpointId: string;

    let greenBranchId: string;
    let greenCheckpointId: string;

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
        const res = await createProject(page, PROJECT_NAME);
        expect(res.errors).toStrictEqual([]);
        expect(res.projectId).toBeDefined();
        projectId = res.projectId;
    });

    test('prepare project', async () => {
        const res = await visitEditor(page, projectId, async () => {
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
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('create red branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            redBranchId = await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                const branch = await window.editor.api.globals.rest.branches.branchCreate({
                    name: 'red',
                    projectId: window.editor.api.globals.projectId,
                    sourceBranchId: mainBranchId,
                    sourceCheckpointId: mainCheckpointId
                }).promisify();

                return branch.id;
            }, [mainBranchId, mainCheckpointId]);

            // Wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');

            redCheckpointId = await page.evaluate(async (materialId) => {
                // Set material color RED
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [1, 0, 0]);

                // Create checkpoint
                const checkpoint = await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'RED'
                }).promisify();

                return checkpoint.id;
            }, materialId);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('create green branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            greenBranchId = await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                const branch = await window.editor.api.globals.rest.branches.branchCreate({
                    name: 'green',
                    projectId: window.editor.api.globals.projectId,
                    sourceBranchId: mainBranchId,
                    sourceCheckpointId: mainCheckpointId
                }).promisify();

                return branch.id;
            }, [mainBranchId, mainCheckpointId]);

            // Wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');

            greenCheckpointId = await page.evaluate(async (materialId) => {
                // Set material color GREEN
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [0, 1, 0]);

                // Create checkpoint
                const checkpoint = await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'GREEN'
                }).promisify();

                return checkpoint.id;
            }, materialId);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('merge red branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            await page.evaluate(async ([mainBranchId, redBranchId]) => {
                // Create merge
                const merge = await window.editor.api.globals.rest.merge.mergeCreate({
                    srcBranchId: redBranchId,
                    dstBranchId: mainBranchId,
                    srcBranchClose: true
                }).promisify();

                // TODO: Apply merge
            }, [mainBranchId, redBranchId]);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    // test('delete project', async () => {
    //     expect(await deleteProject(page, projectId)).toStrictEqual([]);
    // });
});
