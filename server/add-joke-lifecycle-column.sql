-- Run this in Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run

ALTER TABLE jokes
  ADD COLUMN IF NOT EXISTS lifecycle TEXT DEFAULT 'new';
