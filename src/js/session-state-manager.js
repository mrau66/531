/**
 * SessionStateManager - Session Completion State Management
 *
 * PURPOSE:
 * Manages session completion state including:
 * - Loading completion data from store
 * - Updating completion arrays when sets/accessories are toggled
 * - Saving to database (debounced)
 * - Initializing completion arrays to match workout structure
 *
 * RESPONSIBILITIES:
 * - Toggle set completion (main/supplemental)
 * - Toggle accessory completion
 * - Update state in StateStore
 * - Load states from StateStore
 * - Initialize completion arrays
 * - Debounced database saves
 *
 * DEPENDENCIES:
 * - Window.stateStore for state operations
 * - VisualManager for applying styles
 * - ProgressTracker for updating progress display
 * - Shared debounce utility
 */

import { debounce } from './shared-init.js';
import { SELECTORS, IDS, CLASSES, LIFTS } from './dom-selectors.js';
import { TIMING } from './config.js';

export class SessionStateManager {
  constructor(visualManager, progressTracker) {
    this.visualManager = visualManager;
    this.progressTracker = progressTracker;
    this.isLoadingStates = false;

    // Debounced save function
    this.save = debounce(async (liftType) => {
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
    }, TIMING.DEBOUNCE_SAVE);
  }

  // ===========================================
  // TOGGLE OPERATIONS
  // ===========================================

  toggleSet(setElement, liftType, isUserInitiated = true) {
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
    this.visualManager.applyStyles(setElement, newState);

    // Haptic feedback
    if (isUserInitiated && "vibrate" in navigator) {
      try {
        navigator.vibrate(TIMING.HAPTIC_FEEDBACK);
      } catch (e) {
        // Silently ignore vibration errors
      }
    }

    // Update state
    this.updateStateInStore(liftType, setType, setIndex, newState);
    this.progressTracker.updateProgress(liftType);

    // Save if online
    if (window.stateStore?.state.user) {
      this.save(liftType);
    }
  }

  toggleAccessory(accessoryElement, liftType, isUserInitiated = true) {
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
    this.visualManager.applyStyles(accessoryElement, newState);

    // Haptic feedback
    if (isUserInitiated && "vibrate" in navigator) {
      try {
        navigator.vibrate(TIMING.HAPTIC_FEEDBACK);
      } catch (e) {
        // Silently ignore vibration errors
      }
    }

    // Update state
    this.updateStateInStore(liftType, "accessories", accessoryIndex, newState);
    this.progressTracker.updateProgress(liftType);

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

  // ===========================================
  // LOADING STATES
  // ===========================================

  async loadAllStatesFromStateStore(getLiftContainerFn) {
    if (!window.stateStore || this.isLoadingStates) return;

    this.isLoadingStates = true;

    try {
      // Wait for render
      await new Promise((resolve) => setTimeout(resolve, TIMING.WAIT_RENDER));

      for (const lift of LIFTS.ALL) {
        this.loadStateFromStore(lift);
        this.initializeCompletionArrays(lift, getLiftContainerFn);
      }

      this.visualManager.applyAllStatesToUI(
        LIFTS.ALL,
        (lift) => {
          const { cycle, week } = window.stateStore.getCycleSettings();
          return window.stateStore.getSessionCompletion(lift, cycle, week);
        },
        getLiftContainerFn
      );
    } finally {
      this.isLoadingStates = false;
    }
  }

  loadStateFromStore(liftType) {
    if (!window.stateStore) return;
    const { cycle, week } = window.stateStore.getCycleSettings();
    window.stateStore.getSessionCompletion(liftType, cycle, week);
  }

  initializeCompletionArrays(liftType, getLiftContainerFn) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(
      liftType,
      cycle,
      week
    );

    const container = getLiftContainerFn(liftType);
    if (!container) return;

    // Count visible elements
    const mainSetCount = container.querySelectorAll(
      `#${IDS.mainSets(liftType)} ${SELECTORS.SET_ROW}:not([style*="display: none"])`
    ).length;
    const supplementalSetCount = container.querySelectorAll(
      `#${IDS.supplementalSets(liftType)} ${SELECTORS.SET_ROW}:not([style*="display: none"])`
    ).length;
    const accessoryCount = container.querySelectorAll(
      `#${IDS.accessories(liftType)} ${SELECTORS.ACCESSORY_ITEM}`
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

  // ===========================================
  // CLEAR OPERATION
  // ===========================================

  clear() {
    if (window.stateStore) {
      LIFTS.ALL.forEach((lift) => {
        const { cycle, week } = window.stateStore.getCycleSettings();
        window.stateStore.setSessionCompletion(lift, cycle, week, {
          mainSets: [],
          supplementalSets: [],
          accessories: [],
        });
      });
    }

    document.querySelectorAll(`.${CLASSES.COMPLETED}`).forEach((el) => {
      el.classList.remove(CLASSES.COMPLETED);
      this.visualManager.applyStyles(el, false);
    });
  }
}
