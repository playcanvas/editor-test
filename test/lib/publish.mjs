import { capture } from './capture.mjs';
import { poll } from './utils.mjs';
import { initContext } from '../fixtures/test-context.mjs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.url - The URL to navigate to.
 * @param {string} options.outPath - The output path.
 * @param {number} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const publish = ({ page, url, outPath, sceneId }) => {
    return capture({
        page,
        outPath,
        fn: async (errors) => {
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.evaluate(initContext);

            const scenes = await page.evaluate(() => test.getScenes());
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

            const app = await page.evaluate(sceneIds => test.postPublish(sceneIds), sceneIds);
            if (app.task.error) {
                errors.push(`[JOB ERROR] ${app.task.error}`);
                return;
            }

            const pubJob = await poll(async () => {
                const job = await page.evaluate(appId => test.checkPublish(appId), app.id);
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
            await page.screenshot({ path: `${outPath}.png` });

            // delete app
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.evaluate(initContext);
            const delJob = await page.evaluate(appId => test.deleteApp(appId), app.id);
            if (delJob.error) {
                errors.push(`[JOB ERROR] ${delJob.error}`);
            } else if (delJob.status !== 'complete') {
                errors.push(`[JOB STATUS] ${delJob.status}`);
            }
        }
    });
};
