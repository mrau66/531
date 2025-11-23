/**
 * DOM Selectors - Centralized DOM Query Selectors
 *
 * PURPOSE:
 * Single source of truth for all DOM selectors used across the application.
 * Prevents typos, makes updates easier, and improves maintainability.
 *
 * USAGE:
 * import { SELECTORS, IDS, CLASSES } from './dom-selectors.js';
 * const element = e.target.closest(SELECTORS.SET_ROW);
 * const progressEl = document.getElementById(IDS.progress(liftType));
 */

// ===========================================
// CLASS SELECTORS
// ===========================================

export const SELECTORS = {
  // Workout elements
  SET_ROW: '.set-row',
  ACCESSORY_ITEM: '.accessory-item',
  TAB_BUTTON: '.tab-button',
  SET_GROUP: '.set-group',

  // Containers
  LIFT_WORKOUT: '.lift-workout',
  WORKOUT_DISPLAY: '.workout-display',
  TAB_CONTENT: '.tab-content',
  LIFT_CARD: '.lift-card',
  LIFT_HEADER: '.lift-header',

  // Workout areas (for loading states)
  WORKOUT_AREAS: '.lift-workout, .workout-display, [data-tab]',
  WORKOUT_AREA_CONTEXT: '.workout-display, .lift-workout, .tab-content, [data-tab]',

  // Input sections
  INPUT_SECTION: '.input-section .section-header',

  // Set information
  SET_INFO: '.set-info',
  WEIGHT: '.weight',
  WEIGHT_VALUE: '.weight-value',
  REPS: '.reps',
  PERCENTAGE: '.percentage',

  // Progress
  SYNC_ICON: '.sync-icon',
  SYNC_TEXT: '.sync-text',
  SYNC_STATUS: '.sync-status',
  SAVE_ICON: '.save-icon',
  SAVE_TEXT: '.save-text',

  // Lift settings
  LIFT_SETTINGS_CARD: '.lift-settings-card',
  LIFT_SETTINGS_HEADER: '.lift-settings-header',
  ACCESSORIES_LIST: '.accessories-list',
  ACCESSORY_CHECKBOX: '.accessory-checkbox input[type="checkbox"]',
  SELECTION_COUNT: '.selection-count',
  QUICK_ACTIONS: '.quick-actions',

  // Cycle display
  CYCLE_TYPE: '.cycle-type',
};

// ===========================================
// CSS CLASSES (for adding/removing)
// ===========================================

export const CLASSES = {
  // State classes
  COMPLETED: 'completed',
  ACTIVE: 'active',
  EMPTY: 'empty',
  COMPLETE: 'complete',

  // Sync button states
  OFFLINE: 'offline',
  PENDING: 'pending',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error',

  // Button classes
  SYNC_BTN: 'sync-btn',
  QUICK_ACTION_BTN: 'quick-action-btn',
};

// ===========================================
// ELEMENT IDS (with helper functions)
// ===========================================

export const IDS = {
  // Sync UI
  MANUAL_SYNC_BTN: 'manual-sync-btn',
  SYNC_BUTTON_STYLES: 'sync-button-styles',
  SAVE_WORKOUT_BTN: 'save-workout-btn',

  // Global elements
  GLOBAL_NO_DATA: 'global-no-data',
  WORKOUT_DISPLAY: 'workout-display',
  USER_EMAIL: 'user-email',

  // Cycle info
  CYCLE_BADGE_TEXT: 'cycle-badge-text',
  CYCLE_INFO: 'cycle-info',
  CYCLE_TEXT_INLINE: 'cycle-text-inline',
  WEEK_TEXT_INLINE: 'week-text-inline',
  DESCRIPTION_TEXT_INLINE: 'description-text-inline',

  // Settings
  CYCLE_SELECT: 'cycle-select',
  WEEK_SELECT: 'week-select',
  INCREASE_TM_BUTTON: 'increaseTmButton',

  // Save buttons
  SAVE_TRAINING_MAXES_BTN: 'save-training-maxes-btn',
  SAVE_CYCLE_SETTINGS_BTN: 'save-cycle-settings-btn',
  SAVE_ACCESSORIES_BTN: 'save-accessories-btn',
  SAVE_ALL_SETTINGS_BTN: 'save-all-settings-btn',

  // Styles
  QUICK_ACTIONS_STYLES: 'quick-actions-styles',

  // Dynamic IDs (functions that generate IDs based on lift type)
  trainingMax: (lift) => `${lift}-max`,
  tmDisplay: (lift) => `${lift}-tm-display`,
  tmDash: (lift) => `${lift}-tm-dash`,
  noData: (lift) => `${lift}-no-data`,
  mainSets: (lift) => `${lift}-main-sets`,
  supplementalSets: (lift) => `${lift}-supplemental-sets`,
  accessories: (lift) => `${lift}-accessories`,
  progress: (lift) => `${lift}-progress`,
  progressBar: (lift) => `${lift}-progress-bar`,
  count: (lift) => `${lift}-count`,
};

// ===========================================
// DATA ATTRIBUTES
// ===========================================

export const DATA_ATTRS = {
  TAB: 'data-tab',
  LIFT: 'data-lift',
};

// ===========================================
// COMMON LIFT ARRAYS
// ===========================================

export const LIFTS = {
  ALL: ['squat', 'bench', 'deadlift', 'ohp'],
  MAIN: ['squat', 'bench', 'deadlift'], // 2.5 lb progression
  ACCESSORY: ['ohp'], // 1.25 lb progression
};
