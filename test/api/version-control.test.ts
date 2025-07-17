import { type Observer } from '@playcanvas/observer';
import { expect, test, type Page } from '@playwright/test';

import { capture } from '../../lib/capture';
import {
    createProject,
    deleteProject
} from '../../lib/common';
import { editorBlankUrl, editorUrl } from '../../lib/config';
import { middleware } from '../../lib/middleware';
import { uniqueName, wait } from '../../lib/utils';

test.describe.configure({
    mode: 'serial'
});

test.describe('branch/checkpoint/diff/merge', () => {
    const projectName = uniqueName('api-vc');
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

        // create a temporary project
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Accept All Cookies' }).click();
        projectId = await createProject(page, projectName);
    });

    test.afterAll(async () => {
        // delete temporary project
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await deleteProject(page, projectId);

        await page.close();
    });

    test('create base checkpoint', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            [materialId, mainBranchId, mainCheckpointId] = await page.evaluate(async () => {
                // setup material
                const material = await window.editor.api.globals.assets.createMaterial({ name: 'TEST_MATERIAL' });

                // create checkpoint
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
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            redBranchId = await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                // create red branch
                const branch = await window.editor.api.globals.rest.branches.branchCreate({
                    name: 'red',
                    projectId: window.editor.api.globals.projectId,
                    sourceBranchId: mainBranchId,
                    sourceCheckpointId: mainCheckpointId
                }).promisify();

                return branch.id;
            }, [mainBranchId, mainCheckpointId]);

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');

            await page.evaluate(async (materialId) => {
                // set material color RED
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [1, 0, 0]);

                // create checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'RED'
                }).promisify();
            }, materialId);
        })).toStrictEqual([]);
    });

    test('create green branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            greenBranchId = await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                // create green branch
                const branch = await window.editor.api.globals.rest.branches.branchCreate({
                    name: 'green',
                    projectId: window.editor.api.globals.projectId,
                    sourceBranchId: mainBranchId,
                    sourceCheckpointId: mainCheckpointId
                }).promisify();

                return branch.id;
            }, [mainBranchId, mainCheckpointId]);

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');

            await page.evaluate(async (materialId) => {
                // set material color GREEN
                const material = await window.editor.api.globals.assets.findOne((asset: Observer) => asset.get('id') === materialId);
                material.set('data.diffuse', [0, 1, 0]);

                // create checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointCreate({
                    projectId: window.editor.api.globals.projectId,
                    branchId: window.editor.api.globals.branchId,
                    description: 'GREEN'
                }).promisify();
            }, materialId);
        })).toStrictEqual([]);
    });

    test('switch to main branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            // switch to main branch
            await page.evaluate(async (mainBranchId) => {
                await window.editor.api.globals.rest.branches.branchCheckout({
                    branchId: mainBranchId
                }).promisify();
            }, mainBranchId);

            // wait for page to reload
            await wait(5000);
            await page.waitForLoadState('networkidle');
        })).toStrictEqual([]);
    });

    test('merge red branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async ([mainBranchId, redBranchId]) => {
                // create merge
                let merge = await window.editor.api.globals.rest.merge.mergeCreate({
                    srcBranchId: redBranchId,
                    dstBranchId: mainBranchId,
                    srcBranchClose: true
                }).promisify();

                // get details of the merge
                merge = await window.editor.api.globals.rest.merge.mergeGet({
                    mergeId: merge.id
                }).promisify();

                // check for conflicts
                if (merge.conflicts?.length) {
                    // resolve conflicts
                    await window.editor.api.globals.rest.conflicts.conflictsResolve({
                        mergeId: merge.id,
                        conflictIds: merge.conflicts.flatMap(group => group.data.map(conflict => conflict.id)),
                        useSrc: true
                    }).promisify();

                    // apply conflicts
                    await window.editor.api.globals.rest.merge.mergeApply({
                        mergeId: merge.id,
                        finalize: false
                    }).promisify();
                }

                // create diff
                await window.editor.api.globals.rest.diff.diffCreate({
                    srcBranchId: redBranchId,
                    dstBranchId: mainBranchId
                }).promisify();

                // apply merge
                await window.editor.api.globals.rest.merge.mergeApply({
                    mergeId: merge.id,
                    finalize: true
                }).promisify();
            }, [mainBranchId, redBranchId]);
        })).toStrictEqual([]);
    });

    test('merge green branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async ([mainBranchId, greenBranchId]) => {
                // create merge
                let merge = await window.editor.api.globals.rest.merge.mergeCreate({
                    srcBranchId: greenBranchId,
                    dstBranchId: mainBranchId,
                    srcBranchClose: false
                }).promisify();

                // get details of the merge
                merge = await window.editor.api.globals.rest.merge.mergeGet({
                    mergeId: merge.id
                }).promisify();

                // check for conflicts
                if (merge.conflicts?.length) {
                    // resolve conflicts
                    await window.editor.api.globals.rest.conflicts.conflictsResolve({
                        mergeId: merge.id,
                        conflictIds: merge.conflicts.flatMap(group => group.data.map(conflict => conflict.id)),
                        useSrc: true
                    }).promisify();

                    // apply conflicts
                    await window.editor.api.globals.rest.merge.mergeApply({
                        mergeId: merge.id,
                        finalize: false
                    }).promisify();
                }

                // create diff
                await window.editor.api.globals.rest.diff.diffCreate({
                    srcBranchId: greenBranchId,
                    dstBranchId: mainBranchId
                }).promisify();

                // apply merge
                await window.editor.api.globals.rest.merge.mergeApply({
                    mergeId: merge.id,
                    finalize: true
                }).promisify();
            }, [mainBranchId, greenBranchId]);
        })).toStrictEqual([]);
    });

    test('restore checkpoint', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                // restore checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointRestore({
                    branchId: mainBranchId,
                    checkpointId: mainCheckpointId
                }).promisify();
            }, [mainBranchId, mainCheckpointId]);
        })).toStrictEqual([]);
    });

    test('hard reset checkpoint', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async ([mainBranchId, mainCheckpointId]) => {
                // hard reset checkpoint
                await window.editor.api.globals.rest.checkpoints.checkpointHardReset({
                    branchId: mainBranchId,
                    checkpointId: mainCheckpointId
                }).promisify();
            }, [mainBranchId, mainCheckpointId]);
        })).toStrictEqual([]);
    });

    test('delete red branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async (redBranchId) => {
                // delete red branch
                await window.editor.api.globals.rest.branches.branchDelete({
                    branchId: redBranchId
                }).promisify();
            }, redBranchId);
        })).toStrictEqual([]);
    });

    test('delete green branch', async () => {
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });

            await page.evaluate(async (greenBranchId) => {
                // delete green branch
                await window.editor.api.globals.rest.branches.branchDelete({
                    branchId: greenBranchId
                }).promisify();
            }, greenBranchId);
        })).toStrictEqual([]);
    });
});
