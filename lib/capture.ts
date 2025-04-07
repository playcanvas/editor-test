import * as fs from 'fs';

import { type Page, type ConsoleMessage, type Response } from '@playwright/test';

type CaptureOptions = {
    page: Page,
    name: string,
    callback: (errors: string[]) => Promise<void>,
}

const LOG_FILE = 'out/tests.log';
const BAR = Array(5).fill('=').join('');

await fs.promises.mkdir('out', { recursive: true });
await fs.promises.writeFile(LOG_FILE, '');

const header = (name: string) => {
    return `${BAR} BEGIN (${name}) ${BAR}\n`;
};

const footer = (name: string) => {
    return `${BAR} END (${name}) ${BAR}\n`;
};

/**
 * @param options - Options.
 * @param options.name - The name of the test.
 * @param options.page - The page to navigate.
 * @param options.callback - The function to run.
 * @returns - The number of errors.
 */
export const capture = async ({ name, page, callback }: CaptureOptions): Promise<string[]> => {
    const errors: string[] = [];

    const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(LOG_FILE, `${msgStr}\n`);
    };
    const onPageError = (error: Error) => {
        errors.push(error.message);
        const msgStr = `[pageerror] ${error.message}`;
        fs.promises.appendFile(LOG_FILE, `${msgStr}\n`);
    };
    const onResponse = (response: Response) => {
        const msgStr = `[http] ${response.status()} ${response.url()}`;
        fs.promises.appendFile(LOG_FILE, `${msgStr}\n`);
    };

    fs.promises.appendFile(LOG_FILE, header(name));

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    await callback(errors);

    page.removeListener('console', onConsole);
    page.removeListener('pageerror', onPageError);
    page.removeListener('response', onResponse);

    fs.promises.appendFile(LOG_FILE, footer(name));

    return errors;
};
