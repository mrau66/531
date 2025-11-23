/**
 * SessionEventHandler - User Interaction Handler
 *
 * PURPOSE:
 * Handles all user interactions for session tracking including:
 * - Pointer events (click/tap on sets and accessories)
 * - Double-click prevention
 * - Visual feedback (tap animation)
 * - Haptic feedback
 * - Pending actions queue for early interactions
 *
 * RESPONSIBILITIES:
 * - Setup unified pointer event listeners
 * - Route events to appropriate handlers
 * - Prevent double-processing
 * - Manage pending actions during initialization
 * - Provide immediate visual feedback
 *
 * DEPENDENCIES:
 * - StateManager for state updates
 * - VisualManager for visual feedback
 * - Window.stateStore for readiness checks
 */

export class SessionEventHandler {
  constructor(stateManager, visualManager, getCurrentLiftFn) {
    this.stateManager = stateManager;
    this.visualManager = visualManager;
    this.getCurrentLiftFn = getCurrentLiftFn;

    // Double-click prevention
    this.lastProcessed = null;
    this.lastProcessedTime = 0;

    // Pending actions queue
    this.pendingActions = [];
    this.isProcessingPending = false;

    // Loading state
    this.isLoadingFromDatabase = false;
  }

  // ===========================================
  // EVENT SETUP
  // ===========================================

  setupEventListeners() {
    document.addEventListener("pointerdown", this.handlePointerDown.bind(this));
    console.log("📱 Unified pointer events attached");
  }

  // ===========================================
  // EVENT HANDLING
  // ===========================================

  handlePointerDown(e) {
    // BLOCK INTERACTIONS DURING LOADING
    if (this.isLoadingFromDatabase) {
      console.log("⏳ Still loading from database, please wait...");
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target =
      e.target.closest(".set-row") ||
      e.target.closest(".accessory-item") ||
      e.target.closest(".tab-button");

    if (!target) return;

    // Haptic feedback on any interaction
    if ("vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch (err) {
        console.warn("Vibration not available", err);
      }
    }

    // For workout elements, verify they're in a workout area
    if (
      target.classList.contains("set-row") ||
      target.classList.contains("accessory-item")
    ) {
      const inWorkoutArea = target.closest(
        ".workout-display, .lift-workout, .tab-content, [data-tab]"
      );
      if (!inWorkoutArea) return;

      // Prevent double processing with element-specific check
      const elementId = `${target.className}-${Array.from(
        target.parentNode.children
      ).indexOf(target)}`;
      const now = Date.now();

      if (
        this.lastProcessed === elementId &&
        now - this.lastProcessedTime < 500
      ) {
        return;
      }

      this.lastProcessed = elementId;
      this.lastProcessedTime = now;
    }

    // Visual feedback for workout items
    if (
      target.classList.contains("set-row") ||
      target.classList.contains("accessory-item")
    ) {
      target.style.transform = "scale(0.98)";
      setTimeout(() => {
        target.style.transform = "";
      }, 150);
    }

    // Handle the interaction
    if (target.classList.contains("set-row")) {
      this.handleSetClick(target);
    } else if (target.classList.contains("accessory-item")) {
      this.handleAccessoryClick(target);
    } else if (target.classList.contains("tab-button")) {
      // Tab handling is external, just for completeness
      console.log("Tab clicked:", target.dataset.tab);
    }

    e.preventDefault();
  }

  handleSetClick(setElement) {
    // Check if we're ready to process
    if (!this.isReady()) {
      // Queue this action for later - mark as not user-initiated
      this.queueAction(() => {
        const liftType = this.getCurrentLiftFn(setElement);
        this.stateManager.toggleSet(setElement, liftType, false);
      });
      this.visualManager.toggleVisualState(setElement);
      return;
    }

    const liftType = this.getCurrentLiftFn(setElement);
    this.stateManager.toggleSet(setElement, liftType, true);
  }

  handleAccessoryClick(accessoryElement) {
    // Check if we're ready to process
    if (!this.isReady()) {
      // Queue this action for later
      this.queueAction(() => {
        const liftType = this.getCurrentLiftFn(accessoryElement);
        this.stateManager.toggleAccessory(accessoryElement, liftType, false);
      });
      // Still provide immediate visual feedback
      this.visualManager.toggleVisualState(accessoryElement);
      return;
    }

    const liftType = this.getCurrentLiftFn(accessoryElement);
    this.stateManager.toggleAccessory(accessoryElement, liftType, true);
  }

  // ===========================================
  // READINESS CHECKS
  // ===========================================

  isReady() {
    // More lenient ready check - allow offline mode immediately
    if (!window.stateStore) return false;

    // If no user (offline mode), we're ready as soon as stateStore exists
    if (!window.stateStore.state.user) return true;

    // If user exists, wait for initial load
    return window.stateStore.getState("isInitialLoadComplete");
  }

  // ===========================================
  // PENDING ACTIONS QUEUE
  // ===========================================

  queueAction(action) {
    console.log("📋 Queueing action until ready");
    this.pendingActions.push(action);
  }

  async processPendingActions(applyAllStatesFn) {
    if (this.isProcessingPending || this.pendingActions.length === 0) return;

    this.isProcessingPending = true;
    console.log(`🔄 Processing ${this.pendingActions.length} pending actions`);

    // Process all pending actions
    while (this.pendingActions.length > 0) {
      const action = this.pendingActions.shift();
      try {
        await action();
      } catch (error) {
        console.error("Error processing pending action:", error);
      }
    }

    applyAllStatesFn();
    this.isProcessingPending = false;
  }

  // ===========================================
  // LOADING STATE MANAGEMENT
  // ===========================================

  setLoadingState(isLoading) {
    this.isLoadingFromDatabase = isLoading;
  }
}
