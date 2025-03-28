import { type Page } from '@playwright/test';

import { capture } from './capture';
import { editorProjectUrl, editorSceneUrl, HOST, launchSceneUrl } from './url';
import { poll, wait } from './utils';
import { initInterface } from './web-interface';

/**
 * @param {import('@playwright/test').Page} page - The page to search in.
 * @param {string} name - The name of the setting to find.
 * @returns {import('@playwright/test').Locator} - The div containing the setting.
 */
export const getSetting = (page: Page, name: string) => {
    return page.locator('div').filter({ hasText: new RegExp(`^${name}$`) }).locator('div');
};

/**
 * Create a project. If masterProjectId is provided, the project will be forked from the master project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} projectName - The project name.
 * @param {number} [masterProjectId] - The master project id.
 * @returns {Promise<{ errors: string[], projectId: number }>} The data result.
 */
export const createProject = async (page: Page, outPath: string, projectName: string, masterProjectId?: number) => {
    let projectId = 0;
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

            const create = await page.evaluate(([name, id]) => window.wi.createProject(name, id), [projectName, masterProjectId]);
            if (create.error) {
                errors.push(`[CREATE PROJECT ERROR] ${create.error}`);
                return;
            }
            if (!masterProjectId && create.id) {
                // wait 1 second for the project to be created
                await wait(1000);

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
        }
    });
    return { errors, projectId };
};

/**
 * Import a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} importPath - The path to the import file.
 * @returns {Promise<{ errors: string[], projectId: number }>} The data result.
 */
export const importProject = async (page: Page, outPath: string, importPath: string) => {
    let projectId = 0;
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

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
        }
    });
    return { errors, projectId };
};

/**
 * Visit the editor.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} projectId - The project id.
 * @param {(projectUrl: string) => void} callback - The callback
 * @returns {Promise<{ errors: string[], sceneId: number }>} The data result.
 */
export const visitEditor = async (page: Page, outPath: string, projectId: number, callback: (projectId: string) => void = () => {}) => {
    const projectUrl = editorProjectUrl(projectId);
    let sceneId = 0;
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(projectUrl, { waitUntil: 'networkidle' });
            await page.waitForURL('**/scene/**');
            sceneId = parseInt(/scene\/(\d+)/.exec(page.url())?.[1] ?? '', 10) || 0;
            await page.screenshot({ path: `${outPath}/editor.png` });
            await callback(projectUrl);
        }
    });
    return { errors, sceneId };
};

/**
 * Visit the editor scene.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} sceneId - The scene id.
 * @param {(sceneUrl: string) => void} callback - The callback.
 * @returns {Promise<string[]>} The errors.
 */
export const visitEditorScene = async (page: Page, outPath: string, sceneId: number, callback: (sceneUrl: string) => void = () => {}) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${outPath}/editor.png` });
            await callback(sceneUrl);
        }
    });
    return errors;
};

/**
 * Visit the launcher.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} sceneId - The scene id.
 * @param {(sceneLaunchUrl: string) => void} callback - The callback.
 * @returns {Promise<string[]>} The errors.
 */
export const visitLauncher = async (page: Page, outPath: string, sceneId: number, callback: (sceneLaunchUrl: string) => void = () => {}) => {
    const sceneLaunchUrl = launchSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(sceneLaunchUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${outPath}/launch.png` });
            await callback(sceneLaunchUrl);
        }
    });
    return errors;
};

/**
 * Download a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} sceneId - The scene id.
 * @returns {Promise<string[]>} The errors.
 */
export const downloadProject = async (page: Page, outPath: string, sceneId: number) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

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
        }
    });
    return errors;
};

/**
 * Publish a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} sceneId - The scene id.
 * @returns {Promise<string[]>} The errors.
 */
export const publishProject = async (page: Page, outPath: string, sceneId: number) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

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
            await page.screenshot({ path: `${outPath}/publish.png` });

            // delete app
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);
            const delJob = await page.evaluate(appId => window.wi.deleteApp(appId), app.id);
            if (delJob.error) {
                errors.push(`[JOB ERROR] ${delJob.error}`);
            } else if (delJob.status !== 'complete') {
                errors.push(`[JOB STATUS] ${delJob.status}`);
            }
        }
    });
    return errors;
};

/**
 * Delete a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {number} projectId - The project id.
 * @returns {Promise<string[]>} The errors.
 */
export const deleteProject = async (page: Page, outPath: string, projectId: number) => {
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

            const success = await page.evaluate(id => window.wi.deleteProject(id), projectId);
            if (!success) {
                errors.push(`[DELETE ERROR] ${projectId}`);
            }
        }
    });
    return errors;
};
