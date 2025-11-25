/**
 * Integration Tests
 *
 * Tests cross-component functionality and workflows using simplified test doubles
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Supabase before importing other modules
jest.unstable_mockModule('../src/js/supabase.js', () => ({
  getSupabase: jest.fn(() => Promise.resolve({
    from: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [], error: null })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      update: jest.fn(() => Promise.resolve({ data: [], error: null })),
      upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  })),
  supabase: null,
}));

// Import modules after mocking
const { UnifiedStateStore } = await import('../src/js/simplified-state-store.js');
const { calculatePlates, BAR_WEIGHTS } = await import('../src/js/plate-calculator.js');

describe('Integration Tests', () => {
  let stateStore;

  // Helper function to update session completion
  function updateSessionCompletion(store, lift, cycle, week, setType, index, completed) {
    const key = `${lift}_${cycle}_${week}`;
    const currentCompletion = store.getSessionCompletion(lift, cycle, week);

    // Update the specific set
    const updatedSets = [...currentCompletion[setType]];
    updatedSets[index] = completed;

    // Update state
    const currentState = store.getState();
    store.updateState({
      sessionCompletion: {
        ...currentState.sessionCompletion,
        [key]: {
          ...currentCompletion,
          [setType]: updatedSets
        }
      }
    });
  }

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Reset localStorage
    if (global.localStorage && global.localStorage.clear) {
      global.localStorage.clear();
    }

    // Mock navigator.vibrate
    global.navigator = { vibrate: jest.fn() };

    // Dispatch authManagerReady event to unblock state store
    window.dispatchEvent(new CustomEvent('authManagerReady', {
      detail: { hasSession: false, user: null }
    }));

    // Initialize state store
    stateStore = new UnifiedStateStore();
    window.stateStore = stateStore;

    // Use fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('State Management Integration', () => {
    test('should persist and retrieve training maxes', () => {
      // Set training maxes
      stateStore.updateState({
        trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 }
      });

      // Retrieve training maxes
      const state = stateStore.getState();
      expect(state.trainingMaxes.squat).toBe(300);
      expect(state.trainingMaxes.bench).toBe(200);
      expect(state.trainingMaxes.deadlift).toBe(400);
      expect(state.trainingMaxes.ohp).toBe(150);
    });

    test('should persist and retrieve cycle settings', () => {
      stateStore.updateState({
        cycleSettings: { cycle: 5, week: 2 }
      });

      const state = stateStore.getState();
      expect(state.cycleSettings.cycle).toBe(5);
      expect(state.cycleSettings.week).toBe(2);
    });

    test('should persist and retrieve bar weight', () => {
      stateStore.updateState({ barWeight: 15 });

      const state = stateStore.getState();
      expect(state.barWeight).toBe(15);
    });

    test('should persist and retrieve timer settings', () => {
      const newSettings = {
        autoStart: false,
        defaultDuration: 180,
        soundEnabled: false,
        vibrationEnabled: true
      };

      stateStore.updateState({ timerSettings: newSettings });

      const state = stateStore.getState();
      expect(state.timerSettings).toEqual(newSettings);
    });

    test('should handle multiple state updates in sequence', () => {
      stateStore.updateState({ trainingMaxes: { squat: 100 } });
      stateStore.updateState({ cycleSettings: { cycle: 1, week: 1 } });
      stateStore.updateState({ barWeight: 20 });

      const state = stateStore.getState();
      expect(state.trainingMaxes.squat).toBe(100);
      expect(state.cycleSettings.cycle).toBe(1);
      expect(state.barWeight).toBe(20);
    });

    test('should trigger subscribers on state changes', () => {
      const callback = jest.fn();
      stateStore.subscribe('trainingMaxes', callback);

      stateStore.updateState({ trainingMaxes: { squat: 200 } });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('Plate Calculator Integration', () => {
    test('should calculate plates for workout progression with 20kg bar', () => {
      const trainingMax = 100; // 100kg

      // Week 1, Set 1: 65% = 65kg
      const set1 = calculatePlates(trainingMax * 0.65, 20);
      expect(set1.totalWeight).toBeCloseTo(65, 1);
      expect(set1.plates).toContain(20);
      expect(set1.plates).toContain(2.5);

      // Week 1, Set 2: 75% = 75kg
      const set2 = calculatePlates(trainingMax * 0.75, 20);
      expect(set2.totalWeight).toBeCloseTo(75, 1);

      // Week 1, Set 3: 85% = 85kg
      const set3 = calculatePlates(trainingMax * 0.85, 20);
      expect(set3.totalWeight).toBeCloseTo(85, 1);
    });

    test('should calculate plates differently for 15kg vs 20kg bar', () => {
      const targetWeight = 100; // 100kg

      // With 20kg bar
      const result20kg = calculatePlates(targetWeight, 20);
      expect(result20kg.perSide).toBe(40); // 80kg on plates / 2

      // With 15kg bar
      const result15kg = calculatePlates(targetWeight, 15);
      expect(result15kg.perSide).toBe(42.5); // 85kg on plates / 2

      // Different plates needed
      expect(result20kg.plates).not.toEqual(result15kg.plates);
    });

    test('should handle bar-only weight', () => {
      const result = calculatePlates(20, 20);
      expect(result.plates).toEqual([]);
      expect(result.totalWeight).toBe(20);
      expect(result.message).toBe('No plates needed');
    });

    test('should calculate plates for typical 531 weights', () => {
      // Typical progression for 300 lbs (136 kg) training max
      const weights = [
        { percent: 0.40, weight: 54.4 }, // First Set Last
        { percent: 0.50, weight: 68 },   // First Set Last
        { percent: 0.60, weight: 81.6 }, // First Set Last
        { percent: 0.65, weight: 88.4 }, // Week 1, Set 1
        { percent: 0.75, weight: 102 },  // Week 1, Set 2
        { percent: 0.85, weight: 115.6 } // Week 1, Set 3
      ];

      weights.forEach(({ weight }) => {
        const result = calculatePlates(weight, 20);
        expect(result.totalWeight).toBeCloseTo(weight, 0); // Round to integer
        expect(result.plates.length).toBeGreaterThan(0);
      });
    });

    test('should handle custom bar weights', () => {
      const targetWeight = 80;

      // Test with various bar weights
      const bars = [15, 20, 25];
      bars.forEach(barWeight => {
        const result = calculatePlates(targetWeight, barWeight);
        expect(result.barWeight).toBe(barWeight);
        expect(result.totalWeight).toBeCloseTo(targetWeight, 0.5);
      });
    });
  });

  describe('State and Plate Calculator Integration', () => {
    test('should use stored bar weight for plate calculations', () => {
      // Set bar weight in state
      stateStore.updateState({ barWeight: 15 });

      // Get bar weight from state and use in calculation
      const state = stateStore.getState();
      const result = calculatePlates(100, state.barWeight);

      expect(result.barWeight).toBe(15);
      expect(result.perSide).toBe(42.5); // (100 - 15) / 2
    });

    test('should recalculate plates when bar weight changes', () => {
      const targetWeight = 100;

      // Initial calculation with 20kg bar
      stateStore.updateState({ barWeight: 20 });
      let state = stateStore.getState();
      const result1 = calculatePlates(targetWeight, state.barWeight);
      expect(result1.perSide).toBe(40);

      // Change bar weight to 15kg
      stateStore.updateState({ barWeight: 15 });
      state = stateStore.getState();
      const result2 = calculatePlates(targetWeight, state.barWeight);
      expect(result2.perSide).toBe(42.5);

      // Results should be different
      expect(result1.plates).not.toEqual(result2.plates);
    });
  });

  describe('Session Completion Integration', () => {
    test('should store session completion state', () => {
      const cycle = 1;
      const week = 1;
      const lift = 'squat';

      // Mark sets as complete
      updateSessionCompletion(stateStore, lift, cycle, week, 'mainSets', 0, true);
      updateSessionCompletion(stateStore, lift, cycle, week, 'mainSets', 1, true);
      updateSessionCompletion(stateStore, lift, cycle, week, 'mainSets', 2, true);

      // Retrieve completion
      const completion = stateStore.getSessionCompletion(lift, cycle, week);
      expect(completion.mainSets[0]).toBe(true);
      expect(completion.mainSets[1]).toBe(true);
      expect(completion.mainSets[2]).toBe(true);
    });

    test('should handle multiple lift sessions', () => {
      const cycle = 1;
      const week = 1;

      // Complete squat session
      updateSessionCompletion(stateStore, 'squat', cycle, week, 'mainSets', 0, true);
      updateSessionCompletion(stateStore, 'squat', cycle, week, 'mainSets', 1, true);

      // Complete bench session
      updateSessionCompletion(stateStore, 'bench', cycle, week, 'mainSets', 0, true);

      // Check both sessions
      const squatCompletion = stateStore.getSessionCompletion('squat', cycle, week);
      const benchCompletion = stateStore.getSessionCompletion('bench', cycle, week);

      expect(squatCompletion.mainSets[0]).toBe(true);
      expect(squatCompletion.mainSets[1]).toBe(true);
      expect(benchCompletion.mainSets[0]).toBe(true);
    });

    test('should handle different set types', () => {
      const cycle = 1;
      const week = 1;
      const lift = 'squat';

      // Complete different set types
      updateSessionCompletion(stateStore, lift, cycle, week, 'mainSets', 0, true);
      updateSessionCompletion(stateStore, lift, cycle, week, 'supplementalSets', 0, true);
      updateSessionCompletion(stateStore, lift, cycle, week, 'accessories', 0, true);

      const completion = stateStore.getSessionCompletion(lift, cycle, week);
      expect(completion.mainSets[0]).toBe(true);
      expect(completion.supplementalSets[0]).toBe(true);
      expect(completion.accessories[0]).toBe(true);
    });
  });

  describe('Timer Settings Integration', () => {
    test('should store and retrieve all timer settings', () => {
      const settings = {
        autoStart: true,
        defaultDuration: 120,
        soundEnabled: true,
        vibrationEnabled: true
      };

      stateStore.updateState({ timerSettings: settings });

      const retrieved = stateStore.getState().timerSettings;
      expect(retrieved.autoStart).toBe(true);
      expect(retrieved.defaultDuration).toBe(120);
      expect(retrieved.soundEnabled).toBe(true);
      expect(retrieved.vibrationEnabled).toBe(true);
    });

    test('should handle partial timer settings updates', () => {
      // Set initial settings
      stateStore.updateState({
        timerSettings: {
          autoStart: true,
          defaultDuration: 120,
          soundEnabled: true,
          vibrationEnabled: true
        }
      });

      // Update only duration
      const currentSettings = stateStore.getState().timerSettings;
      stateStore.updateState({
        timerSettings: {
          ...currentSettings,
          defaultDuration: 180
        }
      });

      const updated = stateStore.getState().timerSettings;
      expect(updated.autoStart).toBe(true); // unchanged
      expect(updated.defaultDuration).toBe(180); // changed
      expect(updated.soundEnabled).toBe(true); // unchanged
    });

    test('should support different timer durations', () => {
      const durations = [90, 120, 180, 300];

      durations.forEach(duration => {
        stateStore.updateState({
          timerSettings: { defaultDuration: duration }
        });

        const settings = stateStore.getState().timerSettings;
        expect(settings.defaultDuration).toBe(duration);
      });
    });
  });

  describe('Complete Workout Flow Integration', () => {
    test('should handle full workout progression', () => {
      // Setup initial state
      stateStore.updateState({
        trainingMaxes: { squat: 100 },
        cycleSettings: { cycle: 1, week: 1 },
        barWeight: 20,
        timerSettings: {
          autoStart: true,
          defaultDuration: 120
        }
      });

      // Calculate workout weights
      const tm = 100;
      const set1Weight = tm * 0.65;
      const set2Weight = tm * 0.75;
      const set3Weight = tm * 0.85;

      // Get plate calculations
      const set1Plates = calculatePlates(set1Weight, 20);
      const set2Plates = calculatePlates(set2Weight, 20);
      const set3Plates = calculatePlates(set3Weight, 20);

      // Verify calculations
      expect(set1Plates.totalWeight).toBeCloseTo(65, 1);
      expect(set2Plates.totalWeight).toBeCloseTo(75, 1);
      expect(set3Plates.totalWeight).toBeCloseTo(85, 1);

      // Complete sets
      updateSessionCompletion(stateStore, 'squat', 1, 1, 'mainSets', 0, true);
      updateSessionCompletion(stateStore, 'squat', 1, 1, 'mainSets', 1, true);
      updateSessionCompletion(stateStore, 'squat', 1, 1, 'mainSets', 2, true);

      // Verify completion
      const completion = stateStore.getSessionCompletion('squat', 1, 1);
      expect(completion.mainSets.filter(s => s).length).toBe(3);

      // Progress to next week
      stateStore.updateState({
        cycleSettings: { cycle: 1, week: 2 }
      });

      expect(stateStore.getState().cycleSettings.week).toBe(2);
    });

    test('should handle settings changes during workout', () => {
      // Start workout with default settings
      stateStore.updateState({
        barWeight: 20,
        timerSettings: { defaultDuration: 120 }
      });

      // Complete first set
      updateSessionCompletion(stateStore, 'squat', 1, 1, 'mainSets', 0, true);

      // Change settings mid-workout
      stateStore.updateState({
        barWeight: 15,
        timerSettings: { defaultDuration: 180 }
      });

      // Settings should be updated
      const state = stateStore.getState();
      expect(state.barWeight).toBe(15);
      expect(state.timerSettings.defaultDuration).toBe(180);

      // Previous completion should still be saved
      const completion = stateStore.getSessionCompletion('squat', 1, 1);
      expect(completion.mainSets[0]).toBe(true);
    });
  });

  describe('Multi-Component State Synchronization', () => {
    test('should keep all state properties synchronized', () => {
      const initialState = {
        trainingMaxes: { squat: 100, bench: 80, deadlift: 120, ohp: 60 },
        cycleSettings: { cycle: 2, week: 3 },
        barWeight: 20,
        timerSettings: {
          autoStart: true,
          defaultDuration: 120,
          soundEnabled: true,
          vibrationEnabled: true
        }
      };

      stateStore.updateState(initialState);

      const state = stateStore.getState();
      expect(state.trainingMaxes).toEqual(initialState.trainingMaxes);
      expect(state.cycleSettings).toEqual(initialState.cycleSettings);
      expect(state.barWeight).toBe(initialState.barWeight);
      expect(state.timerSettings).toEqual(initialState.timerSettings);
    });

    test('should handle rapid state updates', () => {
      for (let i = 1; i <= 10; i++) {
        stateStore.updateState({
          cycleSettings: { cycle: i, week: 1 }
        });
      }

      const state = stateStore.getState();
      expect(state.cycleSettings.cycle).toBe(10);
    });

    test('should maintain state consistency across subscriptions', () => {
      const trainingMaxCallback = jest.fn();
      const cycleCallback = jest.fn();

      stateStore.subscribe('trainingMaxes', trainingMaxCallback);
      stateStore.subscribe('cycleSettings', cycleCallback);

      stateStore.updateState({
        trainingMaxes: { squat: 150 },
        cycleSettings: { cycle: 3, week: 2 }
      });

      expect(trainingMaxCallback).toHaveBeenCalled();
      expect(cycleCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle zero training max', () => {
      stateStore.updateState({
        trainingMaxes: { squat: 0 }
      });

      const state = stateStore.getState();
      expect(state.trainingMaxes.squat).toBe(0);
    });

    test('should handle negative weights gracefully', () => {
      // State should accept any value, validation is elsewhere
      stateStore.updateState({
        trainingMaxes: { squat: -100 }
      });

      const state = stateStore.getState();
      expect(state.trainingMaxes.squat).toBe(-100);
    });

    test('should handle missing session data', () => {
      const completion = stateStore.getSessionCompletion('squat', 99, 99);
      expect(completion).toBeTruthy();
      expect(completion.mainSets).toBeDefined();
    });

    test('should handle very large training maxes', () => {
      const largeMax = 1000;
      stateStore.updateState({
        trainingMaxes: { squat: largeMax }
      });

      const result = calculatePlates(largeMax * 0.85, 20);
      expect(result.totalWeight).toBeCloseTo(850, 1);
      expect(result.plates.length).toBeGreaterThan(0);
    });
  });
});
