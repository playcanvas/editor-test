import { expect, test, type Page } from '@playwright/test';

import { capture } from '../../lib/capture';
import {
    createProject,
    deleteApp,
    deleteProject,
    downloadApp,
    publishApp
} from '../../lib/common';
import { codeEditorUrl, editorBlankUrl, editorSceneUrl, editorUrl, launchSceneUrl } from '../../lib/config';
import { middleware } from '../../lib/middleware';

const PROJECT_NAME = 'Blank Project';

test.describe.configure({
    mode: 'serial'
});

test.describe('create/delete', () => {
    let projectId: number;
    let forkedProjectId: number;
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
        expect(await capture('create-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            projectId = await createProject(page, PROJECT_NAME);
        })).toStrictEqual([]);
    });

    test('fork project', async () => {
        expect(await capture('create-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            forkedProjectId = await createProject(page, `${PROJECT_NAME} FORK`, projectId);
        })).toStrictEqual([]);
    });

    test('delete forked project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, forkedProjectId);
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
    });
});

test.describe('navigation', () => {
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
        expect(await capture('create-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            projectId = await createProject(page, PROJECT_NAME);
        })).toStrictEqual([]);
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
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
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
        expect(await capture('create-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            projectId = await createProject(page, PROJECT_NAME);
        })).toStrictEqual([]);
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
            const job = await downloadApp(page, sceneId);

            // check download URL
            expect(job.download_url).toBeDefined();
        })).toStrictEqual([]);
    });

    test('publish app', async () => {
        expect(await capture('publish-project', page, async () => {
            // publish app
            const app = await publishApp(page, sceneId);

            // launch app
            await page.goto(app.url, { waitUntil: 'networkidle' });

            // delete app
            await page.goto(editorSceneUrl(sceneId), { waitUntil: 'networkidle' });
            await deleteApp(page, app.id);
        })).toStrictEqual([]);
    });

    test('delete project', async () => {
        expect(await capture('delete-project', page, async () => {
            await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
            await deleteProject(page, projectId);
        })).toStrictEqual([]);
    });
});
