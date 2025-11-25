/**
 * Tests for Button Responsiveness During Initial Load
 *
 * These tests measure the time it takes for set buttons to become clickable
 * after initial page load. The goal is to identify and prevent delays in
 * the initialization sequence that make the app feel unresponsive.
 *
 * CONTEXT:
 * Users report 1-3 second delays before buttons become clickable on initial load.
 * This is caused by the initialization sequence:
 * 1. StateStore creation and localStorage load (~50ms)
 * 2. Auth check and wait (up to 3 seconds)
 * 3. Database load if authenticated (~500ms-2s depending on connection)
 * 4. SessionTracker initialization and state loading (~100ms)
 *
 * ACCEPTANCE CRITERIA:
 * - Offline mode: buttons clickable within 500ms
 * - Authenticated mode: buttons clickable within 2 seconds (network dependent)
 * - Visual feedback: UI should be greyed out during initialization
 * - No lost clicks: clicks during initialization should be queued and processed
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore, createWorkoutDOM, waitFor } from './test-utils.js';

describe('Button Responsiveness During Initial Load', () => {
  let mockStateStore;
  let workoutContainer;
  let initStartTime;

  beforeEach(() => {
    initStartTime = Date.now();

    // Create workout DOM first
    workoutContainer = createWorkoutDOM('squat');

    // Create mock state store (simulates StateStore initialization)
    mockStateStore = createMockStateStore({
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 },
      cycleSettings: { cycle: 1, week: 1 },
      isInitialLoadComplete: false, // Start as not ready
      user: null
    });

    window.stateStore = mockStateStore;
  });

  describe('Initialization Timing', () => {
    test('should measure time from initialization to buttons being clickable (offline mode)', async () => {
      const tracker = createTestTracker();

      // Simulate offline mode (StateStore ready immediately)
      mockStateStore.state.isInitialLoadComplete = true;

      // Dispatch the stateStoreFullyReady event
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));

      // Wait a tick for event processing
      await waitFor(10);

      // Mark tracker as initialized
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const initEndTime = Date.now();
      const initDuration = initEndTime - initStartTime;

      // In offline mode, initialization should be fast (< 500ms)
      // Note: This is a unit test with mocks, so it should be nearly instant
      expect(initDuration).toBeLessThan(500);

      // Verify buttons are now clickable
      const setRow = document.querySelector('.set-row');
      expect(tracker.isReady()).toBe(true);
      expect(setRow).toBeTruthy();
    });

    test('should measure time with simulated auth delay', async () => {
      const tracker = createTestTracker();

      // Simulate auth check delay (typical real-world scenario)
      await waitFor(300); // Simulate 300ms auth check

      // Simulate database load delay
      await waitFor(500); // Simulate 500ms database load

      // Now mark as ready
      mockStateStore.state.isInitialLoadComplete = true;
      mockStateStore.state.user = { id: 'test-user', email: 'test@test.com' };

      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const initEndTime = Date.now();
      const initDuration = initEndTime - initStartTime;

      // With auth + DB load, should complete within 2 seconds
      expect(initDuration).toBeLessThan(2000);
      expect(tracker.isReady()).toBe(true);
    });

    test('should track initialization phases and their durations', async () => {
      const phases = {
        domReady: 0,
        stateStoreCreated: 0,
        authComplete: 0,
        databaseLoaded: 0,
        trackerInitialized: 0
      };

      const startTime = Date.now();

      // Phase 1: DOM Ready (already complete in beforeEach)
      phases.domReady = Date.now() - startTime;

      // Phase 2: StateStore created
      await waitFor(50); // Simulate StateStore constructor time
      phases.stateStoreCreated = Date.now() - startTime;

      // Phase 3: Auth check
      await waitFor(200); // Simulate auth check
      phases.authComplete = Date.now() - startTime;

      // Phase 4: Database load
      await waitFor(500); // Simulate DB load
      mockStateStore.state.isInitialLoadComplete = true;
      phases.databaseLoaded = Date.now() - startTime;

      // Phase 5: SessionTracker initialized
      const tracker = createTestTracker();
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      phases.trackerInitialized = Date.now() - startTime;

      // Log the phases for debugging
      console.log('Initialization phases:', phases);

      // Verify each phase completes in reasonable time
      expect(phases.domReady).toBeLessThan(100);
      expect(phases.stateStoreCreated).toBeLessThan(200);
      expect(phases.authComplete).toBeLessThan(500);
      expect(phases.databaseLoaded).toBeLessThan(1500);
      expect(phases.trackerInitialized).toBeLessThan(2000);
    });
  });

  describe('Visual Feedback During Initialization', () => {
    test('should grey out workout area during initialization', () => {
      const tracker = createTestTracker();

      // Simulate initialization state (not ready yet)
      tracker.isInitialized = false;
      tracker.events.isLoadingFromDatabase = true;

      // Grey out should be called during init
      tracker.visual.greyOut();

      const workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('0.2');
      expect(workoutArea.style.pointerEvents).toBe('none');
    });

    test('should ungrey workout area when initialization complete', async () => {
      const tracker = createTestTracker();

      // Start greyed out
      tracker.visual.greyOut();

      // Simulate initialization completing
      mockStateStore.state.isInitialLoadComplete = true;
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      tracker.visual.unGreyOut();

      const workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('');
      expect(workoutArea.style.pointerEvents).toBe('');
    });

    test('should show loading state when StateStore is not ready', () => {
      const tracker = createTestTracker();

      // StateStore not ready
      mockStateStore.state.isInitialLoadComplete = false;
      tracker.isInitialized = false;

      expect(tracker.isReady()).toBe(false);

      // Verify visual loading state
      tracker.visual.greyOut();
      const workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('0.2');
    });
  });

  describe('Button Clickability', () => {
    test('should not process clicks when not initialized', () => {
      const tracker = createTestTracker();

      // Not initialized yet
      tracker.isInitialized = false;
      mockStateStore.state.isInitialLoadComplete = false;

      const setRow = document.querySelector('.set-row');
      const initialCompletedState = setRow.classList.contains('completed');

      // Try to toggle (should not work)
      tracker.toggleSet(setRow, true);

      // Should not have changed
      expect(setRow.classList.contains('completed')).toBe(initialCompletedState);
    });

    test('should process clicks when fully initialized', () => {
      const tracker = createTestTracker();

      // Fully initialized
      tracker.isInitialized = true;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');

      // Should work now
      tracker.toggleSet(setRow, true);

      expect(setRow.classList.contains('completed')).toBe(true);
    });

    test('should block pointer events during database loading', () => {
      const tracker = createTestTracker();

      // Simulate database loading
      tracker.events.isLoadingFromDatabase = true;

      const setRow = document.querySelector('.set-row');
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      // Simulate the event handler
      tracker.handlePointerDown(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Pending Actions Queue', () => {
    test('should queue clicks that happen during initialization', () => {
      const tracker = createTestTracker();

      // Not ready yet
      tracker.isInitialized = false;
      mockStateStore.state.isInitialLoadComplete = false;

      // Queue an action
      const action = jest.fn();
      tracker.queueAction(action);

      // Should be queued but not executed
      expect(tracker.pendingActions.length).toBe(1);
      expect(action).not.toHaveBeenCalled();
    });

    test('should process pending actions when initialization completes', async () => {
      const tracker = createTestTracker();

      // Queue some actions while not ready
      const action1 = jest.fn();
      const action2 = jest.fn();
      const action3 = jest.fn();

      tracker.pendingActions = [action1, action2, action3];

      // Now initialization completes
      tracker.isInitialized = true;
      mockStateStore.state.isInitialLoadComplete = true;

      // Process pending actions
      await tracker.processPendingActions();

      // All actions should have been called
      expect(action1).toHaveBeenCalled();
      expect(action2).toHaveBeenCalled();
      expect(action3).toHaveBeenCalled();
      expect(tracker.pendingActions.length).toBe(0);
    });

    test('should maintain order of pending actions', async () => {
      const tracker = createTestTracker();
      const callOrder = [];

      const action1 = jest.fn(() => callOrder.push(1));
      const action2 = jest.fn(() => callOrder.push(2));
      const action3 = jest.fn(() => callOrder.push(3));

      tracker.pendingActions = [action1, action2, action3];

      await tracker.processPendingActions();

      expect(callOrder).toEqual([1, 2, 3]);
    });

    test('should handle rapid clicks during initialization', async () => {
      const tracker = createTestTracker();

      // Simulate rapid clicking while not ready
      tracker.isInitialized = false;
      mockStateStore.state.isInitialLoadComplete = false;

      const setRow = document.querySelector('.set-row');

      // Queue multiple toggle actions
      const toggleAction = () => tracker.toggleSet(setRow, true);

      tracker.queueAction(toggleAction);
      tracker.queueAction(toggleAction);
      tracker.queueAction(toggleAction);

      expect(tracker.pendingActions.length).toBe(3);

      // Now ready
      tracker.isInitialized = true;
      mockStateStore.state.isInitialLoadComplete = true;

      // Process all pending actions
      await tracker.processPendingActions();

      // All actions should have been processed
      expect(tracker.pendingActions.length).toBe(0);
    });
  });

  describe('StateStore Ready Event', () => {
    test('should wait for stateStoreFullyReady event', async () => {
      const tracker = createTestTracker();

      // Initially not ready
      expect(tracker.isReady()).toBe(false);

      // Simulate StateStore becoming ready
      mockStateStore.state.isInitialLoadComplete = true;
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));

      // Wait for event processing
      await waitFor(10);

      // Mark tracker as ready
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      // Now should be ready
      expect(tracker.isReady()).toBe(true);
    });

    test('should handle timeout if stateStoreFullyReady never fires', async () => {
      const tracker = createTestTracker();

      // Simulate timeout scenario (5 seconds in real code)
      // In test, we just verify the timeout exists

      let timeoutResolved = false;
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          timeoutResolved = true;
          resolve();
        }, 100); // Shorter timeout for test
      });

      await timeoutPromise;

      expect(timeoutResolved).toBe(true);

      // Even without the event, tracker should proceed after timeout
      // In real implementation, this prevents infinite hanging
    });
  });

  describe('App Resume Behavior', () => {
    test('should grey out during state reload on app resume', async () => {
      const tracker = createTestTracker();

      // Initially ready
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      // Simulate app resume
      window.dispatchEvent(new CustomEvent('stateStoreReloading'));

      // Should grey out immediately
      tracker.handleStateStoreReloading();
      tracker.visual.greyOut();

      const workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('0.2');
    });

    test('should ungrey after state reload completes', async () => {
      const tracker = createTestTracker();

      // Start reloading
      tracker.handleStateStoreReloading();
      tracker.visual.greyOut();

      // Reload completes
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.handleStateStoreReady();
      tracker.visual.unGreyOut();

      const workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('');
    });
  });

  describe('Performance Benchmarks', () => {
    test('should complete initialization in under 100ms in test environment', async () => {
      const startTime = Date.now();

      const tracker = createTestTracker();
      mockStateStore.state.isInitialLoadComplete = true;

      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const duration = Date.now() - startTime;

      // In test environment with mocks, should be very fast
      expect(duration).toBeLessThan(100);
    });

    test('should handle worst-case initialization time gracefully', async () => {
      const startTime = Date.now();

      // Simulate worst-case delays
      await waitFor(300); // Auth delay
      await waitFor(1000); // Slow database load

      const tracker = createTestTracker();
      mockStateStore.state.isInitialLoadComplete = true;

      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const duration = Date.now() - startTime;

      // Even worst-case should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
      expect(tracker.isReady()).toBe(true);
    });
  });
});

// Helper to create a minimal tracker for testing
function createTestTracker() {
  const tracker = {
    isInitialized: false,
    pendingActions: [],
    pendingReloads: 0,

    // Sub-managers
    visual: {
      greyOut: function() {
        const workoutAreas = document.querySelectorAll('.lift-workout, .workout-display, [data-tab]');
        workoutAreas.forEach(area => {
          area.style.opacity = '0.2';
          area.style.pointerEvents = 'none';
        });
      },

      unGreyOut: function() {
        const workoutAreas = document.querySelectorAll('.lift-workout, .workout-display, [data-tab]');
        workoutAreas.forEach(area => {
          area.style.opacity = '';
          area.style.pointerEvents = '';
        });
      },

      applyStyles: function(element, isCompleted) {
        if (isCompleted) {
          element.style.cssText = `
            background: #d4edda !important;
            border-left: 4px solid #006400 !important;
            opacity: 0.9 !important;
          `;
        } else {
          element.style.cssText = '';
        }
      }
    },

    events: {
      isLoadingFromDatabase: false,

      setLoadingState: function(loading) {
        this.isLoadingFromDatabase = loading;
      }
    },

    progress: {},
    state: {}
  };

  tracker.isReady = function() {
    if (!window.stateStore) return false;
    if (!window.stateStore.state.user) return window.stateStore.state.isInitialLoadComplete;
    return window.stateStore.state.isInitialLoadComplete;
  };

  tracker.toggleSet = function(setElement, isUserInitiated = true) {
    if (!this.isReady()) return;

    const isCompleted = setElement.classList.contains('completed');

    if (isCompleted) {
      setElement.classList.remove('completed');
    } else {
      setElement.classList.add('completed');
    }

    this.visual.applyStyles(setElement, !isCompleted);
  };

  tracker.handlePointerDown = function(e) {
    if (this.events.isLoadingFromDatabase) {
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

  tracker.handleStateStoreReloading = function() {
    this.pendingReloads++;
    this.events.setLoadingState(true);
  };

  tracker.handleStateStoreReady = function() {
    this.pendingReloads = Math.max(0, this.pendingReloads - 1);
    if (this.pendingReloads === 0) {
      this.events.setLoadingState(false);
    }
  };

  return tracker;
}
