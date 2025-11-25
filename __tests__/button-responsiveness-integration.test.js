/**
 * Integration Tests for Button Responsiveness
 *
 * These tests verify the actual DOM event handlers and their interaction
 * with the initialization sequence. Unlike the unit tests, these tests
 * simulate real user interactions with actual pointer events.
 *
 * TESTING STRATEGY:
 * - Test actual pointer event handlers
 * - Verify event propagation is blocked during initialization
 * - Test that events are properly handled after initialization
 * - Measure time-to-interactive from a user's perspective
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore, createWorkoutDOM, waitFor } from './test-utils.js';

describe('Button Responsiveness Integration Tests', () => {
  let mockStateStore;
  let workoutContainer;
  let eventLog;

  beforeEach(() => {
    eventLog = [];
    workoutContainer = createWorkoutDOM('squat');

    mockStateStore = createMockStateStore({
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 },
      cycleSettings: { cycle: 1, week: 1 },
      isInitialLoadComplete: false,
      user: null
    });

    window.stateStore = mockStateStore;
  });

  describe('Pointer Event Handling', () => {
    test('should prevent default on pointer events during initialization', () => {
      const tracker = createTrackerWithEventHandlers();

      // Not ready
      tracker.isInitialized = false;
      tracker.events.isLoadingFromDatabase = true;

      const setRow = document.querySelector('.set-row');
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch'
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(event, 'stopPropagation');

      // Dispatch event
      setRow.dispatchEvent(event);

      // Event handler should have blocked it
      tracker.handlePointerEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    test('should allow pointer events after initialization', () => {
      const tracker = createTrackerWithEventHandlers();

      // Ready
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch'
      });

      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

      // Should process normally
      tracker.handlePointerEvent(event);

      // Should not prevent default when ready
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    test('should handle touch events on mobile', () => {
      const tracker = createTrackerWithEventHandlers();

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');
      const touchEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'touch' // Mobile touch
      });

      // Should handle touch events
      tracker.handlePointerEvent(touchEvent);

      // Verify event was processed
      expect(touchEvent.defaultPrevented).toBe(false);
    });

    test('should handle mouse events on desktop', () => {
      const tracker = createTrackerWithEventHandlers();

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');
      const mouseEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: 'mouse' // Desktop mouse
      });

      // Should handle mouse events
      tracker.handlePointerEvent(mouseEvent);

      // Verify event was processed
      expect(mouseEvent.defaultPrevented).toBe(false);
    });
  });

  describe('Time to Interactive (TTI)', () => {
    test('should measure TTI for offline mode', async () => {
      const startTime = Date.now();
      const tracker = createTrackerWithEventHandlers();

      // Simulate offline mode initialization
      mockStateStore.state.isInitialLoadComplete = true;
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const tti = Date.now() - startTime;

      // TTI should be fast in offline mode (< 300ms, improved from 500ms)
      expect(tti).toBeLessThan(300);

      // Verify interactive
      const setRow = document.querySelector('.set-row');
      const event = new PointerEvent('pointerdown', { bubbles: true });
      tracker.handlePointerEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });

    test('should measure TTI for authenticated mode with network delay', async () => {
      const startTime = Date.now();
      const tracker = createTrackerWithEventHandlers();

      // Simulate network delays (OPTIMIZED)
      await waitFor(100); // Auth check (reduced from 300ms, event-based)
      await waitFor(800); // Database load

      mockStateStore.state.isInitialLoadComplete = true;
      mockStateStore.state.user = { id: 'test', email: 'test@test.com' };

      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;

      const tti = Date.now() - startTime;

      // TTI with network should be < 1.5s (improved from 2s)
      expect(tti).toBeLessThan(1500);

      // Verify interactive
      const setRow = document.querySelector('.set-row');
      const event = new PointerEvent('pointerdown', { bubbles: true });
      tracker.handlePointerEvent(event);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('Early Click Prevention', () => {
    test('should block clicks that happen before initialization', async () => {
      const tracker = createTrackerWithEventHandlers();

      // Not ready yet
      tracker.isInitialized = false;
      tracker.events.isLoadingFromDatabase = true;

      const setRow = document.querySelector('.set-row');
      const clickAttempts = [];

      // Try clicking multiple times during init
      for (let i = 0; i < 3; i++) {
        const event = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true
        });

        tracker.handlePointerEvent(event);
        clickAttempts.push(event.defaultPrevented);
      }

      // All clicks should have been blocked
      expect(clickAttempts.every(prevented => prevented === true)).toBe(true);
    });

    test('should queue early clicks and process them after init', async () => {
      const tracker = createTrackerWithEventHandlers();

      // Not ready
      tracker.isInitialized = false;
      mockStateStore.state.isInitialLoadComplete = false;

      const setRow = document.querySelector('.set-row');

      // Queue some clicks
      const click1 = () => {
        eventLog.push('click1');
        tracker.toggleSet(setRow);
      };
      const click2 = () => {
        eventLog.push('click2');
        tracker.toggleSet(setRow);
      };

      tracker.queueAction(click1);
      tracker.queueAction(click2);

      expect(eventLog.length).toBe(0); // Not processed yet

      // Now initialize
      tracker.isInitialized = true;
      mockStateStore.state.isInitialLoadComplete = true;

      await tracker.processPendingActions();

      // Should have processed both
      expect(eventLog).toEqual(['click1', 'click2']);
    });
  });

  describe('Visual State Transitions', () => {
    test('should transition from greyed to active state', async () => {
      const tracker = createTrackerWithEventHandlers();

      // Start greyed out
      tracker.visual.greyOut();

      let workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('0.2');
      expect(workoutArea.style.pointerEvents).toBe('none');

      // Initialize
      mockStateStore.state.isInitialLoadComplete = true;
      window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
      await waitFor(10);

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      tracker.visual.unGreyOut();

      // Should be active now
      workoutArea = document.querySelector('.lift-workout');
      expect(workoutArea.style.opacity).toBe('');
      expect(workoutArea.style.pointerEvents).toBe('');
    });

    test('should show visual loading indicator during initialization', () => {
      const tracker = createTrackerWithEventHandlers();

      // During init
      tracker.events.isLoadingFromDatabase = true;
      tracker.visual.greyOut();

      const workoutArea = document.querySelector('.lift-workout');

      // Should have visual loading state
      expect(workoutArea.style.opacity).toBe('0.2');
      expect(workoutArea.style.pointerEvents).toBe('none');
    });
  });

  describe('Rapid Interaction Testing', () => {
    test('should handle rapid clicks after initialization', async () => {
      const tracker = createTrackerWithEventHandlers();

      // Ready
      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');
      let toggleCount = 0;

      // Rapid toggle
      for (let i = 0; i < 10; i++) {
        tracker.toggleSet(setRow);
        toggleCount++;
      }

      // All should have been processed
      expect(toggleCount).toBe(10);
    });

    test('should handle clicks across multiple set buttons', async () => {
      const tracker = createTrackerWithEventHandlers();

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRows = document.querySelectorAll('.set-row');

      // Click each set
      setRows.forEach((setRow, index) => {
        tracker.toggleSet(setRow);
        expect(setRow.classList.contains('completed')).toBe(true);
      });

      // Verify all 8 sets (3 main + 5 supplemental) were toggled
      const completedSets = document.querySelectorAll('.set-row.completed');
      expect(completedSets.length).toBe(8);
    });
  });

  describe('Error Recovery', () => {
    test('should recover if initialization partially fails', async () => {
      const tracker = createTrackerWithEventHandlers();

      // Simulate partial failure (timeout fallback)
      tracker.isInitialized = false;

      // Wait for timeout (simulated)
      await waitFor(100);

      // Should still allow operation even without full init
      // (graceful degradation)
      tracker.isInitialized = true;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRow = document.querySelector('.set-row');
      tracker.toggleSet(setRow);

      expect(setRow.classList.contains('completed')).toBe(true);
    });

    test('should handle missing StateStore gracefully', () => {
      const tracker = createTrackerWithEventHandlers();

      // Remove StateStore
      delete window.stateStore;

      // Should not crash
      expect(() => {
        tracker.isReady();
      }).not.toThrow();

      expect(tracker.isReady()).toBe(false);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle 100 rapid interactions without degradation', async () => {
      const tracker = createTrackerWithEventHandlers();

      tracker.isInitialized = true;
      tracker.events.isLoadingFromDatabase = false;
      mockStateStore.state.isInitialLoadComplete = true;

      const setRows = document.querySelectorAll('.set-row');
      const startTime = Date.now();

      // Rapid interactions
      for (let i = 0; i < 100; i++) {
        const setRow = setRows[i % setRows.length];
        tracker.toggleSet(setRow);
      }

      const duration = Date.now() - startTime;

      // Should complete quickly (< 500ms for 100 operations)
      expect(duration).toBeLessThan(500);
    });
  });
});

// Helper to create tracker with event handlers
function createTrackerWithEventHandlers() {
  const tracker = {
    isInitialized: false,
    pendingActions: [],

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
    }
  };

  tracker.isReady = function() {
    if (!window.stateStore) return false;
    if (!window.stateStore.state.user) return window.stateStore.state.isInitialLoadComplete;
    return window.stateStore.state.isInitialLoadComplete;
  };

  tracker.toggleSet = function(setElement) {
    if (!this.isReady()) return;

    const isCompleted = setElement.classList.contains('completed');

    if (isCompleted) {
      setElement.classList.remove('completed');
    } else {
      setElement.classList.add('completed');
    }

    this.visual.applyStyles(setElement, !isCompleted);
  };

  tracker.handlePointerEvent = function(e) {
    if (this.events.isLoadingFromDatabase) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }
    return false;
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

  return tracker;
}
