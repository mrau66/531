-- Migration: Add bar_weight column to user_settings
-- Date: 2025-11-25
-- Description: Support for configurable bar weight in plate calculator

-- Add bar_weight column (numeric, default 20kg)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS bar_weight NUMERIC DEFAULT 20;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.bar_weight IS 'Barbell weight in kg (20kg standard Olympic, 15kg women''s, or custom)';
