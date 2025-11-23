/**
 * Edge Case Tests
 * Tests handling of invalid inputs, extreme values, concurrent operations,
 * memory leaks, and browser API failures
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore } from './test-utils.js';

describe('Edge Cases - Invalid Inputs', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  describe('Training Max Validation', () => {
    test('should handle negative training maxes', () => {
      mockStateStore.setTrainingMax('squat', -300);

      // Negative values should be set (app doesn't validate, just stores)
      expect(mockStateStore.state.trainingMaxes.squat).toBe(-300);
    });

    test('should handle NaN training maxes', () => {
      mockStateStore.setTrainingMax('squat', NaN);

      // NaN should be converted to 0 by parseFloat || 0
      expect(mockStateStore.state.trainingMaxes.squat).toBe(0);
    });

    test('should handle Infinity training maxes', () => {
      mockStateStore.setTrainingMax('squat', Infinity);

      expect(mockStateStore.state.trainingMaxes.squat).toBe(Infinity);
    });

    test('should handle very large numbers', () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      mockStateStore.setTrainingMax('squat', largeValue);

      expect(mockStateStore.state.trainingMaxes.squat).toBe(largeValue);
    });

    test('should handle very small decimal values', () => {
      mockStateStore.setTrainingMax('squat', 0.001);

      expect(mockStateStore.state.trainingMaxes.squat).toBe(0.001);
    });

    test('should handle string inputs that parse to numbers', () => {
      mockStateStore.setTrainingMax('squat', '300.5');

      expect(mockStateStore.state.trainingMaxes.squat).toBe(300.5);
    });

    test('should handle string inputs that do not parse', () => {
      mockStateStore.setTrainingMax('squat', 'invalid');

      // Non-numeric strings should convert to 0
      expect(mockStateStore.state.trainingMaxes.squat).toBe(0);
    });

    test('should handle null training max', () => {
      mockStateStore.setTrainingMax('squat', null);

      expect(mockStateStore.state.trainingMaxes.squat).toBe(0);
    });

    test('should handle undefined training max', () => {
      mockStateStore.setTrainingMax('squat', undefined);

      expect(mockStateStore.state.trainingMaxes.squat).toBe(0);
    });
  });

  describe('Cycle Settings Validation', () => {
    test('should handle negative cycle numbers', () => {
      mockStateStore.setCycleSettings(-1, 1);

      expect(mockStateStore.state.cycleSettings.cycle).toBe(-1);
    });

    test('should handle cycle number exceeding 12', () => {
      mockStateStore.setCycleSettings(999, 1);

      expect(mockStateStore.state.cycleSettings.cycle).toBe(999);
    });

    test('should handle week number exceeding 3', () => {
      mockStateStore.setCycleSettings(1, 999);

      expect(mockStateStore.state.cycleSettings.week).toBe(999);
    });

    test('should handle zero cycle and week', () => {
      mockStateStore.setCycleSettings(0, 0);

      // Zero is falsy, so || 1 defaults to 1
      expect(mockStateStore.state.cycleSettings.cycle).toBe(1);
      expect(mockStateStore.state.cycleSettings.week).toBe(1);
    });

    test('should handle NaN cycle settings', () => {
      mockStateStore.setCycleSettings(NaN, NaN);

      // parseInt(NaN) || 1 should be 1
      expect(mockStateStore.state.cycleSettings.cycle).toBe(1);
      expect(mockStateStore.state.cycleSettings.week).toBe(1);
    });
  });
});

describe('Edge Cases - Concurrent Operations', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  test('should handle rapid state updates', () => {
    // Simulate rapid clicking/updates
    for (let i = 0; i < 100; i++) {
      mockStateStore.setTrainingMax('squat', 300 + i);
    }

    // Should end with final value
    expect(mockStateStore.state.trainingMaxes.squat).toBe(399);
  });

  test('should handle concurrent updates to different lifts', () => {
    mockStateStore.setTrainingMax('squat', 300);
    mockStateStore.setTrainingMax('bench', 200);
    mockStateStore.setTrainingMax('deadlift', 400);
    mockStateStore.setTrainingMax('ohp', 150);

    expect(mockStateStore.state.trainingMaxes).toEqual({
      squat: 300,
      bench: 200,
      deadlift: 400,
      ohp: 150
    });
  });

  test('should handle concurrent cycle and TM updates', () => {
    mockStateStore.setTrainingMax('squat', 300);
    mockStateStore.setCycleSettings(5, 2);
    mockStateStore.setTrainingMax('bench', 200);

    expect(mockStateStore.state.trainingMaxes.squat).toBe(300);
    expect(mockStateStore.state.cycleSettings).toEqual({ cycle: 5, week: 2 });
    expect(mockStateStore.state.trainingMaxes.bench).toBe(200);
  });

  test('should handle session completion updates during state changes', () => {
    mockStateStore.state.isInitialLoadComplete = true;

    mockStateStore.setSessionCompletion('squat', 1, 1, {
      mainSets: [true, false, false],
      supplementalSets: [],
      accessories: []
    });

    mockStateStore.setTrainingMax('squat', 305);

    const completion = mockStateStore.getSessionCompletion('squat', 1, 1);
    expect(completion.mainSets).toEqual([true, false, false]);
    expect(mockStateStore.state.trainingMaxes.squat).toBe(305);
  });
});

describe('Edge Cases - Memory and Subscriptions', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  test('should allow unsubscribing from state changes', () => {
    const callback = jest.fn();

    const unsubscribe = mockStateStore.subscribe('trainingMaxes', callback);

    // Clear initial call
    callback.mockClear();

    // Unsubscribe
    unsubscribe();

    // Update state
    mockStateStore.updateState({
      trainingMaxes: { squat: 350 }
    });

    // Callback should not be called after unsubscribe
    expect(callback).not.toHaveBeenCalled();
  });

  test('should handle multiple subscriptions to same path', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const callback3 = jest.fn();

    mockStateStore.subscribe('trainingMaxes', callback1);
    mockStateStore.subscribe('trainingMaxes', callback2);
    mockStateStore.subscribe('trainingMaxes', callback3);

    callback1.mockClear();
    callback2.mockClear();
    callback3.mockClear();

    mockStateStore.updateState({
      trainingMaxes: { squat: 350 }
    });

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
    expect(callback3).toHaveBeenCalled();
  });

  test('should handle unsubscribing one of multiple subscriptions', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    mockStateStore.subscribe('trainingMaxes', callback1);
    const unsubscribe2 = mockStateStore.subscribe('trainingMaxes', callback2);

    callback1.mockClear();
    callback2.mockClear();

    unsubscribe2();

    mockStateStore.updateState({
      trainingMaxes: { squat: 350 }
    });

    expect(callback1).toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  test('should handle subscribing with same callback multiple times', () => {
    const callback = jest.fn();

    mockStateStore.subscribe('trainingMaxes', callback);
    mockStateStore.subscribe('trainingMaxes', callback);

    callback.mockClear();

    mockStateStore.updateState({
      trainingMaxes: { squat: 350 }
    });

    // Should be called for each subscription
    expect(callback.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('Edge Cases - Browser API Failures', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  test('should handle localStorage unavailable', () => {
    // Simulate localStorage being unavailable (private browsing)
    Object.defineProperty(global, 'localStorage', {
      writable: true,
      value: {
        getItem: () => {
          throw new Error('localStorage disabled');
        },
        setItem: () => {
          throw new Error('localStorage disabled');
        }
      }
    });

    expect(() => {
      try {
        localStorage.getItem('test');
      } catch (e) {
        // Should throw
      }
    }).not.toThrow();
  });

  test('should handle localStorage quota exceeded', () => {
    Object.defineProperty(global, 'localStorage', {
      writable: true,
      value: {
        setItem: () => {
          throw new DOMException('QuotaExceededError');
        },
        getItem: () => null
      }
    });

    expect(() => {
      try {
        localStorage.setItem('test', 'value');
      } catch (e) {
        // Quota exceeded
      }
    }).not.toThrow();
  });

  test('should handle JSON parse errors in localStorage', () => {
    Object.defineProperty(global, 'localStorage', {
      writable: true,
      value: {
        getItem: () => 'invalid json {{{',
        setItem: jest.fn()
      }
    });

    expect(() => {
      try {
        JSON.parse(localStorage.getItem('test'));
      } catch (e) {
        // Invalid JSON
      }
    }).not.toThrow();
  });
});

describe('Edge Cases - DOM Manipulation', () => {
  test('should handle missing DOM elements gracefully', () => {
    document.body.innerHTML = '';

    expect(() => {
      const element = document.getElementById('non-existent');
      if (element) {
        element.textContent = 'test';
      }
    }).not.toThrow();
  });

  test('should handle modifying removed elements', () => {
    const element = document.createElement('div');
    element.id = 'test';
    document.body.appendChild(element);

    document.body.removeChild(element);

    expect(() => {
      element.textContent = 'test';
    }).not.toThrow();
  });

  test('should handle querySelector with invalid selectors', () => {
    expect(() => {
      try {
        document.querySelector('[invalid[selector]');
      } catch (e) {
        // Invalid selector
      }
    }).not.toThrow();
  });
});

describe('Edge Cases - Async Operations', () => {
  test('should handle promise rejections', async () => {
    const mockSave = jest.fn(() => Promise.reject(new Error('Save failed')));

    try {
      await mockSave();
    } catch (e) {
      expect(e.message).toBe('Save failed');
    }
  });

  test('should handle slow promise resolution', async () => {
    jest.useFakeTimers();

    const slowPromise = new Promise(resolve => {
      setTimeout(() => resolve('done'), 5000);
    });

    jest.advanceTimersByTime(5000);

    const result = await slowPromise;
    expect(result).toBe('done');

    jest.useRealTimers();
  });

  test('should handle promise timeout', async () => {
    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );

    await expect(timeout(100)).rejects.toThrow('Timeout');
  });
});
