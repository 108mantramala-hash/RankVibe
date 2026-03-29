export const APP_NAME = 'RankVibe';

export const RATING_THRESHOLD = 4; // >= this sends to Google, < this captures privately

export const REVIEW_SCRAPE_DEFAULTS = {
  maxReviews: 100,
  language: 'en',
  refreshIntervalHours: 24,
};

export const SENTIMENT_LABELS = {
  positive: 'Positive',
  negative: 'Negative',
  neutral: 'Neutral',
} as const;

export const BUSINESS_CATEGORIES = [
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'salon', label: 'Salon' },
  { value: 'dentist', label: 'Dentist' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'home_services', label: 'Home Services' },
  { value: 'other', label: 'Other' },
] as const;
