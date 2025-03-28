class WebInterface {
    private _api = '/api';

    private _token: string = window.config.accessToken;

    private _userId: string = window.config.self.id;

    private _username: string = window.config.self.username;

    private _projectId: string = window.config.project.id;

    private _branchId: string = window.config.self.branch.id;

    private _engineVersion: string = window.config.engineVersions.current.version;

    /**
     * @param method - The method
     * @param url - The URL
     * @param data - The data
     * @param auth - Whether to use authentication
     * @returns The response
     */
    private async _ajax(method: string, url: string, data?: object | FormData, auth: boolean = true): Promise<Response> {
        const headers = {
            Authorization: `Bearer ${this._token}`,
            'Content-Type': 'application/json'
        };
        let body;
        if (data instanceof FormData) {
            body = data;
        } else {
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(data);
        }

        const res = await fetch(url, {
            method,
            headers: auth ? headers : undefined,
            body
        });

        // if rate limited, wait and retry
        if (res.status === 429) {
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 1000);
            });
            return await this._ajax(method, url, data, auth);
        }
        return res;
    }

    /**
     * Set custom API and token
     *
     * @param options - The options
     * @param options.api - The API endpoint
     * @param options.token - The access token
     * @param options.userId - The user id
     * @param options.username - The user name
     * @param options.projectId - The project id
     * @param options.branchId - The branch id
     * @param options.engineVersion - The engine version
     * @returns The instance
     */
    with({
        api,
        token,
        userId,
        username,
        projectId,
        branchId,
        engineVersion
    }: {
        api?: string;
        token?: string;
        userId?: string;
        username?: string;
        projectId?: string;
        branchId?: string;
        engineVersion?: string;
    } = {}) {
        this._api = api ?? this._api;
        this._token = token ?? this._token;
        this._userId = userId ?? this._userId;
        this._username = username ?? this._username;
        this._projectId = projectId ?? this._projectId;
        this._branchId = branchId ?? this._branchId;
        this._engineVersion = engineVersion ?? this._engineVersion;
        return this;
    }

    /**
     * Get the user
     *
     * @param name - The user name
     * @returns The user
     */
    async getUser(name: string) {
        const res = await this._ajax('GET', `${this._api}/users/${name}`, undefined, false);
        return await res.json();
    }

    /**
     * Get the user's projects
     *
     * @param userId - The user id
     * @param view - The view
     * @returns The projects
     */
    async getProjects(userId: string, view: string = '') {
        const res = await this._ajax('GET', `${this._api}/users/${userId}/projects?view=${view}`, undefined, false);
        const json = await res.json();
        return json.result ?? [];
    }

    /**
     * Get the project
     *
     * @param projectId - The project id
     * @returns The project
     */
    async getProject(projectId?: number) {
        const res = await this._ajax('GET', `${this._api}/projects/${projectId ?? this._projectId}`, undefined, true);
        return await res.json();
    }

    /**
     * Get the project apps
     *
     * @param projectId - The project id
     * @returns The project
     */
    async getApps(projectId?: number) {
        const res = await this._ajax('GET', `${this._api}/projects/${projectId ?? this._projectId}/apps?limit=0`);
        const json = await res.json();
        return json.result ?? [];
    }

    /**
     * Get the project scenes
     *
     * @param projectId - The project id
     * @returns The scenes
     */
    async getScenes(projectId?: number) {
        const res = await this._ajax('GET', `${this._api}/projects/${projectId ?? this._projectId}/scenes`);
        const json = await res.json();
        return json.result ?? [];
    }

    /**
     * Creates the project
     *
     * @param name - The name
     * @param projectId - The project id
     * @returns The project
     */
    async createProject(name: string, projectId?: number) {
        const data: Record<string, any> = {
            name,
            owner: this._username
        };

        if (projectId) {
            const project = await this.getProject(projectId);
            data.fork_from = projectId;
            data.description = project.description;
            data.private = project.private;
            data.settings = project.settings;
        }

        const res = await this._ajax('POST', `${this._api}/projects`, data, true);
        return await res.json();
    }

    /**
     * Starts download of the project
     *
     * @param sceneIds - The scene ids
     * @returns The job
     */
    async startDownload(sceneIds: string[]) {
        const res = await this._ajax('POST', `${this._api}/apps/download`, {
            name: 'TEST',
            project_id: this._projectId,
            branch_id: this._branchId,
            scenes: sceneIds,
            engine_version: this._engineVersion
        });
        return await res.json();
    }

    /**
     * Starts publish of the project
     *
     * @param sceneIds - The scene ids
     * @returns The job
     */
    async startPublish(sceneIds: string[]) {
        const res = await this._ajax('POST', `${this._api}/apps`, {
            name: 'TEST',
            project_id: this._projectId,
            branch_id: this._branchId,
            scenes: sceneIds,
            engine_version: this._engineVersion
        });
        return await res.json();
    }

    /**
     * Uploads the project
     *
     * @param file - The file
     * @param chunkSize - The chunk size. Default is 20Mb
     * @returns The S3 key
     */
    async uploadProject(file: File, chunkSize: number = 20 * 1024 * 1024) {
        const chunkCount = Math.ceil(file.size / chunkSize);

        // start upload
        const startRes = await this._ajax('POST', `${this._api}/upload/start-upload`, {
            fileName: file.name
        }, true);
        const startJson = await startRes.json();

        // get signed urls
        const signedRes = await this._ajax('POST', `${this._api}/upload/signed-urls`, {
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
     * @returns The job
     */
    async startImport() {
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
            return { error: 'No files selected' };
        }

        const form = new FormData();
        form.append('file', files[0]);

        // upload project
        const s3Key = await this.uploadProject(files[0]);

        // import project
        const res = await this._ajax('POST', `${this._api}/projects/import`, {
            export_url: s3Key,
            owner: this._userId
        });
        return await res.json();
    }

    /**
     * Deletes the project
     *
     * @param projectId - The project id
     * @returns Whether the project was deleted
     */
    async deleteProject(projectId?: number) {
        const res = await this._ajax('DELETE', `${this._api}/projects/${projectId ?? this._projectId}`, undefined, true);
        return res.status === 200;
    }

    /**
     * Deletes the app
     *
     * @param appId - The app id
     * @returns The job
     */
    async deleteApp(appId: string) {
        const res = await this._ajax('DELETE', `${this._api}/apps/${appId}`);
        const json = await res.json();
        return json.task ?? { error: 'Job not found' };
    }

    /**
     * Checks the job
     *
     * @param jobId - The job id
     * @returns The task
     */
    async checkJob(jobId: string) {
        const res = await this._ajax('GET', `${this._api}/jobs/${jobId}`);
        return await res.json();
    }
}

export { WebInterface };
