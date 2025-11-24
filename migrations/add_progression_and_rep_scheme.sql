-- Migration: Add progression_rate and rep_scheme columns to user_settings
-- Date: 2025-11-24
-- Description: Support for configurable progression rates and rep schemes (531 vs 5s PRO)

-- Add progression_rate column (conservative/standard/aggressive)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS progression_rate TEXT DEFAULT 'conservative';

-- Add rep_scheme column (standard/fives_pro)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS rep_scheme TEXT DEFAULT 'standard';

-- Add comments for documentation
COMMENT ON COLUMN user_settings.progression_rate IS 'Training max progression preset: conservative (+2.5kg), standard (+5kg), or aggressive (+10kg)';
COMMENT ON COLUMN user_settings.rep_scheme IS 'Rep scheme methodology: standard (5/3/1 with AMRAP) or fives_pro (straight 5s)';
