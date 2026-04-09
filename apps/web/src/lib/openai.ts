import OpenAI from 'openai';
import { getEnv } from '@rankvibe/config';

const openaiApiKey = getEnv('OPENAI_API_KEY');

export const openai = new OpenAI({
  apiKey: openaiApiKey,
});
