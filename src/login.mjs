import puppeteer from 'puppeteer';

const USER_DATA_PATH = 'user_data';

const HOST = process.env.PC_HOST ?? 'playcanvas.com';

const browser = await puppeteer.launch({
    userDataDir: USER_DATA_PATH,
    headless: false
});
const page = (await browser.pages())[0];
await page.setViewport({ width: 1270, height: 720 });

await page.goto(`https://${HOST}`);
