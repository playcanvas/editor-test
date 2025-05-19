import { type Page } from '@playwright/test';

import { capture } from './capture';
import { editorBlankUrl } from './config';
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
 * Find a setting by name.
 *
 * @param page - The page to search in.
 * @param name - The name of the setting to find.
 * @returns - The div containing the setting.
 */
export const getSetting = (page: Page, name: string) => {
    return page.locator('div').filter({ hasText: new RegExp(`^${name}$`) }).locator('div');
};

/**
 * Polls for a job to complete.
 *
 * @param page - The page to poll.
 * @param jobId - The job id to poll.
 * @returns The job result.
 */
export const pollJob = async (page: Page, jobId: number) => {
    const job = await poll(async () => {
        const job = await page.evaluate(jobId => window.wi.checkJob(jobId), jobId);
        if (job.status !== 'running') {
            return job;
        }
    });
    if (job.error) {
        throw new Error(`Job error: ${job.error}`);
    } else if (job.status !== 'complete') {
        throw new Error(`Job status: ${job.status}`);
    }
    return job;
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
    const errors = await capture('create-project', page, async () => {
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await injectInterface(page);

        const create = await page.evaluate(({ name, id }) => window.wi.createProject(name, id), {
            name: projectName,
            id: masterProjectId
        });
        if (create.error) {
            throw new Error(`Create error: ${create.error}`);
        }
        if (!masterProjectId && create.id) {
            // FIXME: project creation should be complete after response returned by need to wait
            // for route to be generated
            await wait(3000);

            projectId = create.id;
            return;
        }

        // FIXME: Poll job completion
        const job = await pollJob(page, create.id);

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
    const errors = await capture('delete-project', page, async () => {
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        await injectInterface(page);

        const success = await page.evaluate(id => window.wi.deleteProject(id), projectId);
        if (!success) {
            throw new Error('Failed to delete project');
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

        // Start import
        const fileChooserPromise = page.waitForEvent('filechooser');
        const importProjectPromise = page.evaluate(() => window.wi.startImport());
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(importPath);
        const importProject = await importProjectPromise;
        if (importProject.error) {
            throw new Error(`Import error: ${importProject.error}`);
        }

        // FIXME: Poll job completion
        const job = await pollJob(page, importProject.id);

        projectId = job.data?.project_id ?? 0;
    });
    return { errors, projectId };
};

const collectSceneIds = async (page: Page, sceneId: number): Promise<number[]> => {
    const scenes = await page.evaluate(() => window.wi.getScenes());
    if (!scenes.length) {
        throw new Error('Scenes not found');
    }
    return scenes
    .map((scene: any) => scene.id)
    .sort((a: number, b: number) => {
        if (a === sceneId) return -1;
        if (b === sceneId) return 1;
        return 0;
    });
};

/**
 * Download project app.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const downloadApp = async (page: Page, sceneId: number) => {
    await injectInterface(page);

    // Collect scene ids
    const sceneIds = await collectSceneIds(page, sceneId);

    // Start download
    const download = await page.evaluate(sceneIds => window.wi.startDownload(sceneIds), sceneIds);
    if (download.error) {
        throw new Error(`Download error: ${download.error}`);
    }

    // FIXME: Poll job completion
    await pollJob(page, download.id);
};

/**
 * Publish a project app.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const publishApp = async (page: Page, sceneId: number): Promise<{ id: number, url: string }> => {
    await injectInterface(page);

    // Collect scene ids
    const sceneIds = await collectSceneIds(page, sceneId);

    // Start publish
    const app = await page.evaluate(sceneIds => window.wi.startPublish(sceneIds), sceneIds);
    if (app.task.error) {
        throw new Error(`Publish error: ${app.task.error}`);
    }

    // Poll publish job
    const job = await poll(async () => {
        const apps = await page.evaluate(() => window.wi.getApps());
        const job = apps.find((_app: any) => _app.id === app.id)?.task ?? { error: 'Job not found' };
        if (job.status !== 'running') {
            return job;
        }
    });
    if (job.error) {
        throw new Error(`Job error: ${job.error}`);
    } else if (job.status !== 'complete') {
        throw new Error(`Job status: ${job.status}`);
    }

    // Return app data
    return {
        id: app.id,
        url: app.url
    };
};

/**
 * Delete an app.
 *
 * @param page - The page.
 * @param appId - The app id.
 */
export const deleteApp = async (page: Page, appId: number) => {
    await injectInterface(page);

    const delJob = await page.evaluate(appId => window.wi.deleteApp(appId), appId);
    if (delJob.error) {
        throw new Error(`Delete error: ${delJob.error}`);
    }
};
