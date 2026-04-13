CREATE OR REPLACE FUNCTION next_order_number(prefix text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  today_date date := CURRENT_DATE;
  seq_val bigint;
BEGIN
  INSERT INTO daily_counters(prefix, counter_date, counter)
  VALUES (prefix, today_date, 1)
  ON CONFLICT (prefix, counter_date)
  DO UPDATE SET counter = daily_counters.counter + 1
  RETURNING counter INTO seq_val;

  RETURN prefix || to_char(today_date, 'YYMMDD') || lpad(seq_val::text, 5, '0');
END;
$$;
