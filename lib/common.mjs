import { capture } from './capture.mjs';
import { editorProjectUrl, editorSceneUrl, homeProjectUrl, HOST, launchSceneUrl } from './url.mjs';
import { poll } from './utils.mjs';
import { initInterface } from './web-interface.mjs';

/**
 * @param {import('@playwright/test').Page} page - The page to search in.
 * @param {string} name - The name of the setting to find.
 * @returns {import('@playwright/test').Locator} - The div containing the setting.
 */
export const getSetting = (page, name) => {
    return page.locator('div').filter({ hasText: new RegExp(`^${name}$`) }).locator('div');
};

/**
 * Get the project id from the page URL.
 *
 * @param {import('@playwright/test').Page} page - The page to search in.
 * @returns {string} - The project id.
 */
export const getProjectId = (page) => {
    return /project\/(\d+)/.exec(page.url())[1];
};

/**
 * Get the scene id from the page URL.
 *
 * @param {import('@playwright/test').Page} page - The page to search in.
 * @returns {string} - The scene id.
 */
export const getSceneId = (page) => {
    return /scene\/(\d+)/.exec(page.url())[1];
};

/**
 * Create a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} projectName - The project name.
 * @returns {Promise<string[]>} The errors.
 */
export const createProject = async (page, outPath, projectName) => {
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(`https://${HOST}`);

            await page.getByText('NEW', { exact: true }).click();
            await page.getByPlaceholder('Enter project name (max 32').fill(projectName);
            await page.getByText('Accept All Cookies', { exact: true }).click();
            await page.getByRole('button', { name: 'CREATE' }).click();
            await page.waitForURL('**/project/**');
        }
    });
    return errors;
};

/**
 * Import a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} importPath - The path to the import file.
 * @returns {Promise<string[]>} The errors.
 */
export const importProject = async (page, outPath, importPath) => {
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(`https://${HOST}`);

            const fileChooserPromise = page.waitForEvent('filechooser');
            await page.getByText('Import Project', { exact: true }).click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(importPath);
            await page.waitForURL('**/project/**');
        }
    });
    return errors;
};

/**
 * Fork a project.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} projectId - The project id.
 * @param {string} projectName - The project name.
 * @returns {Promise<string[]>} The errors.
 */
export const forkProject = async (page, outPath, projectId, projectName) => {
    const homeUrl = homeProjectUrl(projectId);
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(homeUrl, { waitUntil: 'networkidle' });
            await page.waitForURL('**/project/**');

            await page.getByText(' Fork').first().click();
            await page.getByPlaceholder('Project Name').fill(`${projectName} FORK`);
            await page.getByRole('button', { name: 'FORK' }).click();
            await page.waitForURL('**/project/**/overview/**-fork');

            await page.getByRole('link', { name: ' SETTINGS' }).click();
            await page.getByRole('button', { name: 'DELETE' }).click();
            await page.getByPlaceholder('type here').fill(`${projectName} FORK`);
            await page.locator('input[type="submit"]').click();
            await page.waitForURL('**/user/**');
        }
    });
    return errors;
};

/**
 * Visit the editor.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} projectId - The project id.
 * @param {(projectUrl: string) => void} callback - The callback
 * @returns {Promise<string[]>} The errors.
 */
export const visitEditor = async (page, outPath, projectId, callback = () => {}) => {
    const projectUrl = editorProjectUrl(projectId);
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(projectUrl, { waitUntil: 'networkidle' });
            await page.waitForURL('**/scene/**');
            await page.screenshot({ path: `${outPath}/editor.png` });
            await callback(projectUrl);
        }
    });
    return errors;
};

/**
 * Visit the editor scene.
 *
 * @param {import('@playwright/test').Page} page - The page.
 * @param {string} outPath - The path to the project.
 * @param {string} sceneId - The scene id.
 * @param {(sceneUrl: string) => void} callback - The callback.
 * @returns {Promise<string[]>} The errors.
 */
export const visitEditorScene = async (page, outPath, sceneId, callback = () => {}) => {
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
 * @param {string} sceneId - The scene id.
 * @param {(sceneLaunchUrl: string) => void} callback - The callback.
 * @returns {Promise<string[]>} The errors.
 */
export const visitLauncher = async (page, outPath, sceneId, callback = () => {}) => {
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
 * @param {string} sceneId - The scene id.
 * @returns {Promise<string[]>} The errors.
 */
export const downloadProject = async (page, outPath, sceneId) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

            const scenes = await page.evaluate(() => wi.getScenes());
            if (!scenes.length) {
                errors.push('[FETCH ERROR] Scenes not found');
                return;
            }
            const sceneIds = scenes
            .map(scene => scene.id)
            .sort((a, b) => {
                if (a === sceneId) return -1;
                if (b === sceneId) return 1;
                return 0;
            });

            const download = await page.evaluate(sceneIds => wi.postDownload(sceneIds), sceneIds);
            if (download.error) {
                errors.push(`[JOB ERROR] ${download.error}`);
                return;
            }

            const job = await poll(async () => {
                const job = await page.evaluate(downloadId => wi.checkDownload(downloadId), download.id);
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
 * @param {string} sceneId - The scene id.
 * @returns {Promise<string[]>} The errors.
 */
export const publishProject = async (page, outPath, sceneId) => {
    const sceneUrl = editorSceneUrl(sceneId);
    const errors = await capture({
        page,
        outPath,
        callback: async (errors) => {
            await page.goto(sceneUrl, { waitUntil: 'networkidle' });
            await page.evaluate(initInterface);

            const scenes = await page.evaluate(() => wi.getScenes());
            if (!scenes.length) {
                errors.push('[FETCH ERROR] Scenes not found');
                return;
            }
            const sceneIds = scenes
            .map(scene => scene.id)
            .sort((a, b) => {
                if (a === sceneId) return -1;
                if (b === sceneId) return 1;
                return 0;
            });

            const app = await page.evaluate(sceneIds => wi.postPublish(sceneIds), sceneIds);
            if (app.task.error) {
                errors.push(`[JOB ERROR] ${app.task.error}`);
                return;
            }

            const pubJob = await poll(async () => {
                const job = await page.evaluate(appId => wi.checkPublish(appId), app.id);
                if (job.status !== 'running') {
                    return job;
                }
            });

            if (pubJob.error) {
                errors.push(`[JOB ERROR] ${pubJob.error}`);
            } else if (pubJob.status !== 'complete') {
                errors.push(`[JOB STATUS] ${pubJob.status}`);
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
            const delJob = await page.evaluate(appId => wi.deleteApp(appId), app.id);
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
 * @param {string} projectId - The project id.
 * @param {string} projectName - The project name.
 * @returns {Promise<string[]>} The errors.
 */
export const deleteProject = async (page, outPath, projectId, projectName) => {
    const errors = await capture({
        page,
        outPath,
        callback: async () => {
            await page.goto(`https://${HOST}/project/${projectId}`, { waitUntil: 'networkidle' });
            await page.getByRole('link', { name: ' SETTINGS' }).click();
            await page.getByRole('button', { name: 'DELETE' }).click();
            await page.getByPlaceholder('type here').fill(projectName);
            await page.locator('input[type="submit"]').click();
        }
    });
    return errors;
};
