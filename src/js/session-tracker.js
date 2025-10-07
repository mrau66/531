/**
 * SessionTracker: Interactive Workout Completion Tracking
 *
 * PURPOSE:
 * Manages the interactive elements of workout tracking, allowing users to mark sets
 * and exercises as complete by clicking/tapping. Provides visual feedback and persists
 * completion state through the UnifiedStateStore.
 *
 * KEY RESPONSIBILITIES & FUNCTIONS:
 *
 * Event Handling:
 * - setupEventListeners() - Attaches unified pointer event listeners
 * - handlePointerDown() - Routes clicks/taps to appropriate handlers
 * - handleSetClick() - Processes clicks on main/supplemental sets
 * - handleAccessoryClick() - Processes clicks on accessory exercises
 *
 * Visual State Management:
 * - toggleVisualState() - Provides immediate visual feedback
 * - applyStyles() - Applies completed/incomplete styling (green bg, strikethrough)
 * - applyStateToUI() - Syncs visual state with stored data
 * - applyAllStatesToUI() - Updates all lift visuals at once
 *
 * State Persistence:
 * - updateStateInStore() - Updates completion arrays in StateStore
 * - toggleSet() - Manages set completion state and persistence
 * - toggleAccessory() - Manages accessory completion state and persistence
 * - save() - Debounced database sync for online users
 *
 * Progress Tracking:
 * - updateProgress() - Updates completion counters (e.g., "5/12 completed")
 * - getSessionSummary() - Returns overall completion statistics
 *
 * Initialization & Loading:
 * - init() - Main initialization, sets up subscriptions and loads data
 * - waitForStateStore() - Ensures StateStore is available
 * - waitForDatabaseLoad() - Waits for database sync completion
 * - loadAllStatesFromStateStore() - Loads saved completion states
 * - loadStateFromStore() - Loads single lift completion data
 * - initializeCompletionArrays() - Ensures arrays match current workout structure
 *
 * Mobile Optimisation:
 * - isReady() - Checks if system ready for state updates
 * - queueAction() - Queues early interactions during initialization
 * - processPendingActions() - Processes queued actions once ready
 *
 * Utility:
 * - getCurrentLift() - Determines which lift is currently active
 * - getLiftContainer() - Finds DOM container for a specific lift
 * - debounce() - Creates debounced functions to prevent excessive saves
 * - clear() - Resets all completion states
 *
 * DEPENDENCIES:
 * - UnifiedStateStore: Reads/writes session completion data
 * - WorkoutManager: Waits for workout HTML to be rendered before applying states
 * - DOM Elements: Requires specific class names (.set-row, .accessory-item)
 *
 * DATA FLOW:
 * 1. User clicks/taps exercise → 2. Check if ready (queue if not) → 3. Toggle visual state
 * → 4. Update StateStore → 5. StateStore saves locally → 6. Optional database sync
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
class SessionTracker {
  constructor() {
    this.currentLift = "squat";
    this.dbEnabled = false;
    this.isInitialized = false;
    this.lastProcessed = null;
    this.lastProcessedTime = 0;
    this.isLoadingFromDatabase = true; // used for grey Out set buttons During Loading
    // Add pending actions queue for early interactions
    this.pendingActions = [];
    this.isProcessingPending = false;

    this.init();
  }

async init() {
    this.setupEventListeners();
    this.greyOut();

    // Wait for StateStore to exist
    await this.waitForStateStore();
    
    // ✅ Wait for StateStore's "fully ready" event
    await new Promise(resolve => {
        window.addEventListener('stateStoreFullyReady', resolve, { once: true });
        
        // Timeout fallback (5 seconds)
        setTimeout(resolve, 5000);
    });
    
    console.log('✅ StateStore confirmed ready, loading session states');

    this.dbEnabled = !!(
        window.auth?.currentUser &&
        window.supabase &&
        window.stateStore
    );

    // Load session completion states
    await this.loadAllStatesFromStateStore();

    // ✅ NOW ungrey everything
    this.isInitialized = true;
    this.isLoadingFromDatabase = false;
    this.unGreyOut();
    this.processPendingActions();
    
    console.log('✅ Session Tracker fully initialized');

    // Subscribe to changes
    if (window.stateStore) {
        // debouncing, stop multiple events in quick succession that cause flickering UI and race conditions
        window.stateStore.subscribe("cycleSettings", () => {
            clearTimeout(this.reloadTimeout);
            this.reloadTimeout = setTimeout(
                () => this.loadAllStatesFromStateStore(),
                200
            );
        });
    }
}

  setupEventListeners() {
    document.addEventListener("pointerdown", this.handlePointerDown.bind(this));
    console.log("📱 Unified pointer events attached");
  }

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
      this.currentLift = target.dataset.tab;
    }

    e.preventDefault();
  }

  handleSetClick(setElement) {
    // Check if we're ready to process
    if (!this.isReady()) {
      // Queue this action for later - mark as not user-initiated
      this.queueAction(() => this.toggleSet(setElement, false));
      this.toggleVisualState(setElement);
      return;
    }
    this.toggleSet(setElement, true);
  }

  handleAccessoryClick(accessoryElement) {
    // Check if we're ready to process
    if (!this.isReady()) {
      // Queue this non haptic action for later
      this.queueAction(() => this.toggleAccessory(accessoryElement, false));
      // Still provide immediate visual feedback
      this.toggleVisualState(accessoryElement);
      return;
    }
    this.toggleAccessory(accessoryElement, true);
  }

  greyOut() {
    const workoutAreas = document.querySelectorAll(
      ".lift-workout, .workout-display, [data-tab]"
    );

    workoutAreas.forEach((area) => {
      area.style.opacity = "0.2";
      area.style.pointerEvents = "none";
      area.style.transition = "opacity 0.5s ease";
    });
  }

  unGreyOut() {
    const workoutAreas = document.querySelectorAll(
      ".lift-workout, .workout-display, [data-tab]"
    );

    workoutAreas.forEach((area) => {
      area.style.opacity = "";
      area.style.pointerEvents = "";
    });
  }

  isReady() {
    // More lenient ready check - allow offline mode immediately
    if (!window.stateStore) return false;

    // If no user (offline mode), we're ready as soon as stateStore exists
    if (!window.stateStore.state.user) return true;

    // If user exists, wait for initial load
    return window.stateStore.getState("isInitialLoadComplete");
  }

  queueAction(action) {
    console.log("📋 Queueing action until ready");
    this.pendingActions.push(action);
  }

  async processPendingActions() {
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
    this.applyAllStatesToUI();
    this.isProcessingPending = false;
  }

  toggleVisualState(element) {
    // Toggle visual state immediately for feedback
    const isCompleted = element.classList.contains("completed");
    element.classList.toggle("completed");
    this.applyStyles(element, !isCompleted);

    // Haptic feedback
    if ("vibrate" in navigator) navigator.vibrate(30);
  }

  toggleSet(setElement, isUserInitiated = true) {
    if (!this.isReady()) {
      console.log("⚠️ Not ready yet, action should have been queued");
      return;
    }

    const liftType = this.getCurrentLift(setElement);
    const headerElement = setElement
      .closest(".set-group")
      ?.querySelector("h3, h4");
    const isMainSet = headerElement?.textContent?.includes("Main");
    const setIndex = Array.from(setElement.parentNode.children).indexOf(
      setElement
    );

    // Get actual state from store, not from DOM
    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(
      liftType,
      cycle,
      week
    );
    const setType = isMainSet ? "mainSets" : "supplementalSets";
    const currentState = currentCompletion[setType][setIndex] || false;

    // Toggle to opposite of stored state
    const newState = !currentState;

    // Update visual state
    if (newState) {
      setElement.classList.add("completed");
    } else {
      setElement.classList.remove("completed");
    }
    this.applyStyles(setElement, newState);

    // Haptic feedback
    if (isUserInitiated && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // Silently ignore vibration errors
      }
    }
    // Update state
    this.updateStateInStore(liftType, setType, setIndex, newState);
    this.updateProgress(liftType);

    // Save if online
    if (window.stateStore?.state.user) {
      this.save(liftType);
    }
  }

  toggleAccessory(accessoryElement, isUserInitiated = true) {
    if (!this.isReady()) {
      console.log("⚠️ Not ready yet, action should have been queued");
      return;
    }

    const liftType = this.getCurrentLift(accessoryElement);
    const accessoryIndex = Array.from(
      accessoryElement.parentNode.children
    ).indexOf(accessoryElement);

    // Get actual state from store, not from DOM
    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(
      liftType,
      cycle,
      week
    );
    const currentState = currentCompletion.accessories[accessoryIndex] || false;

    // Toggle to opposite of stored state
    const newState = !currentState;

    // Update visual state
    if (newState) {
      accessoryElement.classList.add("completed");
    } else {
      accessoryElement.classList.remove("completed");
    }
    this.applyStyles(accessoryElement, newState);

    // Haptic feedback
    if (isUserInitiated && "vibrate" in navigator) {
      try {
        navigator.vibrate(30);
      } catch (e) {
        // Silently ignore vibration errors
      }
    }

    // Update state
    this.updateStateInStore(liftType, "accessories", accessoryIndex, newState);
    this.updateProgress(liftType);

    // Save if online
    if (window.stateStore?.state.user) {
      this.save(liftType);
    }
  }

  updateStateInStore(liftType, exerciseType, index, isCompleted) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(
      liftType,
      cycle,
      week
    );

    // Ensure array is long enough
    while (currentCompletion[exerciseType].length <= index) {
      currentCompletion[exerciseType].push(false);
    }

    currentCompletion[exerciseType][index] = isCompleted;
    window.stateStore.setSessionCompletion(
      liftType,
      cycle,
      week,
      currentCompletion
    );
  }

  applyStyles(element, isCompleted) {
    if (isCompleted) {
      element.style.cssText = `
                background: #d4edda !important;
                border-left: 4px solid #006400 !important;
                opacity: 0.9 !important;
                transform: translateX(4px) !important;
                transition: all 0.2s ease !important;
            `;

      // Strike through text
      element.querySelectorAll(".set-info, .weight, span").forEach((el) => {
        el.style.textDecoration = "line-through";
        el.style.color = "#006400";
      });

      if (element.classList.contains("accessory-item")) {
        element.style.textDecoration = "line-through";
        element.style.color = "#006400";
      }
    } else {
      element.style.cssText = "";
      element.querySelectorAll("*").forEach((el) => {
        el.style.textDecoration = "";
        el.style.color = "";
      });
    }
  }

  async waitForStateStore() {
    let retries = 0;
    while (retries < 50 && !window.stateStore) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
  }

  async waitForDatabaseLoad() {
    if (!window.stateStore) return;

    let retries = 0;
    while (
      retries < 100 &&
      !window.stateStore.getState("isInitialLoadComplete")
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
  }

  async loadAllStatesFromStateStore() {
    if (!window.stateStore) {
      // this.loadFromLocalStorage();
      return;
    }

    if (this.isLoadingStates) return;

    this.isLoadingStates = true;

    try {
      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, 200));

      for (const lift of ["squat", "bench", "deadlift", "ohp"]) {
        this.loadStateFromStore(lift);
        this.initializeCompletionArrays(lift);
      }

      this.applyAllStatesToUI();
    } finally {
      this.isLoadingStates = false;
    }
  }

  loadStateFromStore(liftType) {
    if (!window.stateStore) return;
    const { cycle, week } = window.stateStore.getCycleSettings();
    window.stateStore.getSessionCompletion(liftType, cycle, week);
  }

  initializeCompletionArrays(liftType) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(
      liftType,
      cycle,
      week
    );

    const container = this.getLiftContainer(liftType);
    if (!container) return;

    // Count visible elements
    const mainSetCount = container.querySelectorAll(
      `#${liftType}-main-sets .set-row:not([style*="display: none"])`
    ).length;
    const supplementalSetCount = container.querySelectorAll(
      `#${liftType}-supplemental-sets .set-row:not([style*="display: none"])`
    ).length;
    const accessoryCount = container.querySelectorAll(
      `#${liftType}-accessories .accessory-item`
    ).length;

    // Initialize arrays if needed
    const updatedCompletion = {
      mainSets:
        currentCompletion.mainSets.length === mainSetCount
          ? currentCompletion.mainSets
          : new Array(mainSetCount).fill(false),
      supplementalSets:
        currentCompletion.supplementalSets.length === supplementalSetCount
          ? currentCompletion.supplementalSets
          : new Array(supplementalSetCount).fill(false),
      accessories:
        currentCompletion.accessories.length === accessoryCount
          ? currentCompletion.accessories
          : new Array(accessoryCount).fill(false),
    };

    if (
      JSON.stringify(currentCompletion) !== JSON.stringify(updatedCompletion)
    ) {
      window.stateStore.setSessionCompletion(
        liftType,
        cycle,
        week,
        updatedCompletion
      );
    }
  }

  applyAllStatesToUI() {
    ["squat", "bench", "deadlift", "ohp"].forEach((lift) => {
      this.applyStateToUI(lift);
    });
  }

  applyStateToUI(liftType) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const state = window.stateStore.getSessionCompletion(liftType, cycle, week);

    if (!state) return;

    const container = this.getLiftContainer(liftType);
    if (!container) return;

    // Clear existing states
    container.querySelectorAll(".completed").forEach((el) => {
      el.classList.remove("completed");
      this.applyStyles(el, false);
    });

    // Apply states to visible elements
    const applyToElements = (selector, stateArray) => {
      const elements = Array.from(container.querySelectorAll(selector)).filter(
        (el) => el.style.display !== "none"
      );
      stateArray.forEach((isCompleted, index) => {
        if (elements[index] && isCompleted) {
          elements[index].classList.add("completed");
          this.applyStyles(elements[index], true);
        }
      });
    };

    applyToElements(`#${liftType}-main-sets .set-row`, state.mainSets);
    applyToElements(
      `#${liftType}-supplemental-sets .set-row`,
      state.supplementalSets
    );
    applyToElements(
      `#${liftType}-accessories .accessory-item`,
      state.accessories
    );

    this.updateProgress(liftType);
  }

  updateProgress(liftType) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const state = window.stateStore.getSessionCompletion(liftType, cycle, week);

    if (!state) return;

    const completed =
      state.mainSets.filter(Boolean).length +
      state.supplementalSets.filter(Boolean).length +
      state.accessories.filter(Boolean).length;
    const total =
      state.mainSets.length +
      state.supplementalSets.length +
      state.accessories.length;

    const progressEl = document.getElementById(`${liftType}-progress`);
    if (progressEl) {
      progressEl.textContent = `${completed}/${total} exercises completed`;
    }
  }

  save = this.debounce(async (liftType) => {
    if (!window.stateStore?.state.user) return;

    try {
      const { cycle, week } = window.stateStore.getCycleSettings();
      const completionData = window.stateStore.getSessionCompletion(
        liftType,
        cycle,
        week
      );
      await window.stateStore.saveSessionCompletionToDB(
        liftType,
        completionData
      );
    } catch (error) {
      console.error(`Error saving ${liftType}:`, error);
    }
  }, 1000);

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

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  getSessionSummary() {
    if (!window.stateStore) return { total: 0, completed: 0, byLift: {} };

    const summary = { total: 0, completed: 0, byLift: {} };

    ["squat", "bench", "deadlift", "ohp"].forEach((lift) => {
      const { cycle, week } = window.stateStore.getCycleSettings();
      const state = window.stateStore.getSessionCompletion(lift, cycle, week);

      if (state) {
        const liftTotal =
          state.mainSets.length +
          state.supplementalSets.length +
          state.accessories.length;
        const liftCompleted =
          state.mainSets.filter(Boolean).length +
          state.supplementalSets.filter(Boolean).length +
          state.accessories.filter(Boolean).length;

        summary.byLift[lift] = { total: liftTotal, completed: liftCompleted };
        summary.total += liftTotal;
        summary.completed += liftCompleted;
      }
    });

    return summary;
  }

  clear() {
    if (window.stateStore) {
      ["squat", "bench", "deadlift", "ohp"].forEach((lift) => {
        const { cycle, week } = window.stateStore.getCycleSettings();
        window.stateStore.setSessionCompletion(lift, cycle, week, {
          mainSets: [],
          supplementalSets: [],
          accessories: [],
        });
      });
    }

    document.querySelectorAll(".completed").forEach((el) => {
      el.classList.remove("completed");
      this.applyStyles(el, false);
    });
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
