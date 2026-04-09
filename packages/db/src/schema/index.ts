import { pgTable, uuid, text, integer, real, boolean, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// ── Enums ───────────────────────────────────────────────
export const businessCategoryEnum = pgEnum('business_category', [
  'barbershop',
  'salon',
  'dentist',
  'restaurant',
  'home_services',
  'other',
]);

export const sentimentEnum = pgEnum('sentiment', ['positive', 'negative', 'neutral']);

export const replyToneEnum = pgEnum('reply_tone', ['professional', 'friendly', 'empathetic']);

// ── Phase 1: Intelligence Engine ────────────────────────

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  googlePlaceId: text('google_place_id').notNull().unique(),
  category: businessCategoryEnum('category').notNull().default('barbershop'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zip: text('zip').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  phone: text('phone'),
  website: text('website'),
  googleRating: real('google_rating'),
  googleReviewCount: integer('google_review_count'),
  avgRating: real('avg_rating'),
  reviewCount: integer('review_count'),
  isTracked: boolean('is_tracked').notNull().default(false),
  isCustomer: boolean('is_customer').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  googleReviewId: text('google_review_id').notNull().unique(),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(),
  text: text('text'),
  publishedAt: timestamp('published_at'),
  sentiment: sentimentEnum('sentiment'),
  themes: jsonb('themes').$type<string[]>(),
  summary: text('summary'),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reviewSnapshots = pgTable('review_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  avgRating: real('avg_rating').notNull(),
  reviewCount: integer('review_count').notNull(),
  reviewVelocity: real('review_velocity'),
  snapshotDate: timestamp('snapshot_date').notNull().defaultNow(),
});

export const competitorClusters = pgTable('competitor_clusters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  category: businessCategoryEnum('category').notNull(),
  businessIds: jsonb('business_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rankings = pgTable('rankings', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  clusterId: uuid('cluster_id')
    .notNull()
    .references(() => competitorClusters.id),
  avgRating: real('avg_rating').notNull(),
  reviewCount: integer('review_count').notNull(),
  reviewVelocity: real('review_velocity').notNull(),
  rankPosition: integer('rank_position').notNull(),
  snapshotDate: timestamp('snapshot_date').notNull().defaultNow(),
});

// ── Phase 2: Reputation Product ─────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  businessId: uuid('business_id').references(() => businesses.id),
  role: text('role').notNull().default('owner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reviewLinks = pgTable('review_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  slug: text('slug').notNull().unique(),
  googleReviewUrl: text('google_review_url').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  scanCount: integer('scan_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const feedbackSubmissions = pgTable('feedback_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .references(() => businesses.id),
  reviewLinkId: uuid('review_link_id').references(() => reviewLinks.id),
  rating: integer('rating').notNull(),
  message: text('message').notNull(),
  contactEmail: text('contact_email'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const aiReplies = pgTable('ai_replies', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviews.id),
  suggestedReply: text('suggested_reply').notNull(),
  tone: replyToneEnum('tone').notNull().default('professional'),
  isUsed: boolean('is_used').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
