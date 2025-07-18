import { nativeAuth } from '../lib/auth';
import { EMAIL, PASSWORD, AUTH_STATE } from '../lib/config';

const HEADLESS = !process.argv.includes('--show');

await nativeAuth(AUTH_STATE, EMAIL, PASSWORD, HEADLESS);
