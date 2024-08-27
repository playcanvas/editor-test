export const initContext = () => {
    class TestContext {
        loaded = true;

        get headers() {
            return {
                Authorization: `Bearer ${config.accessToken}`,
                'Content-Type': 'application/json'
            };
        }

        async getApps() {
            const res = await fetch(`/api/projects/${config.project.id}/apps?limit=0`, {
                headers: this.headers
            });
            const json = await res.json();
            return json.result ?? [];
        }

        async getScenes() {
            const res = await fetch(`/api/projects/${config.project.id}/scenes`, {
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

    window.test = new TestContext();
};
