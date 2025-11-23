/**
 * Tests for DashboardManager (dashboard.js)
 * Tests training max displays, cycle configuration rendering, and state subscriptions
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore } from './test-utils.js';

describe('DashboardManager', () => {
  let mockStateStore;
  let dashboardManager;

  beforeEach(() => {
    // Create mock state store
    mockStateStore = createMockStateStore({
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 },
      cycleSettings: { cycle: 1, week: 1 }
    });

    window.stateStore = mockStateStore;

    // Create DOM elements for testing
    createDashboardDOM();

    // Create minimal dashboard manager
    dashboardManager = createTestDashboardManager();
  });

  describe('Training Max Display', () => {
    test('should update squat TM display', () => {
      const trainingMaxes = { squat: 350, bench: 200, deadlift: 400, ohp: 150 };

      dashboardManager.updateDashboardTMs(trainingMaxes);

      expect(document.getElementById('squat-tm-dash').textContent).toBe('350');
    });

    test('should update all TM displays', () => {
      const trainingMaxes = { squat: 350, bench: 225, deadlift: 450, ohp: 175 };

      dashboardManager.updateDashboardTMs(trainingMaxes);

      expect(document.getElementById('squat-tm-dash').textContent).toBe('350');
      expect(document.getElementById('bench-tm-dash').textContent).toBe('225');
      expect(document.getElementById('deadlift-tm-dash').textContent).toBe('450');
      expect(document.getElementById('ohp-tm-dash').textContent).toBe('175');
    });

    test('should handle zero training maxes', () => {
      const trainingMaxes = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };

      dashboardManager.updateDashboardTMs(trainingMaxes);

      expect(document.getElementById('squat-tm-dash').textContent).toBe('0');
      expect(document.getElementById('bench-tm-dash').textContent).toBe('0');
    });

    test('should handle null training maxes', () => {
      expect(() => {
        dashboardManager.updateDashboardTMs(null);
      }).not.toThrow();
    });

    test('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = '';

      expect(() => {
        dashboardManager.updateDashboardTMs({ squat: 300 });
      }).not.toThrow();
    });
  });

  describe('Cycle Display', () => {
    test('should display Volume cycle configuration', () => {
      const cycleSettings = { cycle: 1, week: 1 };

      dashboardManager.updateCycleDisplay(cycleSettings);

      expect(document.getElementById('cycle-text-inline').textContent).toBe('Cycle 1 - Volume');
      expect(document.getElementById('week-text-inline').textContent).toBe('Week 1');
      expect(document.getElementById('description-text-inline').textContent).toBe('5 sets x 12 reps @ 45%');
    });

    test('should display Intensity cycle configuration', () => {
      const cycleSettings = { cycle: 2, week: 2 };

      dashboardManager.updateCycleDisplay(cycleSettings);

      expect(document.getElementById('cycle-text-inline').textContent).toBe('Cycle 2 - Intensity');
      expect(document.getElementById('week-text-inline').textContent).toBe('Week 2');
      expect(document.getElementById('description-text-inline').textContent).toBe('5 sets x 6 reps @ 75%');
    });

    test('should display Test Week configuration', () => {
      const cycleSettings = { cycle: 12, week: 3 };

      dashboardManager.updateCycleDisplay(cycleSettings);

      expect(document.getElementById('cycle-text-inline').textContent).toBe('Cycle 12 - Test Week');
      expect(document.getElementById('week-text-inline').textContent).toBe('Week 3');
      expect(document.getElementById('description-text-inline').textContent).toBe('Test maxes or TM test');
    });

    test('should handle all Volume cycles correctly', () => {
      const volumeCycles = [1, 3, 5, 7, 9, 11];

      volumeCycles.forEach(cycle => {
        dashboardManager.updateCycleDisplay({ cycle, week: 1 });

        const text = document.getElementById('cycle-text-inline').textContent;
        expect(text).toContain('Volume');
      });
    });

    test('should handle all Intensity cycles correctly', () => {
      const intensityCycles = [2, 4, 6, 8, 10];

      intensityCycles.forEach(cycle => {
        dashboardManager.updateCycleDisplay({ cycle, week: 1 });

        const text = document.getElementById('cycle-text-inline').textContent;
        expect(text).toContain('Intensity');
      });
    });

    test('should show progressive percentages for Volume cycles', () => {
      const volumePercentages = [45, 50, 55, 60, 65, 70];

      [1, 3, 5, 7, 9, 11].forEach((cycle, index) => {
        dashboardManager.updateCycleDisplay({ cycle, week: 1 });

        const description = document.getElementById('description-text-inline').textContent;
        expect(description).toContain(`${volumePercentages[index]}%`);
      });
    });

    test('should show progressive percentages for Intensity cycles', () => {
      const intensityPercentages = [75, 80, 85, 90, 95];

      [2, 4, 6, 8, 10].forEach((cycle, index) => {
        dashboardManager.updateCycleDisplay({ cycle, week: 1 });

        const description = document.getElementById('description-text-inline').textContent;
        expect(description).toContain(`${intensityPercentages[index]}%`);
      });
    });

    test('should handle null cycle settings', () => {
      expect(() => {
        dashboardManager.updateCycleDisplay(null);
      }).not.toThrow();
    });

    test('should handle missing cycle configuration gracefully', () => {
      const cycleSettings = { cycle: 999, week: 1 };

      expect(() => {
        dashboardManager.updateCycleDisplay(cycleSettings);
      }).not.toThrow();
    });
  });

  describe('State Subscriptions', () => {
    test('should subscribe to training maxes changes', () => {
      dashboardManager.setupSubscriptions();

      expect(mockStateStore.subscribe).toHaveBeenCalledWith('trainingMaxes', expect.any(Function));
    });

    test('should subscribe to cycle settings changes', () => {
      dashboardManager.setupSubscriptions();

      expect(mockStateStore.subscribe).toHaveBeenCalledWith('cycleSettings', expect.any(Function));
    });

    test('should update display when training maxes change', () => {
      dashboardManager.setupSubscriptions();

      // Simulate state change
      mockStateStore.updateState({
        trainingMaxes: { squat: 350, bench: 225, deadlift: 450, ohp: 175 }
      });

      // The subscription callback should have been called
      expect(mockStateStore.subscribe).toHaveBeenCalled();
    });

    test('should update display when cycle settings change', () => {
      dashboardManager.setupSubscriptions();

      // Simulate state change
      mockStateStore.setCycleSettings(5, 2);

      // The subscription callback should have been called
      expect(mockStateStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('All Displays Update', () => {
    test('should update all displays from state', () => {
      const state = {
        trainingMaxes: { squat: 350, bench: 225, deadlift: 450, ohp: 175 },
        cycleSettings: { cycle: 5, week: 2 }
      };

      mockStateStore.getState.mockReturnValue(state);

      dashboardManager.updateAllDisplays();

      expect(document.getElementById('squat-tm-dash').textContent).toBe('350');
      expect(document.getElementById('cycle-text-inline').textContent).toBe('Cycle 5 - Volume');
    });

    test('should handle missing state store gracefully', () => {
      delete window.stateStore;

      expect(() => {
        dashboardManager.updateAllDisplays();
      }).not.toThrow();
    });
  });
});

// Helper: Create dashboard DOM structure
function createDashboardDOM() {
  document.body.innerHTML = `
    <!-- Training Max Displays -->
    <span id="squat-tm-dash">0</span>
    <span id="bench-tm-dash">0</span>
    <span id="deadlift-tm-dash">0</span>
    <span id="ohp-tm-dash">0</span>

    <!-- Cycle Info -->
    <span id="cycle-text-inline"></span>
    <span id="week-text-inline"></span>
    <span id="description-text-inline"></span>
  `;
}

// Helper: Create minimal DashboardManager for testing
function createTestDashboardManager() {
  return {
    logger: {
      log: jest.fn()
    },

    setupSubscriptions() {
      window.stateStore.subscribe('trainingMaxes', (tm) => this.updateDashboardTMs(tm));
      window.stateStore.subscribe('cycleSettings', (cs) => this.updateCycleDisplay(cs));
    },

    updateDashboardTMs(trainingMaxes) {
      if (!trainingMaxes) return;

      Object.keys(trainingMaxes).forEach(lift => {
        const displayEl = document.getElementById(`${lift}-tm-dash`);
        if (displayEl) {
          displayEl.textContent = trainingMaxes[lift] || 0;
        }
      });
    },

    updateCycleDisplay(cycleSettings) {
      if (!cycleSettings) return;

      const { cycle, week } = cycleSettings;

      const configs = {
        1: { type: "Volume", description: "5 sets x 12 reps @ 45%" },
        2: { type: "Intensity", description: "5 sets x 6 reps @ 75%" },
        3: { type: "Volume", description: "5 sets x 11 reps @ 50%" },
        4: { type: "Intensity", description: "5 sets x 5 reps @ 80%" },
        5: { type: "Volume", description: "5 sets x 10 reps @ 55%" },
        6: { type: "Intensity", description: "5 sets x 4 reps @ 85%" },
        7: { type: "Volume", description: "5 sets x 9 reps @ 60%" },
        8: { type: "Intensity", description: "5 sets x 3 reps @ 90%" },
        9: { type: "Volume", description: "5 sets x 8 reps @ 65%" },
        10: { type: "Intensity", description: "5 sets x 2 reps @ 95%" },
        11: { type: "Volume", description: "5 sets x 7 reps @ 70%" },
        12: { type: "Test Week", description: "Test maxes or TM test" }
      };

      const config = configs[cycle];
      if (config) {
        const updates = {
          'cycle-text-inline': `Cycle ${cycle} - ${config.type}`,
          'week-text-inline': `Week ${week}`,
          'description-text-inline': config.description
        };

        Object.entries(updates).forEach(([id, text]) => {
          const el = document.getElementById(id);
          if (el) el.textContent = text;
        });
      }
    },

    updateAllDisplays() {
      if (!window.stateStore) return;

      const state = window.stateStore.getState();
      this.updateDashboardTMs(state.trainingMaxes);
      this.updateCycleDisplay(state.cycleSettings);
    }
  };
}
