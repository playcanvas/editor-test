import fs from 'fs';

import { expect } from 'chai';
import { describe, it, before, after } from 'mocha';
import puppeteer from 'puppeteer';

import projects from './fixtures/projects.mjs';

const USER_DATA_PATH = 'user_data';
const OUT_PATH = 'out';

const HOST = process.env.PC_HOST ?? 'playcanvas.com';
const FRONTEND = process.env.PC_FRONTEND ?? '';
const ENGINE = process.env.PC_ENGINE ?? '';

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

await fs.promises.rm(`${OUT_PATH}`, { recursive: true, force: true });
await fs.promises.mkdir(`${OUT_PATH}`);

const browser = await puppeteer.launch({ userDataDir: USER_DATA_PATH });
const page = (await browser.pages())[0];
await page.setViewport({ width: 1270, height: 720 });

await page.setRequestInterception(true);
let requests = 0;

page.on('request', (request) => {
    if (/playcanvas\.com/.test(request.url())) {
        requests++;
        request.continue();
        return;
    }
    request.continue();
});

const throttle = async (limit = 240, refreshRate = 60 * 1000) => {
    if (requests > limit) {
        console.log(`        waiting for requests to cool down ${requests}/${limit}`);
        await new Promise((resolve) => {
            setTimeout(() => {
                requests = 0;
                resolve();
            }, refreshRate);
        });
    }
};

describe(`Testing ${projects.length} projects`, () => {
    projects.forEach((project) => {
        describe(`${project.name} (${project.id})`, () => {
            let projectPath;
            before(async () => {
                projectPath = `${OUT_PATH}/${project.id}`;
                await fs.promises.mkdir(projectPath);
            });

            it(`checking https://${HOST}/editor/project/${project.id}?${SEARCH_PARAMS}`, async () => {
                await throttle();
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
                        await throttle();
                        const errors = await navigate({
                            page,
                            url: `https://${HOST}/editor/scene/${sceneId}?${SEARCH_PARAMS}`,
                            outPath: `${scenePath}/editor`
                        });
                        expect(errors).to.eql([]);
                    });

                    it(`checking https://launch.${HOST}/${sceneId}?${SEARCH_PARAMS}`, async () => {
                        await throttle();
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
