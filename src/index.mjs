import puppeteer from 'puppeteer';

const USER_DATA_PATH = 'user_data';
const OUT_PATH = 'out';

const HOST = 'playcanvas.com';

const browser = await puppeteer.launch({ userDataDir: USER_DATA_PATH, headless: false });
const page = await browser.newPage();
page.goto(`https://${HOST}`);
