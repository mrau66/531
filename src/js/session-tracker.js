/**
 * SessionTracker: Interactive Workout Completion Tracking Orchestrator
 *
 * PURPOSE:
 * Orchestrates session tracking by coordinating specialized managers.
 * This class has been refactored to follow Single Responsibility Principle.
 *
 * ARCHITECTURE:
 * - SessionVisualManager: Visual feedback and styling
 * - SessionStateManager: State updates and persistence
 * - SessionProgressTracker: Progress calculation and display
 * - SessionEventHandler: User interaction handling
 *
 * KEY RESPONSIBILITIES:
 * - Initialize all sub-managers
 * - Coordinate initialization sequence
 * - Handle app resume/reload events
 * - Provide unified API for external access
 *
 * DATA FLOW:
 * User Click → EventHandler → StateManager → Store → Visual/Progress Updates
 *
 * MOBILE OPTIMIZATION:
 * - Uses pending actions queue to handle clicks during initialization
 * - Provides immediate visual feedback even when state updates are pending
 * - Prevents loss of early interactions on slower devices
 * - Reads from store state rather than DOM to ensure consistency
 *
 * INITIALIZATION:
 * Auto-initializes on DOMContentLoaded if workout elements are present on page
 */

import { SessionVisualManager } from './session-visual-manager.js';
import { SessionStateManager } from './session-state-manager.js';
import { SessionProgressTracker } from './session-progress-tracker.js';
import { SessionEventHandler } from './session-event-handler.js';

class SessionTracker {
  constructor() {
    this.currentLift = "squat";
    this.dbEnabled = false;
    this.isInitialized = false;
    this.pendingReloads = 0;

    // Create sub-managers
    this.visual = new SessionVisualManager();
    this.progress = new SessionProgressTracker();
    this.state = new SessionStateManager(this.visual, this.progress);
    this.events = new SessionEventHandler(
      this.state,
      this.visual,
      this.getCurrentLift.bind(this)
    );

    this.init();
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  async init() {
    this.events.setupEventListeners();
    this.visual.greyOut();

    // Wait for StateStore to exist
    await this.waitForStateStore();

    // Wait for StateStore's "fully ready" event
    await new Promise((resolve) => {
      window.addEventListener("stateStoreFullyReady", resolve, { once: true });

      // Timeout fallback (5 seconds)
      setTimeout(resolve, 5000);
    });

    console.log("✅ StateStore confirmed ready, loading session states");

    this.dbEnabled = !!(
      window.auth?.currentUser &&
      window.supabase &&
      window.stateStore
    );

    // Load session completion states
    await this.state.loadAllStatesFromStateStore(
      this.getLiftContainer.bind(this)
    );

    // NOW ungrey everything
    this.isInitialized = true;
    this.events.setLoadingState(false);
    this.visual.unGreyOut();
    this.events.processPendingActions(() => this.applyAllStatesToUI());

    console.log("✅ Session Tracker fully initialized");

    // Subscribe to changes
    if (window.stateStore) {
      // Debounce to stop multiple events in quick succession that cause flickering
      window.stateStore.subscribe("cycleSettings", () => {
        clearTimeout(this.reloadTimeout);
        this.reloadTimeout = setTimeout(
          () => this.state.loadAllStatesFromStateStore(
            this.getLiftContainer.bind(this)
          ),
          200
        );
      });
    }

    this.setupReloadListeners();
  }

  async waitForStateStore() {
    let retries = 0;
    while (retries < 50 && !window.stateStore) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
  }

  // ===========================================
  // APP RESUME HANDLING
  // ===========================================

  setupReloadListeners() {
    window.addEventListener("stateStoreReloading", () =>
      this.handleStateStoreReloading()
    );
    window.addEventListener("stateStoreFullyReady", () =>
      this.handleStateStoreReady()
    );
  }

  handleStateStoreReloading() {
    console.log("⏳ StateStore reloading, greying out...");
    this.pendingReloads++;
    this.events.setLoadingState(true);
    this.visual.greyOut();
    console.log(`📊 Pending reloads: ${this.pendingReloads}`);
  }

  async handleStateStoreReady() {
    this.pendingReloads = Math.max(0, this.pendingReloads - 1);
    console.log(`📊 Pending reloads remaining: ${this.pendingReloads}`);

    // Only ungrey when ALL pending reloads are done
    if (this.pendingReloads === 0 && this.events.isLoadingFromDatabase) {
      console.log("✅ All reloads complete, updating UI...");
      await this.state.loadAllStatesFromStateStore(
        this.getLiftContainer.bind(this)
      );
      this.events.setLoadingState(false);
      this.visual.unGreyOut();
    } else if (this.pendingReloads > 0) {
      console.log(`⏳ Still waiting for ${this.pendingReloads} more reload(s)...`);
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  getCurrentLift(element) {
    const path = window.location.pathname;
    if (path.includes("/squat/")) return "squat";
    if (path.includes("/bench/")) return "bench";
    if (path.includes("/deadlift/")) return "deadlift";
    if (path.includes("/ohp/")) return "ohp";

    const activeTab = document.querySelector(".tab-button.active");
    return activeTab?.dataset.tab || this.currentLift;
  }

  getLiftContainer(liftType) {
    if (window.location.pathname.includes(`/${liftType}/`)) {
      return document.querySelector(".lift-workout");
    }
    return document.querySelector(`[data-tab="${liftType}"].tab-content`);
  }

  applyAllStatesToUI() {
    this.visual.applyAllStatesToUI(
      ["squat", "bench", "deadlift", "ohp"],
      (lift) => {
        const { cycle, week } = window.stateStore.getCycleSettings();
        return window.stateStore.getSessionCompletion(lift, cycle, week);
      },
      this.getLiftContainer.bind(this)
    );
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  getSessionSummary() {
    return this.progress.getSessionSummary();
  }

  clear() {
    return this.state.clear();
  }
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  const hasWorkoutElements =
    document.getElementById("workout-display") ||
    document.querySelector(".lift-workout");

  if (hasWorkoutElements) {
    window.sessionTracker = new SessionTracker();
    window.getSessionSummary = () => window.sessionTracker.getSessionSummary();
    window.clearSessionCache = () => window.sessionTracker.clear();

    console.log("✅ Session Tracker initialized with pointer events");
  }
});
