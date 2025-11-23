/**
 * SessionProgressTracker - Progress Calculation and Display
 *
 * PURPOSE:
 * Calculates and displays workout completion progress.
 * Shows "x/y exercises completed" with percentage and visual progress bar.
 *
 * RESPONSIBILITIES:
 * - Calculate completion statistics from state
 * - Update progress text elements
 * - Update progress bar width and styling
 * - Generate session summaries
 *
 * DISPLAY FEATURES:
 * - Shows "x/y exercises completed (percentage%)"
 * - Progress bar fills proportionally
 * - Bar turns green when 100% complete
 * - Hidden when no exercises (x=0 or y=0)
 *
 * DEPENDENCIES:
 * - Window.stateStore for accessing completion data
 * - DOM elements: #${lift}-progress, #${lift}-progress-bar
 */

import { IDS, CLASSES, LIFTS } from './dom-selectors.js';
import { UI_TEXT } from './config.js';

export class SessionProgressTracker {
  // ===========================================
  // PROGRESS CALCULATION
  // ===========================================

  getProgressStats(liftType) {
    if (!window.stateStore) return null;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const state = window.stateStore.getSessionCompletion(liftType, cycle, week);

    if (!state) return null;

    const completed =
      state.mainSets.filter(Boolean).length +
      state.supplementalSets.filter(Boolean).length +
      state.accessories.filter(Boolean).length;

    const total =
      state.mainSets.length +
      state.supplementalSets.length +
      state.accessories.length;

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  // ===========================================
  // PROGRESS DISPLAY
  // ===========================================

  updateProgressText(liftType, stats) {
    const progressEl = document.getElementById(IDS.progress(liftType));
    if (!progressEl) return;

    if (!stats || stats.total === 0) {
      progressEl.textContent = UI_TEXT.NO_EXERCISES;
    } else {
      const { completed, total, percentage } = stats;
      progressEl.textContent = `${completed}/${total} exercises completed (${percentage}%)`;
    }
  }

  updateProgressBar(liftType, stats) {
    const progressBarEl = document.getElementById(IDS.progressBar(liftType));
    const progressBarContainer = progressBarEl?.parentElement;

    if (!progressBarEl || !progressBarContainer) return;

    if (!stats || stats.total === 0 || stats.completed === 0) {
      progressBarEl.style.width = "0%";
      progressBarContainer.classList.add(CLASSES.EMPTY);
      progressBarEl.classList.remove(CLASSES.COMPLETE);
    } else {
      progressBarEl.style.width = `${stats.percentage}%`;
      progressBarContainer.classList.remove(CLASSES.EMPTY);

      if (stats.completed === stats.total) {
        progressBarEl.classList.add(CLASSES.COMPLETE);
      } else {
        progressBarEl.classList.remove(CLASSES.COMPLETE);
      }
    }
  }

  /**
   * Updates progress text and bar for a lift's workout session.
   * Shows "x/y exercises completed" and fills progress bar proportionally.
   * Bar turns green when complete. Hidden when x=0 or y=0.
   *
   * @param {string} liftType - 'squat', 'bench', 'deadlift', or 'ohp'
   */
  updateProgress(liftType) {
    if (!window.stateStore) return;

    const stats = this.getProgressStats(liftType);
    this.updateProgressText(liftType, stats);
    this.updateProgressBar(liftType, stats);
  }

  // ===========================================
  // SESSION SUMMARY
  // ===========================================

  getSessionSummary() {
    if (!window.stateStore) return { total: 0, completed: 0, byLift: {} };

    const summary = { total: 0, completed: 0, byLift: {} };

    LIFTS.ALL.forEach((lift) => {
      const stats = this.getProgressStats(lift);

      if (stats) {
        summary.byLift[lift] = {
          total: stats.total,
          completed: stats.completed
        };
        summary.total += stats.total;
        summary.completed += stats.completed;
      }
    });

    return summary;
  }
}
