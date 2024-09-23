import fs from 'fs';

export const middleware = (test) => {
    test.beforeEach(async ({ context }) => {
        // FIXME: This remaps the URLs for jsdoc-parser types to local files.
        await context.route(/jsdoc-parser\/types\/lib\..+\.d\.ts/, (route) => {
            const matches = /jsdoc-parser\/types\/(lib\..+\.d\.ts)/.exec(route.request().url());
            const filePath = `./test/fixtures/jsdoc-parser/types/${matches[1]}`;
            route.fulfill({
                status: 200,
                contentType: 'text/plain',
                body: fs.readFileSync(filePath, 'utf8')
            });
        });

        // FIXME: This delays the response for the PlayCanvas API.
        await context.route(/playcanvas\.com\/api/, (route, request) => {
            setTimeout(() => route.continue(), 1000);
        });

        // FIXME: This mocks the response for the PlayCanvas API tags routes (local).
        await context.route(/playcanvas\.com\/api\/tags/, (route, request) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({})
            });
        });
    });
};
