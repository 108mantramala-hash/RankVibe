create extension if not exists "pgcrypto";

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null,
  google_place_id text not null unique,
  avg_rating real,
  review_count integer,
  created_at timestamp with time zone not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  author text not null,
  rating integer not null,
  text text,
  published_at timestamp,
  sentiment text,
  themes jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  rating integer not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);
