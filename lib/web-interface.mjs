export const initInterface = () => {
    class WebInterface {
        _api = '/api';

        loaded = true;

        get headers() {
            return {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            };
        }

        async _ajax(method, url, data, auth = true) {
            const res = await fetch(url, {
                method,
                headers: auth ? this.headers : undefined,
                body: JSON.stringify(data)
            });
            if (res.status === 429) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });
                return await this._ajax(method, url, data, auth);
            }
            return res;
        }

        with({ api } = { api: this._api }) {
            this._api = api;
            return this;
        }

        async getUser(name) {
            const res = await this._ajax('GET', `${this._api}/users/${name}`, undefined, false);
            return await res.json();
        }

        async getProjects(userId, view = '') {
            const res = await this._ajax('GET', `${this._api}/users/${userId}/projects?view=${view}`, undefined, false);
            const json = await res.json();
            return json.result ?? [];
        }

        async getApps() {
            const res = await this._ajax('GET', `${this._api}/projects/${config.project.id}/apps?limit=0`);
            const json = await res.json();
            return json.result ?? [];
        }

        async getScenes(projectId) {
            const res = await this._ajax('GET', `${this._api}/projects/${projectId ?? config.project.id}/scenes`);
            const json = await res.json();
            return json.result ?? [];
        }

        async postDownload(sceneIds) {
            const res = await this._ajax('POST', `${this._api}/apps/download`, {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        async postPublish(sceneIds) {
            const res = await this._ajax('POST', `${this._api}/apps`, {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        async uploadProject(file) {
            const partSize = 20 * 1024 * 1024; // 20Mb per part
            const partsTotal = Math.ceil(file.size / partSize);

            // start upload
            const startRes = await this._ajax('POST', `${this._api}/upload/start-upload`, {
                fileName: file.name
            }, true);
            const startJson = await startRes.json();

            // get signed urls
            const signedRes = await this._ajax('POST', `${this._api}/upload/signed-urls`, {
                uploadId: startJson.uploadId,
                parts: partsTotal,
                key: startJson.key
            }, true);
            const signedJson = await signedRes.json();

            // upload parts
            let part = 1;
            const promises = [];
            for (let start = 0; start < file.size; start += partSize) {
                const end = Math.min(start + partSize, file.size);
                const blob = file.slice(start, end);
                const url = signedJson.signedUrls[part - 1];
                promises.push(fetch(url, {
                    method: 'PUT',
                    body: blob,
                    headers: {
                        'Content-Type': 'application/zip'
                    }
                }));
                part++;
            }
            const uploadRes = await Promise.all(promises);

            // get etags
            const parts = [];
            for (let i = 0; i < uploadRes.length; i++) {
                const res = uploadRes[i];
                const etag = res.headers.get('ETag');
                const cleanEtag = etag.replace(/^"|"$/g, '');
                parts.push({ PartNumber: i + 1, ETag: cleanEtag });
            }

            // complete upload
            await this._ajax('POST', `${this._api}/upload/complete-upload`, {
                uploadId: startJson.uploadId,
                parts: parts,
                key: startJson.key
            }, true);

            return startJson.key;
        }

        async importProject() {
            const filePicker = document.createElement('input');
            filePicker.id = 'file-picker';
            filePicker.type = 'file';
            filePicker.accept = 'application/zip';
            filePicker.click();
            const files = await new Promise((resolve) => {
                filePicker.addEventListener('change', () => {
                    resolve(filePicker.files);
                });
            });
            filePicker.remove();

            if (files.length === 0) {
                return { error: 'No files selected' };
            }

            const form = new FormData();
            form.append('file', files[0]);

            // upload project
            const s3Key = await this.uploadProject(files[0]);

            // import project
            const res = await this._ajax('POST', `${this._api}/projects/import`, {
                export_url: s3Key,
                owner: config.self.id
            });
            return await res.json();
        }

        async deleteProject(projectId) {
            const res = await this._ajax('DELETE', `${this._api}/projects/${projectId ?? config.project.id}`, undefined, true);
            return res.status === 200;
        }

        async deleteApp(appId) {
            const res = await this._ajax('DELETE', `${this._api}/apps/${appId}`);
            const json = await res.json();
            return json.task ?? { error: 'Job not found' };
        }

        async checkJob(jobId) {
            const res = await this._ajax('GET', `${this._api}/jobs/${jobId}`);
            return await res.json();
        }

        async checkPublish(appId) {
            const res = await this._ajax('GET', `${this._api}/projects/${config.project.id}/apps?limit=0`);
            const json = await res.json();
            return json.result.find(app => app.id === appId)?.task ?? { error: 'Job not found' };
        }
    }

    const wi = window.wi = new WebInterface();

    return wi;
};
