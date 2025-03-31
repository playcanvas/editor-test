import { type BrowserContext } from '@playwright/test';

export const middleware = async (context: BrowserContext) => {
    // FIXME: This delays the response for the PlayCanvas API.
    await context.route(/playcanvas\.com\/api/, (route, request) => {
        console.log(request.url());
        setTimeout(() => route.continue(), 1000);
    });
};
