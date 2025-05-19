import 'dotenv/config';

type SearchParams = Record<string, string | number | boolean>;

export const AUTH_STATE = '.auth/state.json';

export const GMAIL = process.env.PC_GMAIL ?? '';
export const PASSWORD = process.env.PC_PASSWORD ?? '';
export const HOST = process.env.PC_HOST ?? 'playcanvas.com';
export const LOGIN_HOST = process.env.PC_LOGIN_HOST ?? 'login.playcanvas.com';
export const LAUNCH_HOST = process.env.PC_LAUNCH_HOST ?? 'launch.playcanvas.com';

const queryString = (params: SearchParams) => {
    return Object.entries(params).map(([key, value]) => {
        if (value === undefined) {
            return key;
        }
        return `${key}=${value}`;
    }).join('&');
};

export const editorBlankUrl = (params: SearchParams = {}) => `https://${HOST}/editor?${queryString(params)}`;
export const editorUrl = (projectId: number, params: SearchParams = {}) => `https://${HOST}/editor/project/${projectId}?${queryString(params)}`;
export const editorSceneUrl = (sceneId: number, params: SearchParams = {}) => `https://${HOST}/editor/scene/${sceneId}?${queryString(params)}`;
export const codeEditorUrl = (projectId: number, params: SearchParams = {}) => `https://${HOST}/editor/code/${projectId}?${queryString(params)}`;
export const launchSceneUrl = (sceneId: number, params: SearchParams = {}) => `https://${LAUNCH_HOST}/${sceneId}?${queryString(params)}`;
