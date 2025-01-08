// eslint-disable-next-line import/extensions
import 'dotenv/config';

export const GMAIL = process.env.PC_GMAIL ?? '';
export const PASSWORD = process.env.PC_PASSWORD ?? '';
export const USERNAME = process.env.PC_USERNAME ?? '';
export const HOST = process.env.PC_HOST ?? 'playcanvas.com';
export const LOGIN_HOST = process.env.PC_LOGIN_HOST ?? 'login.playcanvas.com';
export const LAUNCH_HOST = process.env.PC_LAUNCH_HOST ?? 'launch.playcanvas.com';
export const FRONTEND = process.env.PC_FRONTEND ?? '';
export const ENGINE = process.env.PC_ENGINE ?? '';

const searchParams = {};
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

export const homeProjectUrl = projectId => `https://${HOST}/project/${projectId}`;
export const editorProjectUrl = (projectId, v2) => `https://${HOST}/editor/project/${projectId}?${SEARCH_PARAMS}${v2 ? '&v2' : ''}`;
export const editorSceneUrl = (sceneId, v2) => `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}${v2 ? '&v2' : ''}`;
export const launchSceneUrl = (sceneId, v2) => `https://${LAUNCH_HOST}/${sceneId}?${SEARCH_PARAMS}${v2 ? '&v2' : ''}`;
