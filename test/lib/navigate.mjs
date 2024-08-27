import { capture } from './capture.mjs';

/**
 * @param {object} options - Options.
 * @param {puppeteer.Page} options.page - The puppeteer page.
 * @param {string} options.url - The URL to navigate to.
 * @param {string} options.outPath - The output path.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const navigate = ({ page, url, outPath }) => {
    return capture({
        page,
        outPath,
        fn: async () => {
            await page.goto(url, { waitUntil: 'networkidle0' });
            await page.screenshot({ path: `${outPath}.png` });
        }
    });
};
