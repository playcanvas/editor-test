import fs from 'fs';

export const middleware = (test) => {
    // FIXME: This is a workaround for the JSDoc parser rate limiting.
    test.beforeEach(async ({ context }) => {
        await context.route(/jsdoc-parser\/types\/lib\..+\.d\.ts/, (route) => {
            const matches = /jsdoc-parser\/types\/(lib\..+\.d\.ts)/.exec(route.request().url());
            const filePath = `./test/fixtures/jsdoc-parser/types/${matches[1]}`;
            route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: fs.readFileSync(filePath, 'utf8')
            });
        });

        await context.route(/playcanvas\.com\/api/, (route, request) => {
            setTimeout(() => route.continue(), 1000);
        });
    });
};
