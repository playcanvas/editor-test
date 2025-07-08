import { nativeAuth } from '../lib/auth';
import { EMAIL, PASSWORD, AUTH_STATE } from '../lib/config';

await nativeAuth(AUTH_STATE, EMAIL, PASSWORD);
