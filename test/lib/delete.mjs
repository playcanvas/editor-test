import { capture } from './capture.mjs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.outPath - The output path.
 * @param {string} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const delete_ = ({ page, outPath, sceneId }) => {
    return capture({
        page,
        outPath,
        fn: async (errors) => {
            const job = await page.evaluate(async () => {
                const getAppId = async () => {
                    const res = await fetch(`/api/projects/${config.project.id}/apps?limit=0`, {
                        headers: {
                            Authorization: `Bearer ${config.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const json = await res.json();
                    return json.result[0]?.id ?? '';
                };

                const deleteApp = async (appId) => {
                    const res = await fetch(`/api/apps/${appId}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: `Bearer ${config.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const json = await res.json();
                    return json.task ?? { error: 'Job not found' };
                };

                const appId = await getAppId();
                if (!appId) {
                    throw new Error('[FETCH ERROR] App ID not found');
                }

                return await deleteApp(appId);
            });
            if (job.error) {
                errors.push(`[JOB ERROR] ${job.error}`);
            } else if (job.status !== 'complete') {
                errors.push(`[JOB STATUS] ${job.status}`);
            }
        }
    });
};
