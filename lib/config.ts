import 'dotenv/config';

type SearchParams = Record<string, string | number | boolean>;

export const AUTH_STATE = '.auth/state.json';

export const EMAIL = process.env.PC_EMAIL ?? '';
export const PASSWORD = process.env.PC_PASSWORD ?? '';
export const HOST = process.env.PC_HOST ?? 'playcanvas.com';
export const LOGIN_HOST = process.env.PC_LOGIN_HOST ?? 'login.playcanvas.com';
export const LAUNCH_HOST = process.env.PC_LAUNCH_HOST ?? 'launch.playcanvas.com';
export const FRONTEND = process.env.PC_FRONTEND ?? '';

const queryString = (params: SearchParams) => {
    const preset = [];
    if (FRONTEND) {
        preset.push(`use_local_frontend=${FRONTEND}`);
    }
    return preset.concat(Object.entries(params).map(([key, value]) => {
        if (value === undefined) {
            return key;
        }
        return `${key}=${value}`;
    })).join('&');
};

export const editorBlankUrl = (params: SearchParams = {}) => {
    return `https://${HOST}/editor?${queryString(params)}`;
};
export const editorUrl = (projectId: number, params: SearchParams = {}) => {
    return `https://${HOST}/editor/project/${projectId}?${queryString(params)}`;
};
export const editorSceneUrl = (sceneId: number, params: SearchParams = {}) => {
    return `https://${HOST}/editor/scene/${sceneId}?${queryString(params)}`;
};
export const codeEditorUrl = (projectId: number, params: SearchParams = {}) => {
    return `https://${HOST}/editor/code/${projectId}?${queryString(params)}`;
};
export const launchSceneUrl = (sceneId: number, params: SearchParams = {}) => {
    return `https://${LAUNCH_HOST}/${sceneId}?${queryString(params)}`;
};
