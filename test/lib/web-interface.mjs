export const initInterface = () => {
    class WebInterface {
        loaded = true;

        get headers() {
            return {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            };
        }

        async getUser(name) {
            const res = await fetch(`/api/users/${name}`, {
                headers: this.headers
            });
            return await res.json();
        }

        async getProjects(userId) {
            const res = await fetch(`/api/users/${userId}/projects`);
            const json = await res.json();
            return json.result ?? [];
        }

        async getApps() {
            const res = await fetch(`/api/projects/${config.project.id}/apps?limit=0`, {
                headers: this.headers
            });
            const json = await res.json();
            return json.result ?? [];
        }

        async getScenes(projectId) {
            const res = await fetch(`/api/projects/${projectId ?? config.project.id}/scenes`, {
                headers: this.headers
            });
            const json = await res.json();
            return json.result ?? [];
        }

        async postDownload(sceneIds) {
            const res = await fetch('/api/apps/download', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    name: 'TEST',
                    project_id: config.project.id,
                    branch_id: config.self.branch.id,
                    scenes: sceneIds,
                    engine_version: config.engineVersions.current.version
                })
            });
            return await res.json();
        }

        async postPublish(sceneIds) {
            const res = await fetch('/api/apps', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    name: 'TEST',
                    project_id: config.project.id,
                    branch_id: config.self.branch.id,
                    scenes: sceneIds,
                    engine_version: config.engineVersions.current.version
                })
            });
            return await res.json();
        }

        async deleteApp(appId) {
            const res = await fetch(`/api/apps/${appId}`, {
                method: 'DELETE',
                headers: this.headers
            });
            const json = await res.json();
            return json.task ?? { error: 'Job not found' };
        }

        async checkDownload(jobId) {
            const res = await fetch(`/api/jobs/${jobId}`, {
                headers: this.headers
            });
            return await res.json();
        }

        async checkPublish(appId) {
            const res = await fetch(`/api/projects/${config.project.id}/apps?limit=0`, {
                headers: this.headers
            });
            const json = await res.json();
            return json.result.find(app => app.id === appId)?.task ?? { error: 'Job not found' };
        }
    }

    const wi = window.wi = new WebInterface();

    return wi;
};
