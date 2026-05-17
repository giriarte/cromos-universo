-- Run this in Supabase SQL Editor
alter table orders
  add column if not exists expires_at timestamptz not null default now() + interval '7 days';
