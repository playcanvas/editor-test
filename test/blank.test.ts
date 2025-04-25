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

            await page.evaluate(async (materialId) => {
                // Set material color RED
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [1, 0, 0]);

                // Create checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'RED'
                }).promisify();
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

            await page.evaluate(async (materialId) => {
                // Set material color GREEN
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [0, 1, 0]);

                // Create checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'GREEN'
                }).promisify();
            }, materialId);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('switch to main branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            // Switch to main branch
            await page.evaluate(async (mainBranchId) => {
                await window.editor.api.globals.rest.branches.branchCheckout({
                    branchId: mainBranchId
                }).promisify();
            }, mainBranchId);

            // Wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('merge red branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            await page.evaluate(async ([mainBranchId, redBranchId]) => {
                // Create merge
                let merge = await window.editor.api.globals.rest.merge.mergeCreate({
                    srcBranchId: redBranchId,
                    dstBranchId: mainBranchId,
                    srcBranchClose: true
                }).promisify();

                // Get details of the merge
                merge = await window.editor.api.globals.rest.merge.mergeGet({
                    mergeId: merge.id
                }).promisify();

                // Check for conflicts
                if (merge.conflicts?.length) {
                    // Resolve conflicts
                    await window.editor.api.globals.rest.conflicts.conflictsResolve({
                        mergeId: merge.id,
                        conflictIds: merge.conflicts.flatMap(group => group.data.map(conflict => conflict.id)),
                        useSrc: true
                    }).promisify();

                    // Apply conflicts
                    await window.editor.api.globals.rest.merge.mergeApply({
                        mergeId: merge.id,
                        finalize: false
                    }).promisify();
                }

                // Create diff
                await window.editor.api.globals.rest.diff.diffCreate({
                    srcBranchId: redBranchId,
                    dstBranchId: mainBranchId
                }).promisify();

                // Apply merge
                await window.editor.api.globals.rest.merge.mergeApply({
                    mergeId: merge.id,
                    finalize: true
                }).promisify();
            }, [mainBranchId, redBranchId]);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('merge green branch', async () => {
        const res = await visitEditor(page, projectId, async () => {
            await page.evaluate(async ([mainBranchId, greenBranchId]) => {
                // Create merge
                let merge = await window.editor.api.globals.rest.merge.mergeCreate({
                    srcBranchId: greenBranchId,
                    dstBranchId: mainBranchId,
                    srcBranchClose: true
                }).promisify();

                // Get details of the merge
                merge = await window.editor.api.globals.rest.merge.mergeGet({
                    mergeId: merge.id
                }).promisify();

                // Check for conflicts
                if (merge.conflicts?.length) {
                    // Resolve conflicts
                    await window.editor.api.globals.rest.conflicts.conflictsResolve({
                        mergeId: merge.id,
                        conflictIds: merge.conflicts.flatMap(group => group.data.map(conflict => conflict.id)),
                        useSrc: true
                    }).promisify();

                    // Apply conflicts
                    await window.editor.api.globals.rest.merge.mergeApply({
                        mergeId: merge.id,
                        finalize: false
                    }).promisify();
                }

                // Create diff
                await window.editor.api.globals.rest.diff.diffCreate({
                    srcBranchId: greenBranchId,
                    dstBranchId: mainBranchId
                }).promisify();

                // Apply merge
                await window.editor.api.globals.rest.merge.mergeApply({
                    mergeId: merge.id,
                    finalize: true
                }).promisify();
            }, [mainBranchId, greenBranchId]);
        });
        expect(res.errors).toStrictEqual([]);
        expect(res.sceneId).toBeDefined();
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});
