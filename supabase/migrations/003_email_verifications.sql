create table if not exists email_verifications (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null,
  code       text        not null,
  expires_at timestamptz not null,
  used       boolean     not null default false,
  created_at timestamptz not null default now()
);
alter table email_verifications   enable row level security;

create index if not exists email_verifications_email_idx on email_verifications(email);
