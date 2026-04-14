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
  barber_id?: string; // set when review came through a barber-specific QR
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
  review_velocity: number;
  rank_position: number;
  snapshot_date: string;
}

// ── Phase 2: Users & Roles ──────────────────────────────
export type UserRole = 'super_admin' | 'shop_owner' | 'barber';

export interface User {
  id: string;
  email: string;
  business_id?: string;
  role: UserRole;
  created_at: string;
}

// ── Barbers ─────────────────────────────────────────────
export type BarberStatus = 'active' | 'inactive' | 'on_leave';
export type EmploymentType = 'employee' | 'booth_renter' | 'contractor';

export interface Barber {
  id: string;
  business_id: string;
  user_id?: string; // linked user account for Flutter app login
  name: string;
  title: string; // "Barber", "Senior Barber", "Master Barber"
  phone?: string;
  email?: string;
  employment_type: EmploymentType;
  status: BarberStatus;
  specialties?: string[];
  bio?: string;
  color?: string; // UI color swatch
  avatar_url?: string;
  experience_years?: number;
  created_at: string;
  updated_at: string;
}

export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time?: string; // "09:00"
  end_time?: string;   // "18:00"
  is_off: boolean;
}

// ── Review Links (QR Codes) ──────────────────────────────
export type QrPlacement = 'register' | 'mirror' | 'waiting_area' | 'other';

export interface ReviewLink {
  id: string;
  business_id: string;
  barber_id?: string; // barber-specific QR
  slug: string;
  name?: string;       // "Front Desk QR", "Marcus – Mirror QR"
  placement?: QrPlacement;
  google_review_url: string;
  is_active: boolean;
  scan_count: number;
  created_at: string;
}

// ── Feedback Submissions ─────────────────────────────────
export interface FeedbackSubmission {
  id: string;
  business_id: string;
  barber_id?: string;
  review_link_id: string;
  rating: number;
  message: string;
  contact_email?: string;
  created_at: string;
}

// ── AI Replies ───────────────────────────────────────────
export type ReplyTone = 'professional' | 'friendly' | 'empathetic' | 'warm' | 'playful';

export interface AIReply {
  id: string;
  review_id: string;
  suggested_reply: string;
  tone: ReplyTone;
  is_used: boolean;
  is_approved: boolean;
  is_posted: boolean;
  approved_at?: string;
  created_at: string;
}

// ── Settings ─────────────────────────────────────────────
export interface NotificationSettings {
  id: string;
  user_id: string;
  new_review_alert: boolean;
  negative_review_alert: boolean;
  weekly_report: boolean;
  competitor_alert: boolean;
  updated_at: string;
}

export interface AISettings {
  id: string;
  business_id: string;
  default_tone: ReplyTone;
  auto_draft: boolean;
  include_emoji: boolean;
  shop_signature?: string;
  updated_at: string;
}

// ── Dashboard Metrics ───────────────────────────────────
export interface DashboardMetrics {
  current_rating: number;
  total_reviews: number;
  reviews_this_month: number;
  rating_trend: number;
  sentiment_breakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  top_themes: Array<{ theme: string; count: number; sentiment: Sentiment }>;
  competitor_rank: number;
  competitor_total: number;
}

// ── Barber Stats (for Flutter app + owner dashboard) ────
export interface BarberStats {
  barber_id: string;
  total_reviews: number;
  avg_rating: number;
  positive_count: number;
  negative_count: number;
  qr_scans: number;
}
