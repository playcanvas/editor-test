import * as fs from 'fs';

import { test as setup } from '@playwright/test';

import { googleAuth } from '../lib/auth';
import { GMAIL, PASSWORD, HOST, AUTH_STATE } from '../lib/config';

const SESSION_EXISTS = fs.existsSync(AUTH_STATE);

if (SESSION_EXISTS) {
    setup.use({
        storageState: AUTH_STATE
    });
}

setup('authenticate user', async ({ page }) => {
    if (SESSION_EXISTS) {
        await page.goto(`https://${HOST}/editor`);
        const title = await page.title();
        if (/Editor/.test(title)) {
            setup.skip();
            return;
        }
    }

    await googleAuth(AUTH_STATE, GMAIL, PASSWORD);
});
