export const middleware = (test) => {
    test.beforeEach(async ({ context }) => {
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
