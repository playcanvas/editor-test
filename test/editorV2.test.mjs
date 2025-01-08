import fs from 'fs';

import { test, expect } from '@playwright/test';

import { deleteProject, importProject, visitEditor } from '../lib/common.mjs';
import { middleware } from '../lib/middleware.mjs';
import { idGenerator } from '../lib/utils.mjs';

const PROJECTS = fs.existsSync('projects') ? fs.readdirSync('projects') : [];

middleware(test);

test.describe.configure({
    mode: 'serial'
});

const nextId = idGenerator();

PROJECTS.forEach((project) => {
    const FILE_NAME = project.split('.')[0];
    const IN_PATH = `projects/${project}`;
    const OUT_PATH = `out/${FILE_NAME}`;

    test.describe(project, () => {
        test('import > goto editor (project) > goto editor (scene) > goto launcher > delete', async ({ page }) => {
            const projectPath = `${OUT_PATH}/${nextId()}`;
            await fs.promises.mkdir(projectPath, { recursive: true });

            // import
            const {
                errors: importErrors,
                projectId
            } = await importProject(page, `${projectPath}/import`, IN_PATH);
            expect(importErrors).toStrictEqual([]);

            // goto editor v1 (project)
            const {
                errors: editorV1Errors
            } = await visitEditor(page, `${projectPath}/editorV1`, projectId);
            expect(editorV1Errors).toStrictEqual([]);

            // goto editor v2 (project)
            const {
                errors: editorV2Errors
            } = await visitEditor(page, `${projectPath}/editorV2`, projectId, true);
            expect(editorV2Errors).toStrictEqual([]);

            // delete
            expect(await deleteProject(page, `${projectPath}/delete`, projectId)).toStrictEqual([]);
        });
    });
});
