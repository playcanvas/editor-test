import * as fs from 'fs';

import { type Page, type ConsoleMessage, type Response } from '@playwright/test';

type CaptureOptions = {
    page: Page,
    outPath: string,
    callback: (errors: string[]) => Promise<void>,
}

/**
 * @param options - Options.
 * @param options.page - The page to navigate.
 * @param options.outPath - The output path.
 * @param options.callback - The function to run.
 * @returns - The number of errors.
 */
export const capture = async ({ page, outPath, callback }: CaptureOptions): Promise<string[]> => {
    const errors: string[] = [];

    await fs.promises.writeFile(`${outPath}.console.log`, '');
    await fs.promises.writeFile(`${outPath}.pageerror.log`, '');
    await fs.promises.writeFile(`${outPath}.request.log`, '');

    const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    };
    const onPageError = (error: Error) => {
        const msgStr = `[pageerror] ${error.message}`;
        fs.promises.appendFile(`${outPath}.pageerror.log`, `${msgStr}\n`);
    };
    const onResponse = (response: Response) => {
        const msgStr = `[${response.status()}] ${response.url()}`;
        fs.promises.appendFile(`${outPath}.request.log`, `${msgStr}\n`);
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    await callback(errors);

    page.removeListener('console', onConsole);
    page.removeListener('pageerror', onPageError);
    page.removeListener('response', onResponse);

    return errors;
};
