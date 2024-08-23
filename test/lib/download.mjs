import fs from 'fs';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.host - The PlayCanvas host.
 * @param {string} options.outPath - The output path.
 * @param {string} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const download = async ({ page, host, outPath, sceneId }) => {
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

    const job = await page.evaluate(async (HOST, sceneId) => {
        const getSceneIds = async () => {
            const res = await fetch(`https://${HOST}/api/projects/${config.project.id}/scenes`, {
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const json = await res.json();
            return json.result?.map(scene => scene.id) ?? [];
        };

        const postDownload = async (sceneIds) => {
            const res = await fetch(`https://${HOST}/api/apps/download`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: 'TEST',
                    project_id: config.project.id,
                    branch_id: config.self.branch.id,
                    scenes: sceneIds,
                    scripts_concatenate: false,
                    scripts_minify: false,
                    scripts_sourcemaps: false,
                    optimize_scene_format: false,
                    web_lens: false,
                    engine_version: config.engineVersions.current.version
                })
            });
            return await res.json();
        };

        const checkJob = async (jobId) => {
            const res = await fetch(`https://${HOST}/api/jobs/${jobId}`, {
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            return await res.json();
        };

        const sceneIds = await getSceneIds();
        sceneIds.sort((a, b) => {
            if (a === sceneId) return -1;
            if (b === sceneId) return 1;
            return 0;
        });

        const download = await postDownload(sceneIds);
        if (download.error) {
            return download;
        }

        return await new Promise((resolve, reject) => {
            const int = setInterval(async () => {
                try {
                    const job = await checkJob(download.id);
                    if (job.status !== 'running') {
                        clearInterval(int);
                        resolve(job);
                    }
                } catch (e) {
                    clearInterval(int);
                    reject(e);
                }
            }, 500);
        });
    }, host, sceneId);
    if (job.error) {
        errors.push(`[JOB ERROR] ${job.error}`);
    }
    if (job.status !== 'complete') {
        errors.push(`[JOB STATUS] ${job.status}`);
    }

    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');

    return errors;
};
