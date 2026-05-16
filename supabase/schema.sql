-- Admin users
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'editor', -- 'superadmin' | 'editor'
  created_at timestamptz not null default now()
);

-- Categories (optional grouping)
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- Articles for sale
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null,
  stock integer not null default 0,
  status text not null default 'active', -- 'active' | 'inactive'
  category_id uuid references categories(id) on delete set null,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extra images per article (beyond the thumbnail)
create table if not exists article_images (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  status text not null default 'pending', -- 'pending' | 'paid' | 'shipped' | 'cancelled'
  total numeric(12,2) not null,
  mp_preference_id text,
  mp_payment_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order line items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  article_id uuid not null references articles(id) on delete restrict,
  quantity integer not null,
  unit_price numeric(12,2) not null
);

-- ============================================================
-- Row Level Security
-- All writes and sensitive reads go through Next.js API routes
-- using the service role key, which bypasses RLS entirely.
-- The anon key (exposed in the browser) must not access any table directly.
-- ============================================================

alter table admin_users   enable row level security;
alter table categories    enable row level security;
alter table articles      enable row level security;
alter table article_images enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;

-- Allow the public to read active articles and their images
-- (needed if you ever query Supabase directly from the browser in the future)
create policy "public can read active articles"
  on articles for select
  using (status = 'active');

create policy "public can read images of active articles"
  on article_images for select
  using (
    exists (
      select 1 from articles
      where articles.id = article_images.article_id
        and articles.status = 'active'
    )
  );

create policy "public can read categories"
  on categories for select
  using (true);

-- All other tables: no access via anon key (service role bypasses RLS)
-- admin_users, orders, order_items have no permissive policies — fully locked.

-- ============================================================
-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger articles_updated_at before update on articles
  for each row execute function set_updated_at();

create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- RPC: decrement article stock (called from webhook)
create or replace function decrement_stock(article_id uuid, amount integer)
returns void language plpgsql as $$
begin
  update articles
  set stock = greatest(0, stock - amount)
  where id = article_id;
end;
$$;
