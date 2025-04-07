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
    await fs.promises.writeFile(`${outPath}.network.log`, '');

    const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    };
    const onResponse = (response: Response) => {
        const msgStr = `[${response.status()}] ${response.url()}`;
        fs.promises.appendFile(`${outPath}.network.log`, `${msgStr}\n`);
    };

    page.on('console', onConsole);
    page.on('response', onResponse);

    await callback(errors);

    page.removeListener('console', onConsole);
    page.removeListener('response', onResponse);

    return errors;
};
