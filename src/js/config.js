/**
 * Application Configuration - Constants and Magic Numbers
 *
 * PURPOSE:
 * Centralized configuration for timing, colors, and other constants.
 * Makes it easy to adjust behavior without hunting through code.
 *
 * USAGE:
 * import { TIMING, COLORS, PROGRESSION } from './config.js';
 * setTimeout(() => callback(), TIMING.SYNC_FEEDBACK_DELAY);
 */

// ===========================================
// TIMING CONSTANTS (milliseconds)
// ===========================================

export const TIMING = {
  // Debounce delays
  DEBOUNCE_SAVE: 1000,          // Session save debounce
  DEBOUNCE_RELOAD: 200,         // Cycle settings reload debounce

  // UI feedback
  DOUBLE_CLICK_PREVENTION: 500, // Prevent double processing
  ANIMATION_DURATION: 150,      // Visual feedback tap animation
  SYNC_FEEDBACK_DELAY: 2000,    // How long to show sync success/error
  SAVE_FEEDBACK_DELAY: 2000,    // How long to show save feedback

  // Haptic feedback
  HAPTIC_FEEDBACK: 30,          // Vibration duration in ms

  // Polling and waits
  WAIT_INTERVAL: 100,           // Polling interval for waitFor functions
  WAIT_RENDER: 200,             // Wait for DOM render
  STATE_STORE_TIMEOUT: 5000,    // Max wait for state store ready
  STATE_STORE_MAX_RETRIES: 50,  // Max retries waiting for state store
  AUTH_MANAGER_MAX_RETRIES: 30, // Max retries waiting for auth manager

  // Transitions
  LOADING_TRANSITION: 500,      // Opacity transition for loading states
};

// ===========================================
// COLOR CONSTANTS
// ===========================================

export const COLORS = {
  // Completion states
  COMPLETED_BG: '#d4edda',
  COMPLETED_BORDER: '#006400',
  COMPLETED_TEXT: '#006400',

  // Selection count indicators
  COUNT_NONE: '#6c757d',        // 0 selected
  COUNT_FEW: '#ffc107',         // 1-2 selected
  COUNT_GOOD: 'var(--primary-color)', // 3-4 selected
  COUNT_EXCELLENT: 'var(--success-color)', // 5+ selected

  // Sync button gradients
  SYNC_PRIMARY: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
  SYNC_PRIMARY_HOVER: 'linear-gradient(135deg, #0056b3 0%, #004085 100%)',
  SYNC_DISABLED: '#6c757d',
  SYNC_OFFLINE: 'linear-gradient(135deg, #6c757d 0%, #545b62 100%)',
  SYNC_PENDING: 'linear-gradient(135deg, #ffc107 0%, #e0a800 100%)',
  SYNC_SYNCING: 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
  SYNC_SUCCESS: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
  SYNC_ERROR: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
};

// ===========================================
// TRAINING MAX PROGRESSION
// ===========================================

export const PROGRESSION = {
  // Weight increments per cycle (default: conservative)
  MAIN_LIFTS: 2.5,   // Squat, Bench, Deadlift
  OHP: 1.25,          // Overhead Press

  // Lift categories
  MAIN_LIFT_TYPES: ['squat', 'bench', 'deadlift'],
  OHP_TYPE: 'ohp',
};

// Progression rate presets (all values in kg)
export const PROGRESSION_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Slower progression (+2.5 kg / +1.25 kg OHP), ideal for beginners or injury prevention',
    main: 2.5,
    ohp: 1.25,
  },
  standard: {
    name: 'Standard (Original 531 x 365)',
    description: 'Original program progression (+5 kg / +2.5 kg OHP) as written',
    main: 5.0,
    ohp: 2.5,
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Faster progression (+10 kg / +5 kg OHP) for advanced lifters',
    main: 10.0,
    ohp: 5.0,
  },
};

// ===========================================
// WEEK CONFIGURATIONS (Standard 531)
// ===========================================

// Standard 531 - Traditional with AMRAP sets
export const WEEK_CONFIGS_STANDARD = {
  1: [
    { percentage: 65, reps: 5, isAmrap: false },
    { percentage: 75, reps: 5, isAmrap: false },
    { percentage: 85, reps: 5, isAmrap: true }  // 5+ AMRAP set
  ],
  2: [
    { percentage: 70, reps: 3, isAmrap: false },
    { percentage: 80, reps: 3, isAmrap: false },
    { percentage: 90, reps: 3, isAmrap: true }  // 3+ AMRAP set
  ],
  3: [
    { percentage: 75, reps: 5, isAmrap: false },
    { percentage: 85, reps: 3, isAmrap: false },
    { percentage: 95, reps: 1, isAmrap: true }  // 1+ AMRAP set
  ]
};

// 5s PRO - Straight sets of 5 (no AMRAP)
export const WEEK_CONFIGS_5S_PRO = {
  1: [
    { percentage: 65, reps: 5, isAmrap: false },
    { percentage: 75, reps: 5, isAmrap: false },
    { percentage: 85, reps: 5, isAmrap: false }  // Straight 5 reps
  ],
  2: [
    { percentage: 70, reps: 5, isAmrap: false },
    { percentage: 80, reps: 5, isAmrap: false },
    { percentage: 90, reps: 5, isAmrap: false }  // Straight 5 reps
  ],
  3: [
    { percentage: 75, reps: 5, isAmrap: false },
    { percentage: 85, reps: 5, isAmrap: false },
    { percentage: 95, reps: 5, isAmrap: false }  // Straight 5 reps
  ]
};

// Default to standard 531 for backward compatibility
export const WEEK_CONFIGS = WEEK_CONFIGS_STANDARD;

// Rep scheme presets
export const REP_SCHEME_PRESETS = {
  standard: {
    name: 'Standard 531 (5/3/1)',
    description: 'Traditional 531 with AMRAP sets on the final set each week',
    configs: WEEK_CONFIGS_STANDARD,
  },
  fives_pro: {
    name: '5s PRO',
    description: 'Straight sets of 5 reps at prescribed percentages (no AMRAP)',
    configs: WEEK_CONFIGS_5S_PRO,
  },
};

// ===========================================
// SUPPLEMENTAL WORK TEMPLATES
// ===========================================

// 531 x 365 - Original 12-cycle program
export const TEMPLATE_531x365 = {
  1: { percentage: 45, reps: 12, sets: 5, type: "Volume", description: "5×12 @ 45%" },
  2: { percentage: 75, reps: 6, sets: 5, type: "Intensity", description: "5×6 @ 75%" },
  3: { percentage: 50, reps: 11, sets: 5, type: "Volume", description: "5×11 @ 50%" },
  4: { percentage: 80, reps: 5, sets: 5, type: "Intensity", description: "5×5 @ 80%" },
  5: { percentage: 55, reps: 10, sets: 5, type: "Volume", description: "5×10 @ 55%" },
  6: { percentage: 85, reps: 4, sets: 5, type: "Intensity", description: "5×4 @ 85%" },
  7: { percentage: 60, reps: 9, sets: 5, type: "Volume", description: "5×9 @ 60%" },
  8: { percentage: 90, reps: 3, sets: 5, type: "Intensity", description: "5×3 @ 90%" },
  9: { percentage: 65, reps: 8, sets: 5, type: "Volume", description: "5×8 @ 65%" },
  10: { percentage: 95, reps: 2, sets: 5, type: "Intensity", description: "5×2 @ 95%" },
  11: { percentage: 70, reps: 7, sets: 5, type: "Volume", description: "5×7 @ 70%" },
  12: { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }
};

// BBB (Boring But Big) - Hypertrophy focused
export const TEMPLATE_BBB = {
  get 1() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 2() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 3() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 4() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 5() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 6() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 7() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 8() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 9() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 10() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 11() { return { percentage: 50, reps: 10, sets: 5, type: "BBB", description: "5×10 @ 50% TM" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// FSL (First Set Last) - 5×5 @ first set percentage
export const TEMPLATE_FSL = {
  get 1() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 2() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 3() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 4() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 5() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 6() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 7() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 8() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 9() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 10() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 11() { return { percentage: 65, reps: 5, sets: 5, type: "FSL", description: "5×5 @ 65% (FSL)" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// SSL (Second Set Last) - 5×5 @ second set percentage
export const TEMPLATE_SSL = {
  get 1() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 2() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 3() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 4() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 5() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 6() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 7() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 8() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 9() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 10() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 11() { return { percentage: 75, reps: 5, sets: 5, type: "SSL", description: "5×5 @ 75% (SSL)" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// FSL AMRAP - FSL with last set AMRAP
export const TEMPLATE_FSL_AMRAP = {
  get 1() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 2() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 3() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 4() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 5() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 6() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 7() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 8() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 9() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 10() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 11() { return { percentage: 65, reps: 5, sets: 5, isLastSetAmrap: true, type: "FSL+", description: "5×5 @ 65% (last set AMRAP)" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// BBB Beefcake - Higher volume BBB
export const TEMPLATE_BBB_BEEFCAKE = {
  get 1() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 2() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 3() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 4() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 5() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 6() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 7() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 8() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 9() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 10() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 11() { return { percentage: 60, reps: 10, sets: 5, type: "BBB+", description: "5×10 @ 60% TM" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// Simplest Strength - Minimal supplemental
export const TEMPLATE_SIMPLEST = {
  get 1() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 2() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 3() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 4() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 5() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 6() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 7() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 8() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 9() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 10() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 11() { return { percentage: 65, reps: 5, sets: 3, type: "Simplest", description: "3×5 @ 65% (FSL)" }; },
  get 12() { return { percentage: 100, reps: 1, sets: 1, type: "Test Week", description: "Test maxes or TM test" }; }
};

// Template presets
export const SUPPLEMENTAL_TEMPLATES = {
  '531x365': {
    name: '531 x 365 (Original)',
    description: '12 cycles alternating Volume/Intensity phases - year-long progression',
    config: TEMPLATE_531x365,
  },
  'bbb': {
    name: 'BBB (Boring But Big)',
    description: '5×10 @ 50% TM - classic hypertrophy template',
    config: TEMPLATE_BBB,
  },
  'fsl': {
    name: 'FSL (First Set Last)',
    description: '5×5 @ 65% TM - balanced volume and intensity',
    config: TEMPLATE_FSL,
  },
  'ssl': {
    name: 'SSL (Second Set Last)',
    description: '5×5 @ 75% TM - higher intensity supplemental work',
    config: TEMPLATE_SSL,
  },
  'fsl_amrap': {
    name: 'FSL AMRAP',
    description: '5×5 @ 65% with last set AMRAP - push for volume PR',
    config: TEMPLATE_FSL_AMRAP,
  },
  'bbb_beefcake': {
    name: 'BBB Beefcake',
    description: '5×10 @ 60% TM - high volume mass building',
    config: TEMPLATE_BBB_BEEFCAKE,
  },
  'simplest': {
    name: 'Simplest Strength',
    description: '3×5 @ 65% - minimal effective supplemental work',
    config: TEMPLATE_SIMPLEST,
  },
};

// Default config for backward compatibility
export const CYCLE_CONFIGS = TEMPLATE_531x365;

// ===========================================
// DEFAULT ACCESSORIES
// ===========================================

export const DEFAULT_ACCESSORIES = {
  squat: [
    "Bulgarian Split Squats - 3x8-12 each leg",
    "Jump Squats - 3x8-10",
  ],
  bench: [
    "Push-ups (various grips) - 3x8-15",
    "Tricep Dips - 3x8-12"
  ],
  deadlift: [
    "Single-leg Romanian Deadlifts - 3x8-10 each",
    "Glute Bridges - 3x12-15",
  ],
  ohp: [
    "Pike Push-ups - 3x5-10",
    "Push-ups - 3x10-15"
  ],
};

// ===========================================
// UI TEXT CONSTANTS
// ===========================================

export const UI_TEXT = {
  // Sync button states
  SYNC_READY: 'Ready',
  SYNC_OFFLINE: 'Offline',
  SYNC_CHANGES_READY: 'Changes ready',
  SYNC_IN_SYNC: 'In sync',
  SYNC_SYNCING: 'Syncing...',
  SYNC_SYNCED: 'Synced!',
  SYNC_ERROR: 'Error',

  // Sync button icons
  ICON_CLOUD: '☁️',
  ICON_OFFLINE: '🔴',
  ICON_PENDING: '🟡',
  ICON_SYNCING: '🔄',
  ICON_SUCCESS: '✅',
  ICON_ERROR: '❌',

  // Save button states
  SAVE_DEFAULT: 'Save',
  SAVE_SAVING: 'Saving...',
  SAVE_SAVED: 'Saved!',
  SAVE_FAILED: 'Failed',

  // Save button icons
  SAVE_ICON_DEFAULT: '💾',
  SAVE_ICON_SAVING: '⏳',
  SAVE_ICON_SUCCESS: '✅',
  SAVE_ICON_ERROR: '❌',

  // Progress text
  NO_EXERCISES: 'No exercises',
};

// ===========================================
// ROUTE PATTERNS
// ===========================================

export const ROUTES = {
  LOGIN: '/login/',
  ROOT: '/',
  APP: '/app/',
  APP_PREFIX: '/app',

  // Lift pages
  SQUAT: '/squat/',
  BENCH: '/bench/',
  DEADLIFT: '/deadlift/',
  OHP: '/ohp/',
};

// ===========================================
// LOCAL STORAGE KEYS
// ===========================================

export const STORAGE_KEYS = {
  UNIFIED_STATE: '531_unified_state',
  DEBUG: 'debug',
};

// ===========================================
// DATABASE TABLES
// ===========================================

export const DB_TABLES = {
  TRAINING_MAXES: 'training_maxes',
  CYCLE_PROGRESS: 'cycle_progress',
  WORKOUT_SESSIONS: 'workout_sessions',
  USER_SETTINGS: 'user_settings',
};

// ===========================================
// ERROR CODES
// ===========================================

export const ERROR_CODES = {
  POSTGRES_NOT_FOUND: 'PGRST116', // PostgreSQL "not found" error
};
