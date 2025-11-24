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

// Progression rate presets
export const PROGRESSION_PRESETS = {
  conservative: {
    name: 'Conservative',
    description: 'Slower progression, ideal for beginners or injury prevention',
    main: 2.5,
    ohp: 1.25,
  },
  standard: {
    name: 'Standard (Original 531 x 365)',
    description: 'Original program progression as written',
    main: 5.0,
    ohp: 2.5,
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Faster progression for advanced lifters',
    main: 10.0,
    ohp: 5.0,
  },
};

// ===========================================
// WEEK CONFIGURATIONS (Standard 531)
// ===========================================

export const WEEK_CONFIGS = {
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

// ===========================================
// CYCLE CONFIGURATIONS
// ===========================================

export const CYCLE_CONFIGS = {
  1: { percentage: 45, reps: 12, type: "Volume", description: "5 sets x 12 reps @ 45%" },
  2: { percentage: 75, reps: 6, type: "Intensity", description: "5 sets x 6 reps @ 75%" },
  3: { percentage: 50, reps: 11, type: "Volume", description: "5 sets x 11 reps @ 50%" },
  4: { percentage: 80, reps: 5, type: "Intensity", description: "5 sets x 5 reps @ 80%" },
  5: { percentage: 55, reps: 10, type: "Volume", description: "5 sets x 10 reps @ 55%" },
  6: { percentage: 85, reps: 4, type: "Intensity", description: "5 sets x 4 reps @ 85%" },
  7: { percentage: 60, reps: 9, type: "Volume", description: "5 sets x 9 reps @ 60%" },
  8: { percentage: 90, reps: 3, type: "Intensity", description: "5 sets x 3 reps @ 90%" },
  9: { percentage: 65, reps: 8, type: "Volume", description: "5 sets x 8 reps @ 65%" },
  10: { percentage: 95, reps: 2, type: "Intensity", description: "5 sets x 2 reps @ 95%" },
  11: { percentage: 70, reps: 7, type: "Volume", description: "5 sets x 7 reps @ 70%" },
  12: { percentage: 100, reps: 1, type: "Test Week", description: "Test maxes or TM test" }
};

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
