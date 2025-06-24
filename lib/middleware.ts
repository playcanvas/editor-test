import { type BrowserContext } from '@playwright/test';
import Bottleneck from 'bottleneck';

const MAX_CONCURRENT = 10;
const ONE_MINUTE = 60 * 1000;
const RPM = {
    cloudfront: 480,
    nginx: 480, // 2x burst
    api: {
        normal: 120,
        strict: 5,
        assets: 120,
        post: 30,
        download: 5000
    }
};

const limiters = {
    cloudfront: new Bottleneck({
        maxConcurrent: MAX_CONCURRENT,
        reservoir: RPM.cloudfront,
        reservoirRefreshAmount: RPM.cloudfront,
        reservoirRefreshInterval: ONE_MINUTE
    }),
    nginx: new Bottleneck({
        maxConcurrent: MAX_CONCURRENT,
        reservoir: RPM.nginx,
        reservoirRefreshAmount: RPM.nginx,
        reservoirRefreshInterval: ONE_MINUTE
    }),
    api: {
        normal: new Bottleneck({
            maxConcurrent: MAX_CONCURRENT,
            reservoir: RPM.api.normal,
            reservoirRefreshAmount: RPM.api.normal,
            reservoirRefreshInterval: ONE_MINUTE
        }),
        strict: new Bottleneck({
            maxConcurrent: MAX_CONCURRENT,
            reservoir: RPM.api.strict,
            reservoirRefreshAmount: RPM.api.strict,
            reservoirRefreshInterval: ONE_MINUTE
        }),
        assets: new Bottleneck({
            maxConcurrent: MAX_CONCURRENT,
            reservoir: RPM.api.assets,
            reservoirRefreshAmount: RPM.api.assets,
            reservoirRefreshInterval: ONE_MINUTE
        }),
        post: new Bottleneck({
            maxConcurrent: MAX_CONCURRENT,
            reservoir: RPM.api.post,
            reservoirRefreshAmount: RPM.api.post,
            reservoirRefreshInterval: ONE_MINUTE
        }),
        download: new Bottleneck({
            maxConcurrent: MAX_CONCURRENT,
            reservoir: RPM.api.download * 2,
            reservoirRefreshAmount: RPM.api.download,
            reservoirRefreshInterval: ONE_MINUTE
        })
    }
};

const STRICT_ROUTES = [
    /api\/\d+\/download$/,
    /api\/projects\/upload$/,
    /api\/upload\/signed-url$/,
    /api\/upload\/start-upload$/,
    /api\/apps$/,
    /api\/apps\/download$/,
    /api\/splats$/,
    /api\/splats\/publish$/
];

const ASSET_ROUTES = [
    /api$/,
    /api\/\d+$/,
    /api\/\d+\/reimport$/
];

export const middleware = async (context: BrowserContext) => {
    await context.route(/playcanvas\.com/, (route, request) => {
        return limiters.cloudfront.schedule(() => {
            return limiters.nginx.schedule(() => route.continue());
        });
    });

    await context.route(/playcanvas\.com\/api/, (route, request) => {
        const url = new URL(request.url());
        const method = request.method();

        if (STRICT_ROUTES.some(re => re.test(url.pathname))) {
            return limiters.cloudfront.schedule(() => {
                return limiters.nginx.schedule(() => {
                    return limiters.api.strict.schedule(() => route.continue());
                });
            });
        }

        if (ASSET_ROUTES.some(re => re.test(url.pathname))) {
            return limiters.cloudfront.schedule(() => {
                return limiters.nginx.schedule(() => {
                    return limiters.api.assets.schedule(() => route.continue());
                });
            });
        }

        if (method === 'POST') {
            return limiters.cloudfront.schedule(() => {
                return limiters.nginx.schedule(() => {
                    return limiters.api.post.schedule(() => route.continue());
                });
            });
        }

        return limiters.cloudfront.schedule(() => {
            return limiters.nginx.schedule(() => {
                return limiters.api.normal.schedule(() => route.continue());
            });
        });
    });
};
