/**
 * @param {puppeteer.Page} page - The puppeteer page.
 * @returns {Promise<Function>} - The throttle function.
 */
export const throttler = async (page) => {
    await page.setRequestInterception(true);
    let requests = 0;

    page.on('request', (request) => {
        // TODO: This is a hack to prevent the requests from being throttled.
        if (/jsdoc-parser\/types\/lib\..+\.d\.ts/.test(request.url())) {
            return;
        }
        if (/playcanvas\.com/.test(request.url())) {
            requests++;
            request.continue();
            return;
        }
        request.continue();
    });

    return async (limit = 240, refreshRate = 60 * 1000) => {
        if (requests > limit) {
            console.log(`        waiting for requests to cool down ${requests}/${limit}`);
            await new Promise((resolve) => {
                setTimeout(() => {
                    requests = 0;
                    resolve();
                }, refreshRate);
            });
        }
    };
};
