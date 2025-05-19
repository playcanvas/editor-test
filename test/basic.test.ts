import { expect, test, type Page } from '@playwright/test';

import { capture } from '../lib/capture';
import {
    createProject,
    deleteApp,
    deleteProject,
    downloadApp,
    publishApp
} from '../lib/common';
import { codeEditorUrl, editorSceneUrl, editorUrl, launchSceneUrl } from '../lib/config';
import { middleware } from '../lib/middleware';

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
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });
            sceneId = parseInt(await page.evaluate(() => window.config.scene.id), 10);
        })).toStrictEqual([]);
    });

    test('goto code editor', async () => {
        expect(await capture('code-editor', page, async () => {
            await page.goto(codeEditorUrl(projectId), { waitUntil: 'networkidle' });
        })).toStrictEqual([]);
    });

    test('goto launcher', async () => {
        expect(await capture('launcher', page, async () => {
            await page.goto(launchSceneUrl(sceneId), { waitUntil: 'networkidle' });
        })).toStrictEqual([]);
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
        expect(await capture('editor', page, async () => {
            await page.goto(editorUrl(projectId), { waitUntil: 'networkidle' });
            sceneId = parseInt(await page.evaluate(() => window.config.scene.id), 10);
        })).toStrictEqual([]);
    });

    test('download app', async () => {
        expect(await capture('download-project', page, async () => {
            // download app
            await page.goto(editorSceneUrl(sceneId), { waitUntil: 'networkidle' });
            await downloadApp(page, sceneId);
        })).toStrictEqual([]);
    });

    test('publish app', async () => {
        expect(await capture('publish-project', page, async () => {
            // publish app
            await page.goto(editorSceneUrl(sceneId), { waitUntil: 'networkidle' });
            const app = await publishApp(page, sceneId);

            // launch app
            await page.goto(app.url, { waitUntil: 'networkidle' });

            // delete app
            await page.goto(editorSceneUrl(sceneId), { waitUntil: 'networkidle' });
            await deleteApp(page, app.id);
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await deleteProject(page, projectId)).toStrictEqual([]);
    });
});
