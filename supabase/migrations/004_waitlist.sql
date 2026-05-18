-- Waitlist slots per article (default 3)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS waitlist integer NOT NULL DEFAULT 3;

-- Flag waitlist order items so cancellation restores the right counter
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_waitlist boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION decrement_waitlist(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles SET waitlist = waitlist - amount WHERE id = article_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_waitlist(article_id uuid, amount integer)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE articles SET waitlist = waitlist + amount WHERE id = article_id;
END;
$$;
