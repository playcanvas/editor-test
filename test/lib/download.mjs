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
export const download = ({ page, url, outPath, sceneId }) => {
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

            const download = await page.evaluate(sceneIds => test.postDownload(sceneIds), sceneIds);
            if (download.error) {
                errors.push(`[JOB ERROR] ${download.error}`);
                return;
            }

            const job = await poll(async () => {
                const job = await page.evaluate(downloadId => test.checkDownload(downloadId), download.id);
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
};
