import 'dotenv/config';

export const AUTH_STATE = '.auth/state.json';

export const GMAIL = process.env.PC_GMAIL ?? '';
export const PASSWORD = process.env.PC_PASSWORD ?? '';
export const HOST = process.env.PC_HOST ?? 'playcanvas.com';
export const LOGIN_HOST = process.env.PC_LOGIN_HOST ?? 'login.playcanvas.com';
export const LAUNCH_HOST = process.env.PC_LAUNCH_HOST ?? 'launch.playcanvas.com';
export const FRONTEND = process.env.PC_FRONTEND ?? '';
export const ENGINE = process.env.PC_ENGINE ?? '';

const searchParams: {
    use_local_frontend?: string;
    use_local_engine?: string;
} = {};
if (FRONTEND) {
    searchParams.use_local_frontend = FRONTEND;
}
if (ENGINE) {
    searchParams.use_local_engine = ENGINE;
}
const SEARCH_PARAMS = Object.entries(searchParams).map(([key, value]) => {
    if (value === undefined) {
        return key;
    }
    return `${key}=${value}`;
}).join('&');

export const editorUrl = (projectId: number) => `https://${HOST}/editor/project/${projectId}?${SEARCH_PARAMS}`;
export const editorSceneUrl = (sceneId: number) => `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`;
export const codeEditorUrl = (projectId: number) => `https://${HOST}/editor/code/${projectId}?${SEARCH_PARAMS}`;
export const launchSceneUrl = (sceneId: number) => `https://${LAUNCH_HOST}/${sceneId}?${SEARCH_PARAMS}`;
