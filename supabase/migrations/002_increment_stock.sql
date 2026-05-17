-- Run this in Supabase SQL Editor
create or replace function increment_stock(article_id uuid, amount integer)
returns void language plpgsql as $$
begin
  update articles
  set stock = stock + amount
  where id = article_id;
end;
$$;
