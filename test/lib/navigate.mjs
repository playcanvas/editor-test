import fs from 'fs';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.url - The URL to navigate to.
 * @param {string} options.outPath - The output path.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const navigate = async ({ page, url, outPath }) => {
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
