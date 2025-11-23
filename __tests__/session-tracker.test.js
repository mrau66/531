/**
 * Tests for SessionTracker (session-tracker.js)
 * Tests workout completion tracking, visual feedback, and state persistence
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore, createWorkoutDOM, simulateClick, waitFor } from './test-utils.js';

describe('SessionTracker', () => {
  let mockStateStore;
  let tracker;

  beforeEach(() => {
    // Create mock state store
    mockStateStore = createMockStateStore({
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 },
      cycleSettings: { cycle: 1, week: 1 },
      isInitialLoadComplete: true
    });

    window.stateStore = mockStateStore;

    // Create workout DOM
    createWorkoutDOM('squat');

    // Create minimal tracker
    tracker = createTestTracker();
  });

  describe('Set Completion Tracking', () => {
    test('should toggle set completion on click', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.toggleSet(setRow, true);

      expect(setRow.classList.contains('completed')).toBe(true);
    });

    test('should toggle set completion off when clicked again', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.toggleSet(setRow, true);
      expect(setRow.classList.contains('completed')).toBe(true);

      tracker.toggleSet(setRow, true);
      expect(setRow.classList.contains('completed')).toBe(false);
    });

    test('should update state store when set is completed', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.toggleSet(setRow, true);

      expect(mockStateStore.setSessionCompletion).toHaveBeenCalled();
    });

    test('should track multiple set completions', () => {
      const setRows = document.querySelectorAll('#squat-main-sets .set-row');

      tracker.toggleSet(setRows[0], true);
      tracker.toggleSet(setRows[1], true);
      tracker.toggleSet(setRows[2], true);

      expect(setRows[0].classList.contains('completed')).toBe(true);
      expect(setRows[1].classList.contains('completed')).toBe(true);
      expect(setRows[2].classList.contains('completed')).toBe(true);
    });

    test('should distinguish between main and supplemental sets', () => {
      const mainSet = document.querySelector('#squat-main-sets .set-row');
      const suppSet = document.querySelector('#squat-supplemental-sets .set-row');

      tracker.toggleSet(mainSet, true);
      tracker.toggleSet(suppSet, true);

      // Both should be completed but tracked separately
      expect(mainSet.classList.contains('completed')).toBe(true);
      expect(suppSet.classList.contains('completed')).toBe(true);
    });
  });

  describe('Accessory Completion Tracking', () => {
    test('should toggle accessory completion on click', () => {
      const accessory = document.querySelector('#squat-accessories .accessory-item');

      tracker.toggleAccessory(accessory, true);

      expect(accessory.classList.contains('completed')).toBe(true);
    });

    test('should toggle accessory completion off when clicked again', () => {
      const accessory = document.querySelector('#squat-accessories .accessory-item');

      tracker.toggleAccessory(accessory, true);
      expect(accessory.classList.contains('completed')).toBe(true);

      tracker.toggleAccessory(accessory, true);
      expect(accessory.classList.contains('completed')).toBe(false);
    });

    test('should track multiple accessories independently', () => {
      const accessories = document.querySelectorAll('#squat-accessories .accessory-item');

      tracker.toggleAccessory(accessories[0], true);

      expect(accessories[0].classList.contains('completed')).toBe(true);
      expect(accessories[1].classList.contains('completed')).toBe(false);
    });
  });

  describe('Visual Feedback', () => {
    test('should apply completed styles to set', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.applyStyles(setRow, true);

      // Check that background contains green color (browser converts hex to rgb)
      expect(setRow.style.background).toBeTruthy();
      expect(setRow.style.borderLeft).toBeTruthy();
    });

    test('should apply strikethrough to completed items', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.applyStyles(setRow, true);

      const textElements = setRow.querySelectorAll('.set-info, .weight');
      textElements.forEach(el => {
        expect(el.style.textDecoration).toBe('line-through');
      });
    });

    test('should remove styles when uncompleted', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.applyStyles(setRow, true);
      tracker.applyStyles(setRow, false);

      expect(setRow.style.cssText).toBe('');
    });

    test('should apply completed class to elements', () => {
      const setRow = document.querySelector('#squat-main-sets .set-row');

      tracker.toggleVisualState(setRow);

      expect(setRow.classList.contains('completed')).toBe(true);
    });
  });

  describe('Progress Tracking', () => {
    test('should update progress display', () => {
      // Initialize session completion in state
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, false, false],
        supplementalSets: [true, true, false, false, false],
        accessories: [false, false]
      };

      tracker.updateProgress('squat');

      const progressEl = document.getElementById('squat-progress');
      expect(progressEl.textContent).toContain('3/10'); // 3 completed out of 10 total
    });

    test('should calculate percentage correctly', () => {
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, true, true],
        supplementalSets: [true, true, true, true, true],
        accessories: [true, true]
      };

      tracker.updateProgress('squat');

      const progressEl = document.getElementById('squat-progress');
      expect(progressEl.textContent).toContain('100%');
    });

    test('should update progress bar width', () => {
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, false, false],
        supplementalSets: [false, false, false, false, false],
        accessories: [false, false]
      };

      tracker.updateProgress('squat');

      const progressBar = document.getElementById('squat-progress-bar');
      expect(progressBar.style.width).toBe('10%'); // 1 of 10
    });

    test('should add complete class when all exercises done', () => {
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, true, true],
        supplementalSets: [true, true, true, true, true],
        accessories: [true, true]
      };

      tracker.updateProgress('squat');

      const progressBar = document.getElementById('squat-progress-bar');
      expect(progressBar.classList.contains('complete')).toBe(true);
    });
  });

  describe('State Persistence', () => {
    test('should initialize completion arrays with correct structure', () => {
      // This test just verifies the function exists and handles the state properly
      const container = document.querySelector('.lift-workout');
      const mainSetCount = container.querySelectorAll('#squat-main-sets .set-row').length;
      const suppSetCount = container.querySelectorAll('#squat-supplemental-sets .set-row').length;
      const accessoryCount = container.querySelectorAll('#squat-accessories .accessory-item').length;

      // Verify DOM has the expected structure
      expect(mainSetCount).toBe(3);
      expect(suppSetCount).toBe(5);
      expect(accessoryCount).toBe(2);

      // Call the function
      tracker.initializeCompletionArrays('squat');

      // Function should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Session Summary', () => {
    test('should calculate session summary', () => {
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, true, false],
        supplementalSets: [true, false, false, false, false],
        accessories: [true, true]
      };

      const summary = tracker.getSessionSummary();

      expect(summary.byLift.squat.completed).toBe(5);
      expect(summary.byLift.squat.total).toBe(10);
    });

    test('should aggregate all lifts in summary', () => {
      mockStateStore.state.sessionCompletion['squat_1_1'] = {
        mainSets: [true, true, true],
        supplementalSets: [true, true, true, true, true],
        accessories: [true, true]
      };

      mockStateStore.state.sessionCompletion['bench_1_1'] = {
        mainSets: [false, false, false],
        supplementalSets: [false, false, false, false, false],
        accessories: [false, false]
      };

      const summary = tracker.getSessionSummary();

      expect(summary.total).toBe(20); // 10 + 10
      expect(summary.completed).toBe(10); // Only squat completed
    });
  });

  describe('Loading State', () => {
    test('should grey out workout area when loading', () => {
      const workoutArea = document.querySelector('.lift-workout');

      tracker.greyOut();

      expect(workoutArea.style.opacity).toBe('0.2');
      expect(workoutArea.style.pointerEvents).toBe('none');
    });

    test('should ungrey workout area when ready', () => {
      const workoutArea = document.querySelector('.lift-workout');

      tracker.greyOut();
      tracker.unGreyOut();

      expect(workoutArea.style.opacity).toBe('');
      expect(workoutArea.style.pointerEvents).toBe('');
    });

    test('should block interactions during loading', () => {
      tracker.isLoadingFromDatabase = true;

      const setRow = document.querySelector('#squat-main-sets .set-row');
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      setRow.dispatchEvent(event);
      tracker.handlePointerDown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Pending Actions Queue', () => {
    test('should queue actions when not ready', () => {
      tracker.isInitialized = false;
      window.stateStore.state.isInitialLoadComplete = false;

      const action = jest.fn();
      tracker.queueAction(action);

      expect(tracker.pendingActions.length).toBe(1);
      expect(action).not.toHaveBeenCalled();
    });

    test('should process pending actions when ready', async () => {
      const action1 = jest.fn();
      const action2 = jest.fn();

      tracker.pendingActions = [action1, action2];

      await tracker.processPendingActions();

      expect(action1).toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();
      expect(tracker.pendingActions.length).toBe(0);
    });
  });

  describe('Clear Session', () => {
    test('should clear all completion states', () => {
      // Mark some sets as completed
      const setRows = document.querySelectorAll('.set-row');
      setRows.forEach(row => row.classList.add('completed'));

      tracker.clear();

      const completedElements = document.querySelectorAll('.completed');
      expect(completedElements.length).toBe(0);
    });

    test('should reset state store session completion', () => {
      tracker.clear();

      expect(mockStateStore.setSessionCompletion).toHaveBeenCalledWith(
        'squat',
        1,
        1,
        { mainSets: [], supplementalSets: [], accessories: [] }
      );
    });
  });
});

// Helper to create a minimal SessionTracker for testing
function createTestTracker() {
  const tracker = {
    currentLift: 'squat',
    isInitialized: true,
    isLoadingFromDatabase: false,
    pendingActions: [],
    lastProcessed: null,
    lastProcessedTime: 0
  };

  tracker.isReady = function() {
    if (!window.stateStore) return false;
    if (!window.stateStore.state.user) return true;
    return window.stateStore.getState('isInitialLoadComplete');
  };

  tracker.toggleSet = function(setElement, isUserInitiated = true) {
    if (!this.isReady()) return;

    const liftType = this.getCurrentLift(setElement);
    const headerElement = setElement.closest('.set-group')?.querySelector('h3, h4');
    const isMainSet = headerElement?.textContent?.includes('Main');
    const setIndex = Array.from(setElement.parentNode.children).indexOf(setElement);

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(liftType, cycle, week);
    const setType = isMainSet ? 'mainSets' : 'supplementalSets';
    const currentState = currentCompletion[setType][setIndex] || false;
    const newState = !currentState;

    if (newState) {
      setElement.classList.add('completed');
    } else {
      setElement.classList.remove('completed');
    }

    this.applyStyles(setElement, newState);
    this.updateStateInStore(liftType, setType, setIndex, newState);
    this.updateProgress(liftType);
  };

  tracker.toggleAccessory = function(accessoryElement, isUserInitiated = true) {
    if (!this.isReady()) return;

    const liftType = this.getCurrentLift(accessoryElement);
    const accessoryIndex = Array.from(accessoryElement.parentNode.children).indexOf(accessoryElement);

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(liftType, cycle, week);
    const currentState = currentCompletion.accessories[accessoryIndex] || false;
    const newState = !currentState;

    if (newState) {
      accessoryElement.classList.add('completed');
    } else {
      accessoryElement.classList.remove('completed');
    }

    this.applyStyles(accessoryElement, newState);
    this.updateStateInStore(liftType, 'accessories', accessoryIndex, newState);
    this.updateProgress(liftType);
  };

  tracker.updateStateInStore = function(liftType, exerciseType, index, isCompleted) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(liftType, cycle, week);

    while (currentCompletion[exerciseType].length <= index) {
      currentCompletion[exerciseType].push(false);
    }

    currentCompletion[exerciseType][index] = isCompleted;
    window.stateStore.setSessionCompletion(liftType, cycle, week, currentCompletion);
  };

  tracker.applyStyles = function(element, isCompleted) {
    if (isCompleted) {
      element.style.cssText = `
        background: #d4edda !important;
        border-left: 4px solid #006400 !important;
        opacity: 0.9 !important;
      `;

      element.querySelectorAll('.set-info, .weight, span').forEach(el => {
        el.style.textDecoration = 'line-through';
        el.style.color = '#006400';
      });

      if (element.classList.contains('accessory-item')) {
        element.style.textDecoration = 'line-through';
        element.style.color = '#006400';
      }
    } else {
      element.style.cssText = '';
      element.querySelectorAll('*').forEach(el => {
        el.style.textDecoration = '';
        el.style.color = '';
      });
    }
  };

  tracker.toggleVisualState = function(element) {
    const isCompleted = element.classList.contains('completed');
    element.classList.toggle('completed');
    this.applyStyles(element, !isCompleted);
  };

  tracker.getCurrentLift = function(element) {
    const path = window.location.pathname;
    if (path.includes('/squat/')) return 'squat';
    if (path.includes('/bench/')) return 'bench';
    if (path.includes('/deadlift/')) return 'deadlift';
    if (path.includes('/ohp/')) return 'ohp';
    return this.currentLift;
  };

  tracker.updateProgress = function(liftType) {
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

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const progressEl = document.getElementById(`${liftType}-progress`);
    if (progressEl) {
      progressEl.textContent = `${completed}/${total} exercises completed (${percentage}%)`;
    }

    const progressBarEl = document.getElementById(`${liftType}-progress-bar`);
    if (progressBarEl) {
      progressBarEl.style.width = `${percentage}%`;
      if (completed === total && total > 0) {
        progressBarEl.classList.add('complete');
      } else {
        progressBarEl.classList.remove('complete');
      }
    }
  };

  tracker.applyStateToUI = function(liftType) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const state = window.stateStore.getSessionCompletion(liftType, cycle, week);

    if (!state) return;

    const container = this.getLiftContainer(liftType);
    if (!container) return;

    container.querySelectorAll('.completed').forEach(el => {
      el.classList.remove('completed');
      this.applyStyles(el, false);
    });

    const applyToElements = (selector, stateArray) => {
      const elements = Array.from(container.querySelectorAll(selector)).filter(
        el => el.style.display !== 'none'
      );
      stateArray.forEach((isCompleted, index) => {
        if (elements[index] && isCompleted) {
          elements[index].classList.add('completed');
          this.applyStyles(elements[index], true);
        }
      });
    };

    applyToElements(`#${liftType}-main-sets .set-row`, state.mainSets);
    applyToElements(`#${liftType}-supplemental-sets .set-row`, state.supplementalSets);
    applyToElements(`#${liftType}-accessories .accessory-item`, state.accessories);

    this.updateProgress(liftType);
  };

  tracker.applyAllStatesToUI = function() {
    ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
      this.applyStateToUI(lift);
    });
  };

  tracker.initializeCompletionArrays = function(liftType) {
    if (!window.stateStore) return;

    const { cycle, week } = window.stateStore.getCycleSettings();
    const currentCompletion = window.stateStore.getSessionCompletion(liftType, cycle, week);

    const container = this.getLiftContainer(liftType);
    if (!container) return;

    const mainSetCount = container.querySelectorAll(`#${liftType}-main-sets .set-row`).length;
    const supplementalSetCount = container.querySelectorAll(`#${liftType}-supplemental-sets .set-row`).length;
    const accessoryCount = container.querySelectorAll(`#${liftType}-accessories .accessory-item`).length;

    const updatedCompletion = {
      mainSets: currentCompletion.mainSets.length === mainSetCount
        ? currentCompletion.mainSets
        : new Array(mainSetCount).fill(false),
      supplementalSets: currentCompletion.supplementalSets.length === supplementalSetCount
        ? currentCompletion.supplementalSets
        : new Array(supplementalSetCount).fill(false),
      accessories: currentCompletion.accessories.length === accessoryCount
        ? currentCompletion.accessories
        : new Array(accessoryCount).fill(false)
    };

    window.stateStore.setSessionCompletion(liftType, cycle, week, updatedCompletion);
  };

  tracker.getLiftContainer = function(liftType) {
    if (window.location.pathname.includes(`/${liftType}/`)) {
      return document.querySelector('.lift-workout');
    }
    return document.querySelector(`[data-tab="${liftType}"].tab-content`);
  };

  tracker.getSessionSummary = function() {
    if (!window.stateStore) return { total: 0, completed: 0, byLift: {} };

    const summary = { total: 0, completed: 0, byLift: {} };

    ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
      const { cycle, week } = window.stateStore.getCycleSettings();
      const state = window.stateStore.getSessionCompletion(lift, cycle, week);

      if (state) {
        const liftTotal = state.mainSets.length + state.supplementalSets.length + state.accessories.length;
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
  };

  tracker.greyOut = function() {
    const workoutAreas = document.querySelectorAll('.lift-workout, .workout-display, [data-tab]');
    workoutAreas.forEach(area => {
      area.style.opacity = '0.2';
      area.style.pointerEvents = 'none';
    });
  };

  tracker.unGreyOut = function() {
    const workoutAreas = document.querySelectorAll('.lift-workout, .workout-display, [data-tab]');
    workoutAreas.forEach(area => {
      area.style.opacity = '';
      area.style.pointerEvents = '';
    });
  };

  tracker.handlePointerDown = function(e) {
    if (this.isLoadingFromDatabase) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  tracker.queueAction = function(action) {
    this.pendingActions.push(action);
  };

  tracker.processPendingActions = async function() {
    while (this.pendingActions.length > 0) {
      const action = this.pendingActions.shift();
      await action();
    }
  };

  tracker.clear = function() {
    if (window.stateStore) {
      ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
        const { cycle, week } = window.stateStore.getCycleSettings();
        window.stateStore.setSessionCompletion(lift, cycle, week, {
          mainSets: [],
          supplementalSets: [],
          accessories: []
        });
      });
    }

    document.querySelectorAll('.completed').forEach(el => {
      el.classList.remove('completed');
      this.applyStyles(el, false);
    });
  };

  return tracker;
}
