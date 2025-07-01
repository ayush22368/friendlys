
-- Add telegram_username column to companions table
ALTER TABLE public.companions 
ADD COLUMN telegram_username TEXT;
