/* eslint-disable no-unused-vars */
interface Window {
    config: {
        accessToken: string;
        self: {
            id: string;
            username: string;
            branch: {
                id: string;
                name: string;
            };
        };
        project: {
            id: string;
            name: string;
        };
        engineVersions: {
            current: {
                version: string;
            };
        }
    };

    editor: {
        call(method: string, ...args: any[]): any;
    };

    wi: import('./lib/web-interface').WebInterface;
}
