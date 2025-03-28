import * as fs from 'fs';

import { test, expect } from '@playwright/test';

import { deleteProject, downloadProject, importProject, publishProject, visitEditor, visitEditorScene, visitLauncher } from '../lib/common';
import { middleware } from '../lib/middleware';
import { id } from '../lib/utils';

const PROJECTS = fs.existsSync('projects') ? fs.readdirSync('projects') : [];

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const next = id();

PROJECTS.forEach((project) => {
    const FILE_NAME = project.split('.')[0];
    const IN_PATH = `projects/${project}`;
    const OUT_PATH = `out/${FILE_NAME}`;

    test.describe(project, () => {
        test('import > goto editor (project) > goto editor (scene) > goto launcher > delete', async ({ page }) => {
            const projectPath = `${OUT_PATH}/${next()}`;
            await fs.promises.mkdir(projectPath, { recursive: true });

            // import
            const {
                errors: importErrors,
                projectId
            } = await importProject(page, `${projectPath}/import`, IN_PATH);
            expect(importErrors).toStrictEqual([]);

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

        test('import > goto editor > download > publish > goto app > delete app > delete', async ({ page }) => {
            const projectPath = `${OUT_PATH}/${next()}`;
            await fs.promises.mkdir(projectPath, { recursive: true });

            // import
            const {
                errors: importErrors,
                projectId
            } = await importProject(page, `${projectPath}/import`, IN_PATH);
            expect(importErrors).toStrictEqual([]);

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
    });
});
