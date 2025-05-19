import { type Page } from '@playwright/test';

import { capture } from './capture';
import { editorBlankUrl, editorSceneUrl } from './config';
import { poll, wait } from './utils';
import { WebInterface } from './web-interface';

/**
 * Inject the web interface into the page.
 *
 * @param page - The page to inject the interface into.
 */
export const injectInterface = async (page: Page) => {
    await page.evaluate(`window.wi = new (${WebInterface.toString()})(window.config)`);
};

/**
 * @param page - The page to search in.
 * @param name - The name of the setting to find.
 * @returns - The div containing the setting.
 */
export const getSetting = (page: Page, name: string) => {
    return page.locator('div').filter({ hasText: new RegExp(`^${name}$`) }).locator('div');
};

/**
 * Create a project. If masterProjectId is provided, the project will be forked from the master project.
 *
 * @param page - The page.
 * @param projectName - The project name.
 * @param masterProjectId - The master project id.
 * @returns The data result.
 */
export const createProject = async (page: Page, projectName: string, masterProjectId?: number) => {
    let projectId = 0;
    const errors = await capture('create-project', page, async (errors) => {
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await injectInterface(page);

        const create = await page.evaluate(({ name, id }) => window.wi.createProject(name, id), {
            name: projectName,
            id: masterProjectId
        });
        if (create.error) {
            errors.push(`[CREATE PROJECT ERROR] ${create.error}`);
            return;
        }
        if (!masterProjectId && create.id) {
            // FIXME: project creation should be complete after response returned by need to wait
            // for route to be generated
            await wait(3000);

            projectId = create.id;
            return;
        }
        const job = await poll(async () => {
            const job = await page.evaluate(jobId => window.wi.checkJob(jobId), create.id);
            if (job.status !== 'running') {
                return job;
            }
        });
        if (job.error) {
            errors.push(`[JOB ERROR] ${job.error}`);
        } else if (job.status !== 'complete') {
            errors.push(`[JOB STATUS] ${job.status}`);
        }
        projectId = job.data?.forked_id ?? 0;
    });
    return { errors, projectId };
};

/**
 * Delete a project.
 *
 * @param page - The page.
 * @param projectId - The project id.
 * @returns The errors.
 */
export const deleteProject = async (page: Page, projectId: number) => {
    const errors = await capture('delete-project', page, async (errors) => {
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await injectInterface(page);

        const success = await page.evaluate(id => window.wi.deleteProject(id), projectId);
        if (!success) {
            errors.push(`[DELETE ERROR] ${projectId}`);
        }
    });
    return errors;
};

/**
 * Import a project.
 *
 * @param page - The page.
 * @param importPath - The path to the import file.
 * @returns The data result.
 */
export const importProject = async (page: Page, importPath: string) => {
    let projectId = 0;
    const errors = await capture('import-project', page, async () => {
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await injectInterface(page);

        const fileChooserPromise = page.waitForEvent('filechooser');
        const importProjectPromise = page.evaluate(() => window.wi.startImport());
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(importPath);
        const importProject = await importProjectPromise;
        if (importProject.error) {
            errors.push(`[IMPORT ERROR] ${importProject.error}`);
            return;
        }

        const job = await poll(async () => {
            const job = await page.evaluate(jobId => window.wi.checkJob(jobId), importProject.id);
            if (job.status !== 'running') {
                return job;
            }
        });
        if (job.error) {
            errors.push(`[JOB ERROR] ${job.error}`);
        } else if (job.status !== 'complete') {
            errors.push(`[JOB STATUS] ${job.status}`);
        }
        projectId = job.data?.project_id ?? 0;
    });
    return { errors, projectId };
};

/**
 * Download a project.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const downloadProject = async (page: Page, sceneId: number) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture('download-project', page, async (errors) => {
        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
        await injectInterface(page);

        const scenes = await page.evaluate(() => window.wi.getScenes());
        if (!scenes.length) {
            errors.push('[FETCH ERROR] Scenes not found');
            return;
        }
        const sceneIds = scenes
        .map((scene: any) => scene.id)
        .sort((a: number, b: number) => {
            if (a === sceneId) return -1;
            if (b === sceneId) return 1;
            return 0;
        });

        const download = await page.evaluate(sceneIds => window.wi.startDownload(sceneIds), sceneIds);
        if (download.error) {
            errors.push(`[JOB ERROR] ${download.error}`);
            return;
        }

        const job = await poll(async () => {
            const job = await page.evaluate(jobId => window.wi.checkJob(jobId), download.id);
            if (job.status !== 'running') {
                return job;
            }
        });
        if (job.error) {
            errors.push(`[JOB ERROR] ${job.error}`);
        } else if (job.status !== 'complete') {
            errors.push(`[JOB STATUS] ${job.status}`);
        }
    });
    return errors;
};

/**
 * Publish a project.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const publishProject = async (page: Page, sceneId: number) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture('publish-project', page, async (errors) => {
        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
        await injectInterface(page);

        const scenes = await page.evaluate(() => window.wi.getScenes());
        if (!scenes.length) {
            errors.push('[FETCH ERROR] Scenes not found');
            return;
        }
        const sceneIds = scenes
        .map((scene: any) => scene.id)
        .sort((a: number, b: number) => {
            if (a === sceneId) return -1;
            if (b === sceneId) return 1;
            return 0;
        });

        const app = await page.evaluate(sceneIds => window.wi.startPublish(sceneIds), sceneIds);
        if (app.task.error) {
            errors.push(`[JOB ERROR] ${app.task.error}`);
            return;
        }

        const job = await poll(async () => {
            const apps = await page.evaluate(() => window.wi.getApps());
            const job = apps.find((_app: any) => _app.id === app.id)?.task ?? { error: 'Job not found' };
            if (job.status !== 'running') {
                return job;
            }
        });

        if (job.error) {
            errors.push(`[JOB ERROR] ${job.error}`);
        } else if (job.status !== 'complete') {
            errors.push(`[JOB STATUS] ${job.status}`);
        }
        if (errors.length) {
            return;
        }

        // launch app
        await page.goto(app.url, { waitUntil: 'networkidle' });

        // delete app
        await page.goto(sceneUrl, { waitUntil: 'networkidle' });
        await injectInterface(page);
        const delJob = await page.evaluate(appId => window.wi.deleteApp(appId), app.id);
        if (delJob.error) {
            errors.push(`[JOB ERROR] ${delJob.error}`);
        } else if (delJob.status !== 'complete') {
            errors.push(`[JOB STATUS] ${delJob.status}`);
        }
    });
    return errors;
};
