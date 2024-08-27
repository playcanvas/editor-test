import { capture } from './capture.mjs';

/**
 * @param {object} options - Options.
 * @param {import('@playwright/test').Page} options.page - The page to navigate.
 * @param {string} options.url - The URL to navigate to.
 * @param {string} options.outPath - The output path.
 * @returns {Promise<string[]>} - The number of errors.
 */
export const navigate = ({ page, url, outPath }) => {
    return capture({
        page,
        outPath,
        fn: async () => {
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.screenshot({ path: `${outPath}.png` });
        }
    });
};
