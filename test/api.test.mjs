import fs from 'fs';

import { expect, test } from '@playwright/test';

import { HOST } from '../lib/url.mjs';
import { initInterface } from '../lib/web-interface.mjs';

const sortKeys = (obj) => {
    return Object.keys(obj).sort((a, b) => {
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }).reduce((acc, key) => {
        acc[key] = typeof obj[key] === 'object' && obj[key] ? sortKeys(obj[key]) : obj[key];
        return acc;
    }, {});
};

const shapeEqual = (a, b) => {
    expect(typeof a).toBe(typeof b);
    if (typeof a === 'string' && !isNaN(new Date(a))) {
        expect(+new Date(a.split('.')[0])).toEqual(+new Date(b.split('.')[0]));
        return true;
    }
    if (typeof a !== 'object') {
        expect(a).toBe(b);
        return true;
    }
    if (a === null) {
        expect(b).toBeNull();
        return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    expect(keysA.length).toBe(keysB.length);
    for (const key of keysA) {
        if (!shapeEqual(a[key], b[key])) {
            return false;
        }
    }
    return true;
};

test.describe.configure({
    mode: 'serial'
});

test.describe('project list', () => {
    test('no view', async ({ page }) => {
        await page.goto(`https://${HOST}`, { waitUntil: 'networkidle' });
        await page.evaluate(initInterface);

        const projectsV1 = sortKeys(await page.evaluate(() => wi.getProjects(config.user.id)));
        const projectsV2 = sortKeys(await page.evaluate(() => wi.with({ api: '/api/v2' }).getProjects(config.user.id)));
        expect(shapeEqual(projectsV1, projectsV2)).toBeTruthy();
    });

    test('view=profile', async ({ page }) => {
        await page.goto(`https://${HOST}`, { waitUntil: 'networkidle' });
        await page.evaluate(initInterface);

        const projectsV1 = sortKeys(await page.evaluate(() => wi.getProjects(config.user.id, 'profile')));
        const projectsV2 = sortKeys(await page.evaluate(() => wi.with({ api: '/api/v2' }).getProjects(config.user.id, 'profile')));
        expect(shapeEqual(projectsV1, projectsV2)).toBeTruthy();
    });

    test('view=store', async ({ page }) => {
        await page.goto(`https://${HOST}`, { waitUntil: 'networkidle' });
        await page.evaluate(initInterface);

        const projectsV1 = sortKeys(await page.evaluate(() => wi.getProjects(config.user.id, 'store')));
        const projectsV2 = sortKeys(await page.evaluate(() => wi.with({ api: '/api/v2' }).getProjects(config.user.id, 'store')));
        expect(shapeEqual(projectsV1, projectsV2)).toBeTruthy();
    });
});
