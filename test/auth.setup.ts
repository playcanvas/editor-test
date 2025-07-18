import * as fs from 'fs';

import { test as setup } from '@playwright/test';

import { nativeAuth } from '../lib/auth';
import { EMAIL, PASSWORD, HOST, AUTH_STATE } from '../lib/config';
import { middleware } from '../lib/middleware';

const SESSION_EXISTS = fs.existsSync(AUTH_STATE);

if (SESSION_EXISTS) {
    setup.use({
        storageState: AUTH_STATE
    });
}

setup('authenticate user', async ({ page }) => {
    await middleware(page.context());
    if (SESSION_EXISTS) {
        await page.goto(`https://${HOST}/editor`, { waitUntil: 'networkidle' });
        const title = await page.title();
        if (/Editor/.test(title)) {
            setup.skip(true, 'already authenticated');
            return;
        }
    }

    await nativeAuth(AUTH_STATE, EMAIL, PASSWORD);
});
