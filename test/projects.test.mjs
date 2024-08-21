import fs from 'fs';

import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import puppeteer from 'puppeteer';

import projectIds from './fixtures/projects.mjs';

const USER_DATA_PATH = 'user_data';
const OUT_PATH = 'out';

const HOST = 'playcanvas.com';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.url - The URL to navigate to.
 * @param {string} options.outPath - The output path.
 * @returns {Promise<string[]>} - The number of errors.
 */
const navigate = async ({ page, url, outPath }) => {
    const errors = [];

    await fs.promises.writeFile(`${outPath}.console.log`, '');
    await fs.promises.writeFile(`${outPath}.request.log`, '');

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    });
    page.on('pageerror', (msg) => {
        errors.push(msg);
        const msgStr = `[pageerror] ${msg}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    });
    page.on('response', (response) => {
        const msgStr = `[${response.status()}] ${response.url()}`;
        fs.promises.appendFile(`${outPath}.request.log`, `${msgStr}\n`);
    });

    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: `${outPath}.png` });

    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');

    return errors;
};

const getProjectSceneIds = async (page, projectId) => {
    return await page.evaluate(async (projectId) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/scenes`);
            const json = await res.json();
            return json.result?.map(scene => scene.id) ?? [];
        } catch (err) {
            return [];
        }
    }, projectId);
};

await fs.promises.rm(`${OUT_PATH}`, { recursive: true, force: true });
await fs.promises.mkdir(`${OUT_PATH}`);

const browser = await puppeteer.launch({ userDataDir: USER_DATA_PATH });
const page = await browser.newPage();

const sceneIds = new Map();
await page.goto(`https://${HOST}`);
await Promise.all(
    projectIds.map(async projectId => sceneIds.set(projectId, await getProjectSceneIds(page, projectId)))
);

describe(`Testing ${projectIds.length} projects`, () => {
    projectIds.forEach((projectId) => {
        describe(`projectId: ${projectId}`, () => {
            let projectPath;
            before(async () => {
                projectPath = `${OUT_PATH}/${projectId}`;
                await fs.promises.mkdir(projectPath);
            });

            it(`checking https://${HOST}/editor/project/${projectId}`, async () => {
                const errors = await navigate({
                    page,
                    url: `https://${HOST}/editor/project/${projectId}`,
                    outPath: `${projectPath}/editor`
                });
                expect(errors).to.eql([]);
            });

            sceneIds.get(projectId).forEach((sceneId) => {
                describe(`sceneId: ${sceneId}`, () => {
                    let scenePath;
                    before(async () => {
                        scenePath = `${OUT_PATH}/${projectId}/${sceneId}`;
                        await fs.promises.mkdir(scenePath);
                    });

                    it(`checking https://${HOST}/editor/scene/${sceneId}`, async () => {
                        const errors = await navigate({
                            page,
                            url: `https://${HOST}/editor/scene/${sceneId}`,
                            outPath: `${scenePath}/editor`
                        });
                        expect(errors).to.eql([]);
                    });

                    it(`checking https://launch.${HOST}/${sceneId}`, async () => {
                        const errors = await navigate({
                            page,
                            url: `https://launch.${HOST}/${sceneId}`,
                            outPath: `${scenePath}/launch`
                        });
                        expect(errors).to.eql([]);
                    });
                });
            });
        });
    });

    after(() => {
        browser.close();
    });
});
