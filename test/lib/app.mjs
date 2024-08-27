import { capture } from './capture.mjs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.outPath - The output path.
 * @param {string} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const app = ({ page, outPath, sceneId }) => {
    return capture({
        page,
        outPath,
        fn: async () => {
            const appUrl = await page.evaluate(async () => {
                const res = await fetch(`/api/projects/${config.project.id}/apps?limit=0`, {
                    headers: {
                        Authorization: `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const json = await res.json();
                return json.result[0]?.url ?? '';
            }, sceneId);
            if (!appUrl) {
                throw new Error('[FETCH ERROR] App URL not found');
            }

            await page.goto(appUrl, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${outPath}.png` });
        }
    });
};
