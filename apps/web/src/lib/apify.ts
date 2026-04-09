import { ApifyClient } from 'apify-client';
import { getEnv } from '@rankvibe/config';

const apifyToken = getEnv('APIFY_API_TOKEN');

export const apifyClient = new ApifyClient({ token: apifyToken });
