import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

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

export const businesses = pgTable(
  'businesses',
  {
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
    isTracked: boolean('is_tracked').notNull().default(false),
    isCustomer: boolean('is_customer').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('businesses_google_place_id_idx').on(table.googlePlaceId),
    index('businesses_city_idx').on(table.city),
    index('businesses_category_idx').on(table.category),
    index('businesses_is_customer_idx').on(table.isCustomer),
  ]
);

export const reviews = pgTable(
  'reviews',
  {
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
  },
  (table) => [
    uniqueIndex('reviews_google_review_id_idx').on(table.googleReviewId),
    index('reviews_business_id_idx').on(table.businessId),
    index('reviews_sentiment_idx').on(table.sentiment),
    index('reviews_rating_idx').on(table.rating),
    index('reviews_published_at_idx').on(table.publishedAt),
    index('reviews_business_sentiment_idx').on(table.businessId, table.sentiment),
  ]
);

export const reviewSnapshots = pgTable(
  'review_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    avgRating: real('avg_rating').notNull(),
    reviewCount: integer('review_count').notNull(),
    reviewVelocity: real('review_velocity'),
    positiveCount: integer('positive_count').notNull().default(0),
    negativeCount: integer('negative_count').notNull().default(0),
    neutralCount: integer('neutral_count').notNull().default(0),
    topThemes: jsonb('top_themes').$type<string[]>(),
    snapshotDate: timestamp('snapshot_date').notNull().defaultNow(),
  },
  (table) => [
    index('snapshots_business_id_idx').on(table.businessId),
    index('snapshots_snapshot_date_idx').on(table.snapshotDate),
    index('snapshots_business_date_idx').on(table.businessId, table.snapshotDate),
  ]
);

export const competitorClusters = pgTable('competitor_clusters', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  category: businessCategoryEnum('category').notNull(),
  businessIds: jsonb('business_ids').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rankings = pgTable(
  'rankings',
  {
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
  },
  (table) => [
    index('rankings_business_id_idx').on(table.businessId),
    index('rankings_cluster_id_idx').on(table.clusterId),
    index('rankings_snapshot_date_idx').on(table.snapshotDate),
  ]
);

// ── Phase 2: Reputation Product ─────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  businessId: uuid('business_id').references(() => businesses.id),
  role: text('role').notNull().default('owner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reviewLinks = pgTable(
  'review_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    slug: text('slug').notNull().unique(),
    googleReviewUrl: text('google_review_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    scanCount: integer('scan_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('review_links_slug_idx').on(table.slug),
    index('review_links_business_id_idx').on(table.businessId),
  ]
);

export const feedbackSubmissions = pgTable(
  'feedback_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    reviewLinkId: uuid('review_link_id').references(() => reviewLinks.id),
    rating: integer('rating').notNull(),
    message: text('message').notNull(),
    contactEmail: text('contact_email'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('feedback_business_id_idx').on(table.businessId),
    index('feedback_created_at_idx').on(table.createdAt),
  ]
);

export const aiReplies = pgTable(
  'ai_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reviewId: uuid('review_id')
      .notNull()
      .references(() => reviews.id),
    suggestedReply: text('suggested_reply').notNull(),
    tone: replyToneEnum('tone').notNull().default('professional'),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('ai_replies_review_id_idx').on(table.reviewId),
  ]
);
