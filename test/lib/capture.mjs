import fs from 'fs';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.outPath - The output path.
 * @param {function(string[])} options.fn - The function to run.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const capture = async ({ page, outPath, fn }) => {
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

    try {
        await fn(errors);
    } catch (error) {
        errors.push(error.message);
    }

    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');

    return errors;
};
