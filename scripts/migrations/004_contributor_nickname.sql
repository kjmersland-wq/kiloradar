-- Optional public nickname for the "top contributors this month" list. Anonymous submissions stay anonymous.
ALTER TABLE user_prices ADD COLUMN nickname TEXT;
