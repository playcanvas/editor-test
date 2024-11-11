import fs from 'fs';

import { expect, test } from '@playwright/test';

import { createProject, deleteProject, downloadProject, forkProject, getProjectId, getSceneId, getSetting, publishProject, visitEditor, visitEditorScene, visitLauncher } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { idGenerator } from '../lib/utils.mjs';

const OUT_PATH = 'out/blank';
const PROJECT_NAME = 'Blank Project';

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const nextId = idGenerator();

test('create > fork > delete forked > goto editor > goto launcher > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    expect(await createProject(page, `${projectPath}/create`, PROJECT_NAME)).toStrictEqual([]);
    const projectId = getProjectId(page);

    // fork > delete forked
    expect(await forkProject(page, `${projectPath}/fork`, projectId, PROJECT_NAME)).toStrictEqual([]);

    // goto editor (project)
    expect(await visitEditor(page, `${projectPath}/editor`, projectId)).toStrictEqual([]);
    const sceneId = getSceneId(page);

    // goto editor (scene)
    const scenePath = `${projectPath}/${sceneId}`;
    await fs.promises.mkdir(scenePath, { recursive: true });
    expect(await visitEditorScene(page, `${scenePath}/editor`, sceneId)).toStrictEqual([]);

    // goto launcher
    expect(await visitLauncher(page, `${projectPath}/launcher`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});

test('create > goto editor > download > publish > goto app > delete app > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    expect(await createProject(page, `${projectPath}/create`, PROJECT_NAME)).toStrictEqual([]);
    const projectId = getProjectId(page);

    // goto editor (project)
    expect(await visitEditor(page, `${projectPath}/editor`, projectId)).toStrictEqual([]);
    const sceneId = getSceneId(page);

    // download
    expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);

    // publish
    expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});

test('create > goto editor > check default settings > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${nextId()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    expect(await createProject(page, `${projectPath}/create`, PROJECT_NAME)).toStrictEqual([]);
    const projectId = getProjectId(page);

    // fork > delete forked
    expect(await forkProject(page, `${projectPath}/fork`, projectId, PROJECT_NAME)).toStrictEqual([]);

    // goto editor
    expect(await visitEditor(page, `${projectPath}/editor`, projectId)).toStrictEqual([]);

    // open settings
    await page.getByRole('button', { name: '' }).click();

    // open asset tasks
    await page.getByText('ASSET TASKS', { exact: true }).click();
    expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
    expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId, PROJECT_NAME)).toStrictEqual([]);
});
