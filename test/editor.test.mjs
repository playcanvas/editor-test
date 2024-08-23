import fs from 'fs';

import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import puppeteer from 'puppeteer';

import projects from './fixtures/projects.mjs';
import { app } from './lib/app.mjs';
import { delete_ } from './lib/delete.mjs';
import { download } from './lib/download.mjs';
import { navigate } from './lib/navigate.mjs';
import { publish } from './lib/publish.mjs';
import { throttler } from './lib/throttler.mjs';

const USER_DATA_PATH = 'user_data';
const OUT_PATH = 'out';

const HOST = process.env.PC_HOST ?? 'playcanvas.com';
const FRONTEND = process.env.PC_FRONTEND ?? '';
const ENGINE = process.env.PC_ENGINE ?? '';
const DEBUG = process.env.PC_DEBUG ?? '';

const searchParams = {};
if (FRONTEND) {
    searchParams.use_local_frontend = undefined;
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

const launchBrowser = async () => {
    await fs.promises.rm(`${OUT_PATH}`, { recursive: true, force: true });
    await fs.promises.mkdir(`${OUT_PATH}`);

    const launchArgs = { userDataDir: USER_DATA_PATH };
    if (DEBUG) {
        launchArgs.headless = false;
        launchArgs.devtools = true;
    }
    const browser = await puppeteer.launch(launchArgs);
    const page = (await browser.pages())[0];
    await page.setViewport({ width: 1270, height: 720 });

    console.log('Checking sign in status...');

    await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle0' });
    const url = await page.evaluate(() => window.location.href);
    if (/login\./.test(url)) {
        throw new Error('Please login to PlayCanvas by running `npm run login`');
    }

    return { browser, page };
};

const { browser, page } = await launchBrowser();
const throttle = await throttler(page);

describe(`Testing ${projects.length} projects`, () => {
    projects.forEach((project) => {
        describe(`${project.name} (${project.id})`, () => {
            let projectPath;
            before(async () => {
                projectPath = `${OUT_PATH}/${project.id}`;
                await fs.promises.mkdir(projectPath);
            });

            it(`checking https://${HOST}/editor/project/${project.id}?${SEARCH_PARAMS}`, async () => {
                const errors = await navigate({
                    page,
                    url: `https://${HOST}/editor/project/${project.id}?${SEARCH_PARAMS}`,
                    outPath: `${projectPath}/editor`
                });
                expect(errors).to.eql([]);
            });

            project.scenes.forEach((sceneId) => {
                describe(`scene (${sceneId})`, () => {
                    let scenePath;
                    before(async () => {
                        scenePath = `${OUT_PATH}/${project.id}/${sceneId}`;
                        await fs.promises.mkdir(scenePath);
                    });

                    it(`checking https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, async () => {
                        const errors = await navigate({
                            page,
                            url: `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`,
                            outPath: `${scenePath}/editor`
                        });
                        expect(errors).to.eql([]);
                    });

                    it('downloading project', async () => {
                        const errors = await download({
                            page,
                            outPath: `${scenePath}/download`,
                            sceneId
                        });
                        expect(errors).to.eql([]);
                    });

                    it('publishing project', async () => {
                        const errors = await publish({
                            page,
                            outPath: `${scenePath}/publish`,
                            sceneId
                        });
                        expect(errors).to.eql([]);
                    });

                    it('launching app', async () => {
                        const errors = await app({
                            page,
                            outPath: `${scenePath}/app`,
                            sceneId
                        });
                        expect(errors).to.eql([]);
                    });

                    it('deleting app', async () => {
                        await page.goto(`https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`, { waitUntil: 'networkidle0' });
                        const errors = await delete_({
                            page,
                            outPath: `${scenePath}/delete`,
                            sceneId
                        });
                        expect(errors).to.eql([]);
                    });

                    it(`checking https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`, async () => {
                        const errors = await navigate({
                            page,
                            url: `https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`,
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
