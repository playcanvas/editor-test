import fs from 'fs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.outPath - The output path.
 * @param {function} options.fn - The function to run.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const capture = async ({ page, outPath, fn }) => {
    const errors = [];

    await fs.promises.writeFile(`${outPath}.console.log`, '');
    await fs.promises.writeFile(`${outPath}.request.log`, '');

    const onConsole = (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    };
    const onPageError = (msg) => {
        if (msg.type() === 'error') {
            errors.push(msg.text());
        }
        const msgStr = `[${msg.type()}] ${msg.text()}`;
        fs.promises.appendFile(`${outPath}.console.log`, `${msgStr}\n`);
    };
    const onResponse = (response) => {
        const msgStr = `[${response.status()}] ${response.url()}`;
        fs.promises.appendFile(`${outPath}.request.log`, `${msgStr}\n`);
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    await fn(errors);

    page.removeListener('console', onConsole);
    page.removeListener('pageerror', onPageError);
    page.removeListener('response', onResponse);

    return errors;
};
