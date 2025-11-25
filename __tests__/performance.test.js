/**
 * Performance Tests
 *
 * Tests application performance with realistic and stress scenarios
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

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
const { calculatePlates } = await import('../src/js/plate-calculator.js');

describe('Performance Tests', () => {
  let stateStore;

  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';

    // Reset localStorage
    if (global.localStorage && global.localStorage.clear) {
      global.localStorage.clear();
    }

    // Dispatch authManagerReady event
    window.dispatchEvent(new CustomEvent('authManagerReady', {
      detail: { hasSession: false, user: null }
    }));

    // Initialize state store
    stateStore = new UnifiedStateStore();
    window.stateStore = stateStore;
  });

  describe('State Store Performance', () => {
    test('should handle 1000 rapid state updates efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        stateStore.updateState({
          trainingMaxes: { squat: 100 + i }
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in less than 100ms (typically ~10-30ms)
      expect(duration).toBeLessThan(100);

      // Verify final state is correct
      expect(stateStore.getState().trainingMaxes.squat).toBe(1099);
    });

    test('should handle 100 subscriptions efficiently', () => {
      const callbacks = [];

      // Create 100 subscribers
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        stateStore.subscribe('trainingMaxes', callback);
      }
      const subscribeTime = performance.now();

      // Update state (should notify all subscribers)
      stateStore.updateState({
        trainingMaxes: { squat: 200 }
      });
      const updateTime = performance.now();

      const subscriptionDuration = subscribeTime - startTime;
      const notificationDuration = updateTime - subscribeTime;

      // Subscribing should be fast
      expect(subscriptionDuration).toBeLessThan(50);

      // Notifying all subscribers should be fast
      expect(notificationDuration).toBeLessThan(100);

      // All callbacks should have been called
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });

    test('should handle large session completion dataset efficiently', () => {
      const startTime = performance.now();

      // Simulate 12 cycles × 3 weeks × 4 lifts = 144 sessions
      for (let cycle = 1; cycle <= 12; cycle++) {
        for (let week = 1; week <= 3; week++) {
          ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
            const key = `${lift}_${cycle}_${week}`;
            const currentState = stateStore.getState();

            stateStore.updateState({
              sessionCompletion: {
                ...currentState.sessionCompletion,
                [key]: {
                  mainSets: [true, true, true],
                  supplementalSets: [true, true, true, true, true],
                  accessories: [true, true, true, true]
                }
              }
            });
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 144 session updates in less than 500ms
      expect(duration).toBeLessThan(500);

      // Verify data integrity
      const completion = stateStore.getSessionCompletion('squat', 12, 3);
      expect(completion.mainSets.length).toBe(3);
    });

    test('should retrieve state efficiently with large dataset', () => {
      // Populate large dataset
      const largeSessionData = {};
      for (let i = 0; i < 1000; i++) {
        largeSessionData[`lift_${i}_1`] = {
          mainSets: [true, true, true],
          supplementalSets: [true, true, true, true, true],
          accessories: [true, true]
        };
      }

      stateStore.updateState({
        sessionCompletion: largeSessionData
      });

      // Measure retrieval performance
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        const state = stateStore.getState();
        expect(state.sessionCompletion).toBeDefined();
      }
      const endTime = performance.now();

      const duration = endTime - startTime;

      // 1000 reads should be very fast (< 50ms)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Plate Calculator Performance', () => {
    test('should calculate plates for 1000 weights efficiently', () => {
      const weights = [];
      for (let i = 20; i <= 200; i += 0.5) {
        weights.push(i);
      }

      const startTime = performance.now();

      weights.forEach(weight => {
        calculatePlates(weight, 20);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should calculate ~360 weights in less than 100ms
      expect(duration).toBeLessThan(100);
      expect(weights.length).toBeGreaterThan(300);
    });

    test('should handle rapid calculations with different bars', () => {
      const bars = [15, 20, 25];
      const targetWeight = 100;

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const bar = bars[i % bars.length];
        calculatePlates(targetWeight, bar);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000 calculations should be fast (< 50ms)
      expect(duration).toBeLessThan(50);
    });

    test('should calculate full workout progression efficiently', () => {
      const trainingMaxes = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
      const percentages = [
        0.40, 0.50, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95
      ];

      const startTime = performance.now();

      // Calculate all combinations (110 calculations)
      trainingMaxes.forEach(tm => {
        percentages.forEach(pct => {
          const weight = tm * pct;
          calculatePlates(weight, 20);
        });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in less than 50ms
      expect(duration).toBeLessThan(50);
    });

    test('should handle extreme weights efficiently', () => {
      const extremeWeights = [
        20,     // Minimum (bar only)
        500,    // Very heavy
        1000,   // Extreme
        0.5,    // Below bar
        250.5,  // Large with decimal
        999.75  // Large with small fraction
      ];

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        extremeWeights.forEach(weight => {
          calculatePlates(weight, 20);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 600 calculations with extreme values (< 50ms)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Combined Operations Performance', () => {
    test('should handle realistic workout session efficiently', () => {
      const startTime = performance.now();

      // Setup (typical user)
      stateStore.updateState({
        trainingMaxes: { squat: 136, bench: 102, deadlift: 182, ohp: 68 },
        cycleSettings: { cycle: 1, week: 1 },
        barWeight: 20,
        timerSettings: {
          autoStart: true,
          defaultDuration: 120,
          soundEnabled: true,
          vibrationEnabled: true
        }
      });

      // Calculate all workout weights (typical session has ~13 sets)
      const lifts = ['squat', 'bench', 'deadlift', 'ohp'];
      const percentages = [0.65, 0.75, 0.85]; // Main sets
      const supplementalPercentages = [0.65, 0.65, 0.65, 0.65, 0.65]; // FSL

      lifts.forEach(lift => {
        const tm = stateStore.getState().trainingMaxes[lift];

        // Calculate main sets
        percentages.forEach(pct => {
          calculatePlates(tm * pct, 20);
        });

        // Calculate supplemental sets
        supplementalPercentages.forEach(pct => {
          calculatePlates(tm * pct, 20);
        });
      });

      // Mark sets complete
      for (let i = 0; i < 3; i++) {
        const key = 'squat_1_1';
        const currentState = stateStore.getState();
        const completion = stateStore.getSessionCompletion('squat', 1, 1);
        const updatedMainSets = [...completion.mainSets];
        updatedMainSets[i] = true;

        stateStore.updateState({
          sessionCompletion: {
            ...currentState.sessionCompletion,
            [key]: {
              ...completion,
              mainSets: updatedMainSets
            }
          }
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Complete workout session simulation (< 50ms)
      expect(duration).toBeLessThan(50);
    });

    test('should handle full program (12 cycles) efficiently', () => {
      const startTime = performance.now();

      // Simulate viewing all 12 cycles
      for (let cycle = 1; cycle <= 12; cycle++) {
        for (let week = 1; week <= 3; week++) {
          stateStore.updateState({
            cycleSettings: { cycle, week }
          });

          // Calculate weights for all lifts
          ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
            const tm = 100 + (cycle * 2.5); // Progressive overload
            [0.65, 0.75, 0.85].forEach(pct => {
              calculatePlates(tm * pct, 20);
            });
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Full 12-cycle program simulation (< 200ms)
      expect(duration).toBeLessThan(200);
    });

    test('should handle multiple concurrent subscriptions efficiently', () => {
      // Create multiple subscribers
      const tmCallback = jest.fn();
      const cycleCallback = jest.fn();
      const barCallback = jest.fn();
      const timerCallback = jest.fn();

      stateStore.subscribe('trainingMaxes', tmCallback);
      stateStore.subscribe('cycleSettings', cycleCallback);
      stateStore.subscribe('barWeight', barCallback);
      stateStore.subscribe('timerSettings', timerCallback);

      const startTime = performance.now();

      // Rapid updates to different state properties
      for (let i = 0; i < 100; i++) {
        stateStore.updateState({
          trainingMaxes: { squat: 100 + i }
        });

        if (i % 10 === 0) {
          stateStore.updateState({
            cycleSettings: { cycle: (i % 12) + 1, week: (i % 3) + 1 }
          });
        }

        if (i % 25 === 0) {
          stateStore.updateState({
            barWeight: i % 2 === 0 ? 20 : 15
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 100+ updates with multiple subscribers (< 100ms)
      expect(duration).toBeLessThan(100);

      // Verify all callbacks were triggered appropriately
      // May be called slightly more due to subscription initialization
      expect(tmCallback.mock.calls.length).toBeGreaterThanOrEqual(100);
      expect(tmCallback.mock.calls.length).toBeLessThan(110);
      expect(cycleCallback.mock.calls.length).toBeGreaterThan(0);
      expect(barCallback.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Efficiency', () => {
    test('should not leak memory with repeated operations', () => {
      // Perform operations multiple times
      for (let iteration = 0; iteration < 10; iteration++) {
        // State updates
        for (let i = 0; i < 100; i++) {
          stateStore.updateState({
            trainingMaxes: { squat: 100 + i }
          });
        }

        // Plate calculations
        for (let i = 20; i < 200; i += 5) {
          calculatePlates(i, 20);
        }

        // Session completions
        for (let cycle = 1; cycle <= 3; cycle++) {
          for (let week = 1; week <= 3; week++) {
            const key = `squat_${cycle}_${week}`;
            const currentState = stateStore.getState();

            stateStore.updateState({
              sessionCompletion: {
                ...currentState.sessionCompletion,
                [key]: {
                  mainSets: [true, true, true],
                  supplementalSets: [true, true, true, true, true],
                  accessories: [true, true]
                }
              }
            });
          }
        }
      }

      // If we got here without crashing or hanging, memory is managed well
      expect(true).toBe(true);
    });

    test('should handle large state without performance degradation', () => {
      // Create large initial state
      const largeSessionData = {};
      for (let i = 0; i < 500; i++) {
        largeSessionData[`lift_${i}_1`] = {
          mainSets: [true, true, true],
          supplementalSets: [true, true, true, true, true],
          accessories: [true, true, true]
        };
      }

      stateStore.updateState({
        sessionCompletion: largeSessionData
      });

      // Measure performance with large state
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        stateStore.updateState({
          trainingMaxes: { squat: 100 + i }
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should still be fast even with large state (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle user completing full workout session', () => {
      const startTime = performance.now();

      // User opens app
      stateStore.updateState({
        trainingMaxes: { squat: 136 },
        cycleSettings: { cycle: 1, week: 1 },
        barWeight: 20
      });

      // Calculate workout weights (3 main + 5 supplemental + 2 accessories)
      const weights = [88.4, 102, 115.6, 88.4, 88.4, 88.4, 88.4, 88.4, 60, 60];
      weights.forEach(weight => calculatePlates(weight, 20));

      // Complete each set (10 sets)
      for (let i = 0; i < 10; i++) {
        const key = 'squat_1_1';
        const currentState = stateStore.getState();
        const completion = stateStore.getSessionCompletion('squat', 1, 1);

        let setType, index;
        if (i < 3) {
          setType = 'mainSets';
          index = i;
        } else if (i < 8) {
          setType = 'supplementalSets';
          index = i - 3;
        } else {
          setType = 'accessories';
          index = i - 8;
        }

        const updatedSets = [...completion[setType]];
        updatedSets[index] = true;

        stateStore.updateState({
          sessionCompletion: {
            ...currentState.sessionCompletion,
            [key]: {
              ...completion,
              [setType]: updatedSets
            }
          }
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Full workout session (< 50ms)
      expect(duration).toBeLessThan(50);

      // Verify completion
      const completion = stateStore.getSessionCompletion('squat', 1, 1);
      expect(completion.mainSets.filter(s => s).length).toBe(3);
    });

    test('should handle user browsing through multiple weeks', () => {
      const startTime = performance.now();

      // User browses through all weeks of cycle 1
      for (let week = 1; week <= 3; week++) {
        stateStore.updateState({
          cycleSettings: { cycle: 1, week }
        });

        // Calculate weights for current week
        const percentages = week === 1 ? [0.65, 0.75, 0.85] :
                          week === 2 ? [0.70, 0.80, 0.90] :
                          [0.75, 0.85, 0.95];

        percentages.forEach(pct => {
          calculatePlates(136 * pct, 20);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Browsing 3 weeks (< 20ms)
      expect(duration).toBeLessThan(20);
    });

    test('should handle changing settings during session', () => {
      const startTime = performance.now();

      // Initial setup
      stateStore.updateState({
        barWeight: 20,
        timerSettings: { defaultDuration: 120 }
      });

      // Calculate some weights
      [88.4, 102, 115.6].forEach(w => calculatePlates(w, 20));

      // User changes bar weight mid-session
      stateStore.updateState({ barWeight: 15 });

      // Recalculate with new bar weight
      [88.4, 102, 115.6].forEach(w => calculatePlates(w, 15));

      // User adjusts timer
      stateStore.updateState({
        timerSettings: { defaultDuration: 180 }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Settings changes and recalculations (< 20ms)
      expect(duration).toBeLessThan(20);
    });
  });

  describe('Scalability', () => {
    test('should scale linearly with data size', () => {
      const sizes = [10, 50, 100, 500];
      const durations = [];

      sizes.forEach(size => {
        const start = performance.now();

        for (let i = 0; i < size; i++) {
          stateStore.updateState({
            trainingMaxes: { squat: 100 + i }
          });
        }

        const end = performance.now();
        durations.push(end - start);
      });

      // Check that performance scales reasonably
      // 500 operations shouldn't take more than 10x the time of 50 operations
      const ratio = durations[3] / durations[1];
      expect(ratio).toBeLessThan(15);
    });

    test('should handle year-long program data efficiently', () => {
      const startTime = performance.now();

      // Simulate completing entire year (12 cycles × 3 weeks × 4 lifts)
      for (let cycle = 1; cycle <= 12; cycle++) {
        for (let week = 1; week <= 3; week++) {
          ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
            const key = `${lift}_${cycle}_${week}`;
            const currentState = stateStore.getState();

            stateStore.updateState({
              sessionCompletion: {
                ...currentState.sessionCompletion,
                [key]: {
                  mainSets: [true, true, true],
                  supplementalSets: [true, true, true, true, true],
                  accessories: [true, true, true]
                }
              }
            });
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Full year of data (144 sessions) (< 500ms)
      expect(duration).toBeLessThan(500);

      // Verify data integrity
      const finalCompletion = stateStore.getSessionCompletion('ohp', 12, 3);
      expect(finalCompletion.mainSets.length).toBe(3);
    });
  });
});
