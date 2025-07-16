import { type Page } from '@playwright/test';

import { poll, wait } from './utils';

/**
 * Polls for a job to complete.
 *
 * @param page - The page to poll.
 * @param jobId - The job id to poll.
 * @returns The job result.
 */
export const pollJob = async (page: Page, jobId: number) => {
    const job = await poll(async () => {
        const job = await page.evaluate(jobId => window.editor.api.globals.rest.jobs.jobGet({ jobId }).promisify(), jobId);
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
    const create: any = await page.evaluate(
        ({ name, fork_from }) => window.editor.api.globals.rest.projects.projectCreate({
            name,
            fork_from
        }).promisify(),
        {
            name: projectName,
            fork_from: masterProjectId
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
    await page.evaluate((projectId) => {
        return window.editor.api.globals.rest.projects.projectDelete({ projectId }).promisify();
    }, projectId);
};

/**
 * Delete all projects.
 *
 * @param page - The page.
 */
export const deleteAllProjects = async (page: Page) => {
    const projects = await page.evaluate(async () => {
        const res: any = await window.editor.api.globals.rest.users.userProjects(window.config.self.id, '').promisify();
        return res.result ?? [];
    });
    let deletePromise = Promise.resolve();
    for (const project of projects) {
        deletePromise = deletePromise.then(async () => {
            await page.evaluate((projectId) => {
                return window.editor.api.globals.rest.projects.projectDelete({ projectId }).promisify();
            }, project.id);
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
    // import project
    const fileChooserPromise = page.waitForEvent('filechooser');
    const importProjectPromise = page.evaluate(async () => {
        const ajax = (method: string, url: string, data?: object | FormData, auth: boolean = true) => {
            const headers = {
                Authorization: `Bearer ${window.config.accessToken}`,
                'Content-Type': 'application/json'
            };
            let body;
            if (data instanceof FormData) {
                body = data;
            } else {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(data);
            }
            return fetch(url, {
                method,
                headers: auth ? headers : undefined,
                body
            });
        };

        const filePicker = document.createElement('input');
        filePicker.id = 'file-picker';
        filePicker.type = 'file';
        filePicker.accept = 'application/zip';
        filePicker.click();
        const files = await new Promise<FileList | null>((resolve) => {
            filePicker.addEventListener('change', () => {
                resolve(filePicker.files);
            });
        });
        filePicker.remove();

        if (!files || files.length === 0) {
            throw new Error('No files selected');
        }
        const file = files[0];

        const form = new FormData();
        form.append('file', file);

        // calculate chunk count
        const chunkSize = 20 * 1024 * 1024;
        const chunkCount = Math.ceil(file.size / chunkSize);

        // start upload
        const startRes = await ajax('POST', '/api/upload/start-upload', {
            fileName: file.name
        }, true);
        const startJson = await startRes.json();

        // get signed urls
        const signedRes = await ajax('POST', '/api/upload/signed-urls', {
            uploadId: startJson.uploadId,
            parts: chunkCount,
            key: startJson.key
        }, true);
        const signedJson = await signedRes.json();

        // upload chunks
        let chunk = 1;
        const promises = [];
        for (let start = 0; start < file.size; start += chunkSize) {
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);
            const url = signedJson.signedUrls[chunk - 1];
            promises.push(fetch(url, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': 'application/zip'
                }
            }));
            chunk++;
        }
        const uploadRes = await Promise.all(promises);

        // get etags
        const parts = [];
        for (let i = 0; i < uploadRes.length; i++) {
            const res = uploadRes[i];
            const etag = res.headers.get('ETag') ?? '';
            const cleanEtag = etag.replace(/^"|"$/g, '');
            parts.push({ PartNumber: i + 1, ETag: cleanEtag });
        }

        // complete upload
        await ajax('POST', '/api/upload/complete-upload', {
            uploadId: startJson.uploadId,
            parts: parts,
            key: startJson.key
        }, true);

        // import project
        const job: any = await window.editor.api.globals.rest.projects.projectImport({
            export_url: startJson.key,
            owner: window.config.self.id
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
    });
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(importPath);
    const job = await importProjectPromise;
    if (job.error) {
        throw new Error(`Import error: ${job.error}`);
    }
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
    const job = await page.evaluate(async (appId) => {
        const app: any = await window.editor.api.globals.rest.apps.appDelete(appId).promisify();
        return app.task ?? { error: 'Job not found' };
    }, appId);
    if (job.error) {
        throw new Error(`Delete error: ${job.error}`);
    }
};
