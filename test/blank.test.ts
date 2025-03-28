import * as fs from 'fs';

import { expect, test } from '@playwright/test';

import { createProject, deleteProject, downloadProject, getSetting, publishProject, visitEditor, visitEditorScene, visitLauncher } from '../lib/common';
import { middleware } from '../lib/middleware';
import { id } from '../lib/utils';

const OUT_PATH = 'out/blank';
const PROJECT_NAME = 'Blank Project';

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const next = id();

test('create > fork > delete forked > goto editor > goto launcher > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${next()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    const {
        errors: createErrors,
        projectId
    } = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
    expect(createErrors).toStrictEqual([]);

    // fork > delete forked
    const {
        errors: forkErrors,
        projectId: forkedProjectId
    } = await createProject(page, `${projectPath}/fork-create`, `${PROJECT_NAME} FORK`, projectId);
    expect(forkErrors).toStrictEqual([]);
    expect(await deleteProject(page, `${projectPath}/fork-delete`, forkedProjectId)).toStrictEqual([]);

    // goto editor (project)
    const {
        errors: editorErrors,
        sceneId
    } = await visitEditor(page, `${projectPath}/editor`, projectId);
    expect(editorErrors).toStrictEqual([]);

    // goto editor (scene)
    const scenePath = `${projectPath}/${sceneId}`;
    await fs.promises.mkdir(scenePath, { recursive: true });
    expect(await visitEditorScene(page, `${scenePath}/editor`, sceneId)).toStrictEqual([]);

    // goto launcher
    expect(await visitLauncher(page, `${projectPath}/launcher`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});

test('create > goto editor > download > publish > goto app > delete app > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${next()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    const {
        errors: createErrors,
        projectId
    } = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
    expect(createErrors).toStrictEqual([]);

    // goto editor (project)
    const {
        errors: editorErrors,
        sceneId
    } = await visitEditor(page, `${projectPath}/editor`, projectId);
    expect(editorErrors).toStrictEqual([]);

    // download
    expect(await downloadProject(page, `${projectPath}/download`, sceneId)).toStrictEqual([]);

    // publish
    expect(await publishProject(page, `${projectPath}/publish`, sceneId)).toStrictEqual([]);

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});

test('create > goto editor > check default settings > delete', async ({ page }) => {
    const projectPath = `${OUT_PATH}/${next()}`;
    await fs.promises.mkdir(projectPath, { recursive: true });

    // create
    const {
        errors: createErrors,
        projectId
    } = await createProject(page, `${projectPath}/create`, PROJECT_NAME);
    expect(createErrors).toStrictEqual([]);

    // goto editor
    const {
        errors: editorErrors
    } = await visitEditor(page, `${projectPath}/editor`, projectId);
    expect(editorErrors).toStrictEqual([]);

    // open settings
    await page.getByRole('button', { name: '' }).click();

    // open asset tasks
    await page.getByText('ASSET TASKS', { exact: true }).click();
    expect(await getSetting(page, 'Convert to GLB').getAttribute('class')).toContain('pcui-boolean-input-ticked');
    expect(await getSetting(page, 'Create FBX Folder').getAttribute('class')).toContain('pcui-boolean-input-ticked');

    // delete
    expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
});
