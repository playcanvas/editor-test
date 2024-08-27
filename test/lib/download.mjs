import { capture } from './capture.mjs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.outPath - The output path.
 * @param {string} options.sceneId - The scene ID.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const download = ({ page, outPath, sceneId }) => {
    return capture({
        page,
        outPath,
        fn: async (errors) => {
            const job = await page.evaluate(async (sceneId) => {
                const getSceneIds = async () => {
                    const res = await fetch(`/api/projects/${config.project.id}/scenes`, {
                        headers: {
                            Authorization: `Bearer ${config.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const json = await res.json();
                    return json.result?.map(scene => scene.id) ?? [];
                };

                const postDownload = async (sceneIds) => {
                    const res = await fetch('/api/apps/download', {
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
                            engine_version: config.engineVersions.current.version
                        })
                    });
                    return await res.json();
                };

                const checkJob = async (jobId) => {
                    const res = await fetch(`/api/jobs/${jobId}`, {
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
            }, sceneId);
            if (job.error) {
                errors.push(`[JOB ERROR] ${job.error}`);
            } else if (job.status !== 'complete') {
                errors.push(`[JOB STATUS] ${job.status}`);
            }
        }
    });
};
