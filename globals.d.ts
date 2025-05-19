/* eslint-disable no-unused-vars */
interface Window {
    config: import('@playcanvas/editor-api').EditorConfig;

    editor: {
        call(method: string, ...args: any[]): any;
        api: {
            globals: typeof import('@playcanvas/editor-api').globals
        };
    };

    wi: import('./lib/web-interface').WebInterface;
}
