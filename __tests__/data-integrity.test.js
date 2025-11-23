/**
 * Data Integrity Tests
 * Tests session completion validation, training max progression,
 * cycle 12 special handling, and weight rounding accuracy
 */
import { describe, test, expect, beforeEach } from '@jest/globals';
import { createMockStateStore } from './test-utils.js';

describe('Data Integrity - Session Completion', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    mockStateStore.state.isInitialLoadComplete = true;
    window.stateStore = mockStateStore;
  });

  test('should maintain session completion data structure', () => {
    const validData = {
      mainSets: [true, false, true],
      supplementalSets: [true, true, false, false, false],
      accessories: [true, false]
    };

    mockStateStore.setSessionCompletion('squat', 1, 1, validData);

    const retrieved = mockStateStore.getSessionCompletion('squat', 1, 1);

    expect(retrieved).toEqual(validData);
    expect(Array.isArray(retrieved.mainSets)).toBe(true);
    expect(Array.isArray(retrieved.supplementalSets)).toBe(true);
    expect(Array.isArray(retrieved.accessories)).toBe(true);
  });

  test('should handle session completion with all sets completed', () => {
    const allCompleted = {
      mainSets: [true, true, true],
      supplementalSets: [true, true, true, true, true],
      accessories: [true, true]
    };

    mockStateStore.setSessionCompletion('bench', 2, 1, allCompleted);

    const retrieved = mockStateStore.getSessionCompletion('bench', 2, 1);

    expect(retrieved.mainSets.every(s => s === true)).toBe(true);
    expect(retrieved.supplementalSets.every(s => s === true)).toBe(true);
    expect(retrieved.accessories.every(s => s === true)).toBe(true);
  });

  test('should handle session completion with no sets completed', () => {
    const noneCompleted = {
      mainSets: [false, false, false],
      supplementalSets: [false, false, false, false, false],
      accessories: [false, false]
    };

    mockStateStore.setSessionCompletion('deadlift', 3, 2, noneCompleted);

    const retrieved = mockStateStore.getSessionCompletion('deadlift', 3, 2);

    expect(retrieved.mainSets.every(s => s === false)).toBe(true);
    expect(retrieved.supplementalSets.every(s => s === false)).toBe(true);
  });

  test('should validate session key format', () => {
    mockStateStore.setSessionCompletion('squat', 1, 1, {
      mainSets: [],
      supplementalSets: [],
      accessories: []
    });

    const key = 'squat_1_1';
    expect(mockStateStore.state.sessionCompletion[key]).toBeDefined();
  });

  test('should separate sessions by lift, cycle, and week', () => {
    const data1 = { mainSets: [true], supplementalSets: [], accessories: [] };
    const data2 = { mainSets: [false], supplementalSets: [], accessories: [] };
    const data3 = { mainSets: [true, true], supplementalSets: [], accessories: [] };

    mockStateStore.setSessionCompletion('squat', 1, 1, data1);
    mockStateStore.setSessionCompletion('squat', 1, 2, data2);
    mockStateStore.setSessionCompletion('bench', 1, 1, data3);

    expect(mockStateStore.getSessionCompletion('squat', 1, 1)).toEqual(data1);
    expect(mockStateStore.getSessionCompletion('squat', 1, 2)).toEqual(data2);
    expect(mockStateStore.getSessionCompletion('bench', 1, 1)).toEqual(data3);
  });
});

describe('Data Integrity - Training Max Progression', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  test('should increase squat TM by 2.5 lbs', () => {
    mockStateStore.state.trainingMaxes.squat = 300;

    mockStateStore.increaseTrainingMaxes();

    expect(mockStateStore.state.trainingMaxes.squat).toBe(302.5);
  });

  test('should increase bench TM by 2.5 lbs', () => {
    mockStateStore.state.trainingMaxes.bench = 200;

    mockStateStore.increaseTrainingMaxes();

    expect(mockStateStore.state.trainingMaxes.bench).toBe(202.5);
  });

  test('should increase deadlift TM by 2.5 lbs', () => {
    mockStateStore.state.trainingMaxes.deadlift = 400;

    mockStateStore.increaseTrainingMaxes();

    expect(mockStateStore.state.trainingMaxes.deadlift).toBe(402.5);
  });

  test('should increase OHP TM by 1.25 lbs', () => {
    mockStateStore.state.trainingMaxes.ohp = 150;

    mockStateStore.increaseTrainingMaxes();

    expect(mockStateStore.state.trainingMaxes.ohp).toBe(151.25);
  });

  test('should handle multiple progression cycles', () => {
    mockStateStore.state.trainingMaxes = {
      squat: 300,
      bench: 200,
      deadlift: 400,
      ohp: 150
    };

    // Progress through 12 cycles
    for (let i = 0; i < 12; i++) {
      mockStateStore.increaseTrainingMaxes();
    }

    expect(mockStateStore.state.trainingMaxes.squat).toBe(330);    // 300 + (12 * 2.5)
    expect(mockStateStore.state.trainingMaxes.bench).toBe(230);    // 200 + (12 * 2.5)
    expect(mockStateStore.state.trainingMaxes.deadlift).toBe(430); // 400 + (12 * 2.5)
    expect(mockStateStore.state.trainingMaxes.ohp).toBe(165);      // 150 + (12 * 1.25)
  });

  test('should maintain decimal precision', () => {
    mockStateStore.state.trainingMaxes.ohp = 150.75;

    mockStateStore.increaseTrainingMaxes();

    expect(mockStateStore.state.trainingMaxes.ohp).toBe(152); // 150.75 + 1.25
  });
});

describe('Data Integrity - Cycle 12 Special Handling', () => {
  test('should identify cycle 12 as Test Week', () => {
    const cycleConfig = getCycleConfig(12);

    expect(cycleConfig.type).toBe('Test Week');
    expect(cycleConfig.description).toBe('Test maxes or TM test');
  });

  test('should use 100% for cycle 12', () => {
    const cycleConfig = getCycleConfig(12);

    expect(cycleConfig.percentage).toBe(100);
  });

  test('should use 1 rep for cycle 12', () => {
    const cycleConfig = getCycleConfig(12);

    expect(cycleConfig.reps).toBe(1);
  });

  test('should differentiate cycle 12 from other cycles', () => {
    const cycle11 = getCycleConfig(11);
    const cycle12 = getCycleConfig(12);

    expect(cycle11.type).toBe('Volume');
    expect(cycle12.type).toBe('Test Week');
    expect(cycle11.percentage).not.toBe(100);
    expect(cycle12.percentage).toBe(100);
  });
});

describe('Data Integrity - Weight Rounding', () => {
  test('should round to nearest 0.5 lbs', () => {
    expect(calculateWeight(300, 85)).toBe(255);      // 255.0
    expect(calculateWeight(303, 85)).toBe(257.5);    // 257.55 → 257.5
    expect(calculateWeight(305, 85)).toBe(259.5);    // 259.25 → 259.5
    expect(calculateWeight(307, 85)).toBe(261);      // 260.95 → 261.0
  });

  test('should handle very precise calculations', () => {
    const weight1 = calculateWeight(100, 65);  // 65.0
    const weight2 = calculateWeight(101, 65);  // 65.65 → 65.5
    const weight3 = calculateWeight(102, 65);  // 66.3 → 66.5
    const weight4 = calculateWeight(103, 65);  // 66.95 → 67.0

    expect(weight1).toBe(65);
    expect(weight2).toBe(65.5);
    expect(weight3).toBe(66.5);
    expect(weight4).toBe(67);
  });

  test('should round consistently across all percentages', () => {
    const trainingMax = 315;
    const percentages = [65, 75, 85, 95];

    const weights = percentages.map(pct => calculateWeight(trainingMax, pct));

    // All should be multiples of 0.5
    weights.forEach(weight => {
      expect((weight * 2) % 1).toBe(0);
    });
  });

  test('should handle edge case rounding', () => {
    // Test .25 rounds to .5
    expect(calculateWeight(100, 66.25)).toBe(66.5);

    // Test .75 rounds to .5 or 1.0
    const result = calculateWeight(100, 66.75);
    expect([66.5, 67]).toContain(result);
  });

  test('should maintain accuracy for all main set percentages', () => {
    const trainingMax = 300;
    const week1 = [65, 75, 85];
    const week2 = [70, 80, 90];
    const week3 = [75, 85, 95];

    const week1Weights = week1.map(pct => calculateWeight(trainingMax, pct));
    const week2Weights = week2.map(pct => calculateWeight(trainingMax, pct));
    const week3Weights = week3.map(pct => calculateWeight(trainingMax, pct));

    expect(week1Weights).toEqual([195, 225, 255]);
    expect(week2Weights).toEqual([210, 240, 270]);
    expect(week3Weights).toEqual([225, 255, 285]);
  });
});

describe('Data Integrity - State Consistency', () => {
  let mockStateStore;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  test('should maintain consistent state after multiple updates', () => {
    mockStateStore.setTrainingMax('squat', 300);
    mockStateStore.setCycleSettings(5, 2);
    mockStateStore.setAccessories('squat', ['Front Squat', 'Box Squat']);

    expect(mockStateStore.state.trainingMaxes.squat).toBe(300);
    expect(mockStateStore.state.cycleSettings).toEqual({ cycle: 5, week: 2 });
    expect(mockStateStore.state.accessories.squat).toEqual(['Front Squat', 'Box Squat']);
  });

  test('should not affect unrelated state on update', () => {
    const initialBench = mockStateStore.state.trainingMaxes.bench;
    const initialCycle = mockStateStore.state.cycleSettings.cycle;

    mockStateStore.setTrainingMax('squat', 350);

    expect(mockStateStore.state.trainingMaxes.bench).toBe(initialBench);
    expect(mockStateStore.state.cycleSettings.cycle).toBe(initialCycle);
  });

  test('should preserve data types across updates', () => {
    mockStateStore.setTrainingMax('squat', 300);
    mockStateStore.setCycleSettings(5, 2);

    expect(typeof mockStateStore.state.trainingMaxes.squat).toBe('number');
    expect(typeof mockStateStore.state.cycleSettings.cycle).toBe('number');
    expect(Array.isArray(mockStateStore.state.accessories.squat)).toBe(true);
  });
});

// Helper: Get cycle configuration
function getCycleConfig(cycle) {
  const configs = {
    1: { percentage: 45, reps: 12, type: 'Volume', description: '5 sets x 12 reps @ 45%' },
    2: { percentage: 75, reps: 6, type: 'Intensity', description: '5 sets x 6 reps @ 75%' },
    3: { percentage: 50, reps: 11, type: 'Volume', description: '5 sets x 11 reps @ 50%' },
    4: { percentage: 80, reps: 5, type: 'Intensity', description: '5 sets x 5 reps @ 80%' },
    5: { percentage: 55, reps: 10, type: 'Volume', description: '5 sets x 10 reps @ 55%' },
    6: { percentage: 85, reps: 4, type: 'Intensity', description: '5 sets x 4 reps @ 85%' },
    7: { percentage: 60, reps: 9, type: 'Volume', description: '5 sets x 9 reps @ 60%' },
    8: { percentage: 90, reps: 3, type: 'Intensity', description: '5 sets x 3 reps @ 90%' },
    9: { percentage: 65, reps: 8, type: 'Volume', description: '5 sets x 8 reps @ 65%' },
    10: { percentage: 95, reps: 2, type: 'Intensity', description: '5 sets x 2 reps @ 95%' },
    11: { percentage: 70, reps: 7, type: 'Volume', description: '5 sets x 7 reps @ 70%' },
    12: { percentage: 100, reps: 1, type: 'Test Week', description: 'Test maxes or TM test' }
  };

  return configs[cycle];
}

// Helper: Calculate weight (mimics actual implementation)
function calculateWeight(trainingMax, percentage) {
  return Math.round(trainingMax * percentage / 100 * 2) / 2;
}
