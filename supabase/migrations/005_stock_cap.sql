-- Cap stock and waitlist at 3 when restoring to prevent inflation bugs
CREATE OR REPLACE FUNCTION increment_stock(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles
  SET stock = LEAST(stock + amount, 3)
  WHERE id = article_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_waitlist(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles
  SET waitlist = LEAST(waitlist + amount, 3)
  WHERE id = article_id;
END;
$$;

-- Prevent stock or waitlist from going below 0 on decrement
CREATE OR REPLACE FUNCTION decrement_stock(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles
  SET stock = GREATEST(stock - amount, 0)
  WHERE id = article_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_waitlist(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles
  SET waitlist = GREATEST(waitlist - amount, 0)
  WHERE id = article_id;
END;
$$;

-- Enforce max=3 at the column level as a hard constraint
ALTER TABLE articles
  ADD CONSTRAINT stock_max_3 CHECK (stock <= 3),
  ADD CONSTRAINT waitlist_max_3 CHECK (waitlist <= 3);
