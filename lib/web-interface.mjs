export const initInterface = () => {
    class WebInterface {
        loaded = true;

        get headers() {
            return {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            };
        }

        async ajax(method, url, data, auth = true) {
            const res = await fetch(url, {
                method,
                headers: auth ? this.headers : undefined,
                body: JSON.stringify(data)
            });
            return res;
        }

        async getUser(name) {
            const res = await this.ajax('GET', `/api/users/${name}`, undefined, false);
            return await res.json();
        }

        async getProjects(userId) {
            const res = await this.ajax('GET', `/api/users/${userId}/projects`, undefined, false);
            const json = await res.json();
            return json.result ?? [];
        }

        async getApps() {
            const res = await this.ajax('GET', `/api/projects/${config.project.id}/apps?limit=0`);
            const json = await res.json();
            return json.result ?? [];
        }

        async getScenes(projectId) {
            const res = await this.ajax('GET', `/api/projects/${projectId ?? config.project.id}/scenes`);
            const json = await res.json();
            return json.result ?? [];
        }

        async postDownload(sceneIds) {
            const res = await this.ajax('POST', '/api/apps/download', {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        async postPublish(sceneIds) {
            const res = await this.ajax('POST', '/api/apps', {
                name: 'TEST',
                project_id: config.project.id,
                branch_id: config.self.branch.id,
                scenes: sceneIds,
                engine_version: config.engineVersions.current.version
            });
            return await res.json();
        }

        async deleteProject(projectId) {
            const res = await this.ajax('DELETE', `/api/projects/${projectId ?? config.project.id}`);
            return res.status === 200;
        }

        async deleteApp(appId) {
            const res = await this.ajax('DELETE', `/api/apps/${appId}`);
            const json = await res.json();
            return json.task ?? { error: 'Job not found' };
        }

        async checkDownload(jobId) {
            const res = await this.ajax('GET', `/api/jobs/${jobId}`);
            return await res.json();
        }

        async checkPublish(appId) {
            const res = await this.ajax('GET', `/api/apps/${appId}`);
            const json = await res.json();
            return json.result.find(app => app.id === appId)?.task ?? { error: 'Job not found' };
        }
    }

    const wi = window.wi = new WebInterface();

    return wi;
};
