import fs from 'fs';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.outPath - The output path.
 * @param {string} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const delete_ = async ({ page, outPath, sceneId }) => {
    const errors = [];

    await fs.promises.writeFile(`${outPath}.console.log`, '');
    await fs.promises.writeFile(`${outPath}.request.log`, '');

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    });
    page.on('pageerror', (msg) => {
        errors.push(msg);
        const msgStr = `[pageerror] ${msg}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    });
    page.on('response', (response) => {
        const msgStr = `[${response.status()}] ${response.url()}`;
        fs.promises.appendFile(`${outPath}.request.log`, `${msgStr}\n`);
    });

    try {
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
    } catch (error) {
        errors.push(error.message);
    }

    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');

    return errors;
};
