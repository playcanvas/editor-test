export const initInterface = () => {
    class WebInterface {
        /**
         * @private
         * @type {string}
         */
        _api = '/api';

        /**
         * @private
         * @type {string}
         */
        _token = config.accessToken;

        /**
         * @private
         * @param {string} method - The method
         * @param {string} url - The URL
         * @param {object} data - The data
         * @param {boolean} auth - Whether to use authentication
         * @returns {Promise<Response>} The response
         */
        async _ajax(method, url, data, auth = true) {
            const headers = {
                Authorization: `Bearer ${this._token}`,
                'Content-Type': 'application/json'
            };
            const res = await fetch(url, {
                method,
                headers: auth ? headers : undefined,
                body: JSON.stringify(data)
            });

            // if rate limited, wait and retry
            if (res.status === 429) {
                await new Promise((resolve) => {
                    setTimeout(resolve, 1000);
                });
                return await this._ajax(method, url, data, auth);
            }
            return res;
        }

        /**
         * Set custom API and token
         *
         * @param {object} options - The options
         * @param {string} options.api - The API endpoint
         * @param {string} options.token - The access token
         * @returns {WebInterface} The instance
         */
        with({ api, token } = { api: this._api, token: this._token }) {
            this._api = api;
            this._token = token;
            return this;
        }

        /**
         * Get the user
         *
         * @param {string} name - The user name
         * @returns {Promise<object>} The user
         */
        async getUser(name) {
            const res = await this._ajax('GET', `${this._api}/users/${name}`, undefined, false);
            return await res.json();
        }

        /**
         * Get the user's projects
         *
         * @param {string} userId - The user id
         * @param {string} view - The view
         * @returns {Promise<object[]>} The projects
         */
        async getProjects(userId, view = '') {
            const res = await this._ajax('GET', `${this._api}/users/${userId}/projects?view=${view}`, undefined, false);
            const json = await res.json();
            return json.result ?? [];
        }

        /**
         * Get the project apps
         *
         * @returns {Promise<object>} The project
         */
        async getApps() {
            const res = await this._ajax('GET', `${this._api}/projects/${config.project.id}/apps?limit=0`);
            const json = await res.json();
            return json.result ?? [];
        }

        /**
         * Get the project scenes
         *
         * @param {string} projectId - The project id
         * @returns {Promise<object[]>} The scenes
         */
        async getScenes(projectId) {
            const res = await this._ajax('GET', `${this._api}/projects/${projectId ?? config.project.id}/scenes`);
            const json = await res.json();
            return json.result ?? [];
        }

        /**
         * Starts download of the project
         *
         * @param {string[]} sceneIds - The scene ids
         * @returns {Promise<object>} The job
         */
        async startDownload(sceneIds) {
            const res = await this._ajax('POST', `${this._api}/apps/download`, {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        /**
         * Starts publish of the project
         *
         * @param {string[]} sceneIds - The scene ids
         * @returns {Promise<object>} The job
         */
        async startPublish(sceneIds) {
            const res = await this._ajax('POST', `${this._api}/apps`, {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        /**
         * Uploads the project
         *
         * @param {File} file - The file
         * @returns {Promise<string>} The S3 key
         */
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

        /**
         * Starts import of the project
         *
         * @returns {Promise<object>} The job
         */
        async startImport() {
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

        /**
         * Deletes the project
         *
         * @param {string} projectId - The project id
         * @returns {Promise<boolean>} Whether the project was deleted
         */
        async deleteProject(projectId) {
            const res = await this._ajax('DELETE', `${this._api}/projects/${projectId ?? config.project.id}`, undefined, true);
            return res.status === 200;
        }

        /**
         * Deletes the app
         *
         * @param {string} appId - The app id
         * @returns {Promise<object>} The job
         */
        async deleteApp(appId) {
            const res = await this._ajax('DELETE', `${this._api}/apps/${appId}`);
            const json = await res.json();
            return json.task ?? { error: 'Job not found' };
        }

        /**
         * Checks the job
         *
         * @param {string} jobId - The job id
         * @returns {Promise<object>} The task
         */
        async checkJob(jobId) {
            const res = await this._ajax('GET', `${this._api}/jobs/${jobId}`);
            return await res.json();
        }

        /**
         * Checks the publish job
         *
         * @param {string} appId - The app id
         * @returns {Promise<object>} The job
         */
        async checkPublish(appId) {
            const res = await this._ajax('GET', `${this._api}/projects/${config.project.id}/apps?limit=0`);
            const json = await res.json();
            return json.result.find(app => app.id === appId)?.task ?? { error: 'Job not found' };
        }
    }

    const wi = window.wi = new WebInterface();

    return wi;
};
