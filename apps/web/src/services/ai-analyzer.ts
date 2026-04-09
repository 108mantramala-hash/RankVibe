import { openai } from '../lib/openai';

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // 0-1 confidence score
}

export interface ThemeAnalysis {
  themes: string[];
}

export interface ReviewAnalysis extends SentimentAnalysis, ThemeAnalysis {}

export interface ReplySuggestion {
  reply: string;
}

export async function analyzeSentiment(reviewText: string): Promise<SentimentAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analyze the sentiment of this review text. Return a JSON object with:
        - sentiment: "positive", "negative", or "neutral"
        - score: confidence score from 0.0 to 1.0

        Be precise and consider context. For barbershop reviews, consider service quality, staff friendliness, wait times, cleanliness, pricing, etc.`,
      },
      {
        role: 'user',
        content: reviewText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    sentiment: result.sentiment || 'neutral',
    score: Math.max(0, Math.min(1, result.score || 0.5)),
  };
}

export async function extractThemes(reviewText: string): Promise<ThemeAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extract key themes from this barbershop review. Return a JSON object with:
        - themes: array of strings representing the main topics discussed

        Common barbershop themes include: "fade quality", "haircut quality", "wait time", "friendly staff", "clean shop", "pricing", "booking ease", "atmosphere", "location", "parking", "customer service", "barber skill", "communication", "appointment management", "product quality", "hygiene", "comfort", "value for money".

        Extract 1-5 most relevant themes. Be specific and concise.`,
      },
      {
        role: 'user',
        content: reviewText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    themes: Array.isArray(result.themes) ? result.themes : [],
  };
}

export async function analyzeReview(reviewText: string): Promise<ReviewAnalysis> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Analyze this barbershop review for sentiment and themes. Return a JSON object with:
        - sentiment: "positive", "negative", or "neutral"
        - score: confidence score from 0.0 to 1.0
        - themes: array of 1-5 most relevant themes

        Common themes: "fade quality", "haircut quality", "wait time", "friendly staff", "clean shop", "pricing", "booking ease", "atmosphere", "location", "parking", "customer service", "barber skill", "communication", "appointment management", "product quality", "hygiene", "comfort", "value for money".

        Consider the overall context and be precise.`,
      },
      {
        role: 'user',
        content: reviewText,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    sentiment: result.sentiment || 'neutral',
    score: Math.max(0, Math.min(1, result.score || 0.5)),
    themes: Array.isArray(result.themes) ? result.themes : [],
  };
}

export async function generateReplySuggestion(
  reviewText: string,
  rating: number
): Promise<ReplySuggestion> {
  const tone = rating >= 4 ? 'grateful and appreciative' : 'empathetic and solution-oriented';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Generate a professional reply suggestion for this barbershop review. The reply should be:
        - Warm and professional
        - Brief (2-3 sentences maximum)
        - ${tone}
        - Address the main points raised
        - End positively when appropriate

        Return a JSON object with:
        - reply: the suggested reply text`,
      },
      {
        role: 'user',
        content: `Review (${rating} stars): ${reviewText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return {
    reply: result.reply || 'Thank you for your feedback.',
  };
}
