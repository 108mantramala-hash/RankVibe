// ── Business ────────────────────────────────────────────
export interface Business {
  id: string;
  name: string;
  google_place_id: string;
  category: BusinessCategory;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  google_rating?: number;
  google_review_count?: number;
  is_tracked: boolean;
  is_customer: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessCategory =
  | 'barbershop'
  | 'salon'
  | 'dentist'
  | 'restaurant'
  | 'home_services'
  | 'other';

// ── Reviews ─────────────────────────────────────────────
export interface Review {
  id: string;
  business_id: string;
  google_review_id: string;
  author_name: string;
  rating: number;
  text: string;
  published_at: string;
  sentiment?: Sentiment;
  themes?: string[];
  summary?: string;
  created_at: string;
}

export type Sentiment = 'positive' | 'negative' | 'neutral';

// ── Competitor Intelligence ─────────────────────────────
export interface CompetitorCluster {
  id: string;
  name: string;
  city: string;
  category: BusinessCategory;
  business_ids: string[];
  created_at: string;
}

export interface RankingSnapshot {
  id: string;
  business_id: string;
  cluster_id: string;
  avg_rating: number;
  review_count: number;
  review_velocity: number; // reviews per month
  rank_position: number;
  snapshot_date: string;
}

// ── Phase 2: Product ────────────────────────────────────
export interface ReviewLink {
  id: string;
  business_id: string;
  slug: string;
  google_review_url: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
}

export interface FeedbackSubmission {
  id: string;
  business_id: string;
  review_link_id: string;
  rating: number;
  message: string;
  contact_email?: string;
  created_at: string;
}

export interface AIReply {
  id: string;
  review_id: string;
  suggested_reply: string;
  tone: 'professional' | 'friendly' | 'empathetic';
  is_used: boolean;
  created_at: string;
}

// ── Dashboard Metrics ───────────────────────────────────
export interface DashboardMetrics {
  current_rating: number;
  total_reviews: number;
  reviews_this_month: number;
  rating_trend: number; // +/- change
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  top_themes: Array<{ theme: string; count: number; sentiment: Sentiment }>;
  competitor_rank: number;
  competitor_total: number;
}
