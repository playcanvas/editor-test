import { type Page } from '@playwright/test';

import { poll, wait } from './utils';
import { WebInterface } from './web-interface';

/**
 * Inject the web interface into the page.
 *
 * @param page - The page to inject the interface into.
 */
export const injectInterface = async (page: Page) => {
    await page.evaluate(`window.wi = new (${WebInterface.toString()})()`);
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
    await injectInterface(page);

    const create = await page.evaluate(
        ({ name, id }) => window.wi.createProject(window.config.self.username, name, id),
        {
            name: projectName,
            id: masterProjectId
        }
    );
    if (create.error) {
        throw new Error(`Create error: ${create.error}`);
    }
    if (!masterProjectId && create.id) {
        // FIXME: project creation should be complete after response returned by need to wait
        // for route to be generated
        await wait(3000);

        // return project id
        return create.id;
    }

    // FIXME: Poll job completion
    const job = await pollJob(page, create.id);

    // return project id
    return job.data?.forked_id ?? 0;
};

/**
 * Delete a project.
 *
 * @param page - The page.
 * @param projectId - The project id.
 * @returns The errors.
 */
export const deleteProject = async (page: Page, projectId: number) => {
    await injectInterface(page);

    const success = await page.evaluate(id => window.wi.deleteProject(id), projectId);
    if (!success) {
        throw new Error('Failed to delete project');
    }
};

/**
 * Delete all projects.
 *
 * @param page - The page.
 */
export const deleteAllProjects = async (page: Page) => {
    await injectInterface(page);

    const projects = await page.evaluate(() => window.wi.getProjects(window.config.self.id));

    let deletePromise = Promise.resolve();
    for (const project of projects) {
        deletePromise = deletePromise.then(async () => {
            const success = await page.evaluate(id => window.wi.deleteProject(id), project.id);
            if (!success) {
                throw new Error('Failed to delete project');
            }
        });
    }

    await deletePromise;
};

/**
 * Import a project.
 *
 * @param page - The page.
 * @param importPath - The path to the import file.
 * @returns The data result.
 */
export const importProject = async (page: Page, importPath: string) => {
    await injectInterface(page);

    // start import
    const fileChooserPromise = page.waitForEvent('filechooser');
    const importProjectPromise = page.evaluate(() => window.wi.startImport(window.config.self.id));
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(importPath);
    const importProject = await importProjectPromise;
    if (importProject.error) {
        throw new Error(`Import error: ${importProject.error}`);
    }

    // FIXME: Poll job completion
    const job = await pollJob(page, importProject.id);

    // return project id
    return job.data?.project_id ?? 0;
};

/**
 * Download project app.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const downloadApp = async (page: Page, sceneId: number): Promise<{ download_url: string }> => {
    const job = await page.evaluate(async (sceneId) => {
        // order scenes so that the scene with the given id is first
        const { result: scenes = [] } = await window.editor.api.globals.rest.projects.projectScenes().promisify() as any;
        if (!scenes.length) {
            throw new Error('Scenes not found');
        }
        const sceneIds = scenes.reduce((ids: number[], scene: any) => {
            if (scene.id !== sceneId) {
                ids.unshift(scene.id);
            } else  {
                ids.push(scene.id);
            }
            return ids;
        }, []);

        // start download
        const job: any = await window.editor.api.globals.rest.apps.appDownload({
            name: 'TEST',
            project_id: window.config.project.id,
            branch_id: window.config.self.branch.id,
            scenes: sceneIds,
            engine_version: window.config.engineVersions.current.version
        }).promisify();

        // wait for job to complete
        return await new Promise<any>((resolve) => {
            const handle = window.editor.api.globals.messenger.on('message', async (name: string, data: any) => {
                if (name === 'job.update' && data.job.id === job.id) {
                    handle.unbind();
                    resolve(await window.editor.api.globals.rest.jobs.jobGet({ jobId: data.job.id }).promisify());
                }
            });
        });
    }, sceneId);
    if (job.error) {
        throw new Error(`Download error: ${job.error}`);
    }
    return {
        download_url: job.data.download_url
    };
};

/**
 * Publish a project app.
 *
 * @param page - The page.
 * @param sceneId - The scene id.
 * @returns The errors.
 */
export const publishApp = async (page: Page, sceneId: number): Promise<{ id: number; url: string }> => {
    const app: any = await page.evaluate(async (sceneId) => {
        // order scenes so that the scene with the given id is first
        const { result: scenes = [] } = await window.editor.api.globals.rest.projects.projectScenes().promisify() as any;
        if (!scenes.length) {
            throw new Error('Scenes not found');
        }
        const sceneIds = scenes.reduce((ids: number[], scene: any) => {
            if (scene.id !== sceneId) {
                ids.unshift(scene.id);
            } else  {
                ids.push(scene.id);
            }
            return ids;
        }, []);

        // start publish
        const app: any = await window.editor.api.globals.rest.apps.appCreate({
            name: 'TEST',
            project_id: window.config.project.id,
            branch_id: window.config.self.branch.id,
            scenes: sceneIds,
            engine_version: window.config.engineVersions.current.version
        }).promisify();

        // wait for app to complete
        return await new Promise<any>((resolve) => {
            const handle = window.editor.api.globals.messenger.on('message', async (name: string, data: any) => {
                if (name === 'app.update' && data.app.id === app.id) {
                    handle.unbind();
                    resolve(await window.editor.api.globals.rest.apps.appGet(data.app.id).promisify());
                }
            });
        });
    }, sceneId);
    if (app.task.error) {
        throw new Error(`Publish error: ${app.task.error}`);
    }
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

    const job = await page.evaluate((appId) => {
        const app = window.editor.api.globals.rest.apps.appDelete(appId).promisify() as any;
        return app.task ?? { error: 'Job not found' };
    }, appId);
    if (job.error) {
        throw new Error(`Delete error: ${job.error}`);
    }
};
