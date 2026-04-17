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

// Expanded tone set — warm + playful added for barber-owner-facing replies
export const replyToneEnum = pgEnum('reply_tone', [
  'professional',
  'friendly',
  'empathetic',
  'warm',
  'playful',
]);

export const userRoleEnum = pgEnum('user_role', ['super_admin', 'shop_owner', 'barber']);

export const barberStatusEnum = pgEnum('barber_status', ['active', 'inactive', 'on_leave']);

export const employmentTypeEnum = pgEnum('employment_type', [
  'employee',
  'booth_renter',
  'contractor',
]);

export const qrPlacementEnum = pgEnum('qr_placement', [
  'register',
  'mirror',
  'waiting_area',
  'other',
]);

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
    // Shared Google Calendar ID for the shop (used to fetch appointments per barber)
    googleCalendarId: text('google_calendar_id'),
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
    // Nullable — set when customer uses a barber-specific QR code
    barberId: uuid('barber_id').references(() => barbers.id),
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
    index('reviews_barber_id_idx').on(table.barberId),
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
  // Three tiers: super_admin (you), shop_owner (barbershop), barber (Flutter app)
  role: userRoleEnum('role').notNull().default('shop_owner'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ── Barbers ──────────────────────────────────────────────
// Represents individual barbers within a shop.
// userId links to the users table so each barber can log in to the Flutter app.

export const barbers = pgTable(
  'barbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    // Optional — set when barber has been invited / created an account
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    title: text('title').notNull().default('Barber'), // e.g. "Senior Barber", "Master Barber"
    phone: text('phone'),
    email: text('email'),
    employmentType: employmentTypeEnum('employment_type').notNull().default('employee'),
    status: barberStatusEnum('status').notNull().default('active'),
    specialties: jsonb('specialties').$type<string[]>(),
    bio: text('bio'),
    color: text('color'), // UI color swatch for identification
    avatarUrl: text('avatar_url'),
    knownAs: text('known_as'), // Short name / nickname used on QR codes (e.g. "Marc", "MJ")
    experienceYears: integer('experience_years'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('barbers_business_id_idx').on(table.businessId),
    index('barbers_user_id_idx').on(table.userId),
    index('barbers_status_idx').on(table.status),
    uniqueIndex('barbers_email_idx').on(table.email),
  ]
);

// ── Barber Schedules ─────────────────────────────────────
// One row per barber per day of week (0=Sun … 6=Sat).

export const barberSchedules = pgTable(
  'barber_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    barberId: uuid('barber_id')
      .notNull()
      .references(() => barbers.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 6 = Saturday
    startTime: text('start_time'), // "09:00"
    endTime: text('end_time'),     // "18:00"
    isOff: boolean('is_off').notNull().default(false),
  },
  (table) => [
    index('schedules_barber_id_idx').on(table.barberId),
    uniqueIndex('schedules_barber_day_idx').on(table.barberId, table.dayOfWeek),
  ]
);

// ── Review Links (QR Codes) ──────────────────────────────

export const reviewLinks = pgTable(
  'review_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    // Nullable — barber-specific QR codes link to one barber
    barberId: uuid('barber_id').references(() => barbers.id),
    slug: text('slug').notNull().unique(),
    name: text('name'), // Display name: "Front Desk QR", "Marcus – Mirror QR"
    placement: qrPlacementEnum('placement'), // Where the QR is physically located
    googleReviewUrl: text('google_review_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    scanCount: integer('scan_count').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('review_links_slug_idx').on(table.slug),
    index('review_links_business_id_idx').on(table.businessId),
    index('review_links_barber_id_idx').on(table.barberId),
  ]
);

export const feedbackSubmissions = pgTable(
  'feedback_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id),
    barberId: uuid('barber_id').references(() => barbers.id),
    reviewLinkId: uuid('review_link_id').references(() => reviewLinks.id),
    rating: integer('rating').notNull(),
    message: text('message').notNull(),
    contactEmail: text('contact_email'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('feedback_business_id_idx').on(table.businessId),
    index('feedback_barber_id_idx').on(table.barberId),
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
    // Owner approval workflow
    isApproved: boolean('is_approved').notNull().default(false),
    isPosted: boolean('is_posted').notNull().default(false),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('ai_replies_review_id_idx').on(table.reviewId),
  ]
);

// ── Notification Settings ────────────────────────────────
// Per-user notification preferences (one row per user).

export const notificationSettings = pgTable('notification_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  newReviewAlert: boolean('new_review_alert').notNull().default(true),
  negativeReviewAlert: boolean('negative_review_alert').notNull().default(true),
  weeklyReport: boolean('weekly_report').notNull().default(true),
  competitorAlert: boolean('competitor_alert').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── AI Settings ──────────────────────────────────────────
// Per-business AI reply configuration (one row per business).

export const aiSettings = pgTable('ai_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  defaultTone: replyToneEnum('default_tone').notNull().default('professional'),
  autoDraft: boolean('auto_draft').notNull().default(true),
  includeEmoji: boolean('include_emoji').notNull().default(false),
  shopSignature: text('shop_signature'), // e.g. "— The team at FreshCuts"
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Google Business Profile Connection ───────────────────
// Stores OAuth tokens per business so we can post replies
// and sync reviews directly via the Google Business Profile API.

export const googleConnections = pgTable('google_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id')
    .notNull()
    .unique()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  googleAccountId: text('google_account_id'),    // Google account ID (accounts/{id})
  googleLocationId: text('google_location_id'),  // Location resource name (accounts/{id}/locations/{id})
  googleLocationName: text('google_location_name'), // Human-readable location name
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  connectedAt: timestamp('connected_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
