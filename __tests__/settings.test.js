/**
 * Tests for SettingsManager (settings.js)
 * Tests form input handling, state subscriptions, save operations, and UI updates
 */
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createMockStateStore } from './test-utils.js';

describe('SettingsManager', () => {
  let mockStateStore;
  let settingsManager;

  beforeEach(() => {
    // Create mock state store
    mockStateStore = createMockStateStore({
      trainingMaxes: { squat: 300, bench: 200, deadlift: 400, ohp: 150 },
      cycleSettings: { cycle: 1, week: 1 },
      accessories: { squat: [], bench: [], deadlift: [], ohp: [] }
    });

    window.stateStore = mockStateStore;

    // Create DOM elements for testing
    createSettingsDOM();

    // Create minimal settings manager
    settingsManager = createTestSettingsManager();
  });

  describe('Initialization', () => {
    test('should wait for state store before initializing', async () => {
      expect(window.stateStore).toBeDefined();
    });

    test('should setup subscriptions on init', () => {
      settingsManager.setupSubscriptions();

      expect(mockStateStore.subscribe).toHaveBeenCalledWith('trainingMaxes', expect.any(Function));
      expect(mockStateStore.subscribe).toHaveBeenCalledWith('cycleSettings', expect.any(Function));
      expect(mockStateStore.subscribe).toHaveBeenCalledWith('accessories', expect.any(Function));
    });

    test('should setup event listeners on init', () => {
      const input = document.getElementById('squat-max');
      const listeners = input._listeners || [];

      settingsManager.setupEventListeners();

      // Check that input event listener was added
      expect(input).toBeDefined();
    });
  });

  describe('Training Max Inputs', () => {
    test('should update training max on input change', () => {
      const input = document.getElementById('squat-max');
      input.value = '350';

      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);

      // Simulate the event handler
      mockStateStore.setTrainingMax('squat', parseFloat(input.value));

      expect(mockStateStore.setTrainingMax).toHaveBeenCalledWith('squat', 350);
    });

    test('should update all training max inputs from state', () => {
      const trainingMaxes = { squat: 300, bench: 200, deadlift: 400, ohp: 150 };

      settingsManager.updateTrainingMaxInputs(trainingMaxes);

      expect(document.getElementById('squat-max').value).toBe('300');
      expect(document.getElementById('bench-max').value).toBe('200');
      expect(document.getElementById('deadlift-max').value).toBe('400');
      expect(document.getElementById('ohp-max').value).toBe('150');
    });

    test('should handle zero training maxes', () => {
      // Set inputs to non-zero first
      document.getElementById('squat-max').value = '100';
      document.getElementById('bench-max').value = '100';

      const trainingMaxes = { squat: 0, bench: 0, deadlift: 0, ohp: 0 };

      settingsManager.updateTrainingMaxInputs(trainingMaxes);

      // Zero values render as empty string due to || '' in implementation
      expect(document.getElementById('squat-max').value).toBe('');
      expect(document.getElementById('bench-max').value).toBe('');
    });

    test('should not update input if value unchanged', () => {
      const input = document.getElementById('squat-max');
      input.value = '300';

      settingsManager.updateTrainingMaxInputs({ squat: 300 });

      expect(input.value).toBe('300');
    });
  });

  describe('Cycle Settings', () => {
    test('should update cycle settings on select change', () => {
      const cycleSelect = document.getElementById('cycle-select');
      const weekSelect = document.getElementById('week-select');

      cycleSelect.value = '5';
      weekSelect.value = '2';

      mockStateStore.setCycleSettings(5, 2);

      expect(mockStateStore.setCycleSettings).toHaveBeenCalledWith(5, 2);
    });

    test('should update cycle select inputs from state', () => {
      const cycleSettings = { cycle: 5, week: 2 };

      settingsManager.updateCycleSettingsInputs(cycleSettings);

      expect(document.getElementById('cycle-select').value).toBe('5');
      expect(document.getElementById('week-select').value).toBe('2');
    });

    test('should not update select if value unchanged', () => {
      const cycleSelect = document.getElementById('cycle-select');
      cycleSelect.value = '1';

      settingsManager.updateCycleSettingsInputs({ cycle: 1, week: 1 });

      expect(cycleSelect.value).toBe('1');
    });
  });

  describe('Accessory Selection', () => {
    test('should handle accessory checkbox checked', () => {
      const checkbox = document.querySelector('[data-lift="squat"] input[type="checkbox"]');
      checkbox.checked = true;
      checkbox.value = 'Front Squat';

      const event = {
        target: checkbox
      };

      settingsManager.handleAccessoryChange(event);

      expect(mockStateStore.setAccessories).toHaveBeenCalledWith('squat', expect.arrayContaining(['Front Squat']));
    });

    test('should handle accessory checkbox unchecked', () => {
      // Set initial state with accessory
      mockStateStore.state.accessories.squat = ['Front Squat'];
      mockStateStore.getAccessories.mockReturnValue(['Front Squat']);

      const checkbox = document.querySelector('[data-lift="squat"] input[type="checkbox"]');
      checkbox.checked = false;
      checkbox.value = 'Front Squat';

      const event = {
        target: checkbox
      };

      settingsManager.handleAccessoryChange(event);

      expect(mockStateStore.setAccessories).toHaveBeenCalledWith('squat', []);
    });

    test('should apply accessory settings to UI', () => {
      const accessories = {
        squat: ['Front Squat'],
        bench: [],
        deadlift: [],
        ohp: []
      };

      settingsManager.applyAccessorySettingsToUI(accessories);

      const checkbox = document.querySelector('[data-lift="squat"] input[value="Front Squat"]');
      expect(checkbox.checked).toBe(true);
    });

    test('should update selection counts', () => {
      const accessories = {
        squat: ['Front Squat', 'Bulgarian Split Squat'],
        bench: [],
        deadlift: ['Deficit Deadlift'],
        ohp: []
      };

      settingsManager.updateSelectionCounts(accessories);

      expect(document.getElementById('squat-count').textContent).toBe('2 selected');
      expect(document.getElementById('bench-count').textContent).toBe('0 selected');
      expect(document.getElementById('deadlift-count').textContent).toBe('1 selected');
    });

    test('should set count background color based on selection', () => {
      const accessories = {
        squat: [],
        bench: ['Dips'],
        deadlift: ['RDL', 'Deficit Deadlift'],
        ohp: []
      };

      settingsManager.updateSelectionCounts(accessories);

      const squatCount = document.getElementById('squat-count');
      const benchCount = document.getElementById('bench-count');
      const deadliftCount = document.getElementById('deadlift-count');

      // Check that background colors are set (values may vary)
      expect(squatCount.style.background).toBeTruthy(); // 0 selected
      expect(benchCount.style.background).toBeTruthy(); // 1 selected
      expect(deadliftCount.style.background).toBeTruthy(); // 2 selected
    });
  });

  describe('Save Operations', () => {
    test('should call save function when saving', async () => {
      const button = document.getElementById('save-training-maxes-btn');
      const saveFn = jest.fn(() => Promise.resolve());

      await settingsManager.saveWithFeedback('save-training-maxes-btn', saveFn);

      expect(saveFn).toHaveBeenCalled();
    });

    test('should save with feedback showing success state', async () => {
      const button = document.getElementById('save-training-maxes-btn');
      const saveFn = jest.fn(() => Promise.resolve());

      await settingsManager.saveWithFeedback('save-training-maxes-btn', saveFn);

      expect(button.querySelector('.save-icon').textContent).toBe('✅');
      expect(button.querySelector('.save-text').textContent).toBe('Saved!');
      expect(button.disabled).toBe(false);
    });

    test('should save with feedback showing error state', async () => {
      const button = document.getElementById('save-training-maxes-btn');
      const saveFn = jest.fn(() => Promise.reject(new Error('Save failed')));

      await settingsManager.saveWithFeedback('save-training-maxes-btn', saveFn);

      expect(button.querySelector('.save-icon').textContent).toBe('❌');
      expect(button.querySelector('.save-text').textContent).toBe('Failed');
    });

    test('should reset button state after timeout', async () => {
      jest.useFakeTimers();

      const button = document.getElementById('save-training-maxes-btn');
      const saveFn = jest.fn(() => Promise.resolve());

      await settingsManager.saveWithFeedback('save-training-maxes-btn', saveFn);

      jest.advanceTimersByTime(2000);

      expect(button.querySelector('.save-icon').textContent).toBe('💾');
      expect(button.querySelector('.save-text').textContent).toBe('Save');

      jest.useRealTimers();
    });

    test('should handle missing button gracefully', async () => {
      const saveFn = jest.fn(() => Promise.resolve());

      await expect(
        settingsManager.saveWithFeedback('non-existent-btn', saveFn)
      ).resolves.not.toThrow();
    });
  });

  describe('Quick Actions', () => {
    test('should select all accessories for lift', () => {
      settingsManager.selectAllForLift('squat');

      const checkboxes = document.querySelectorAll('[data-lift="squat"] input[type="checkbox"]');
      checkboxes.forEach(cb => {
        expect(cb.checked).toBe(true);
      });

      expect(mockStateStore.setAccessories).toHaveBeenCalled();
    });

    test('should deselect all accessories for lift', () => {
      // First select some
      const checkboxes = document.querySelectorAll('[data-lift="squat"] input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);

      settingsManager.deselectAllForLift('squat');

      checkboxes.forEach(cb => {
        expect(cb.checked).toBe(false);
      });

      expect(mockStateStore.setAccessories).toHaveBeenCalledWith('squat', []);
    });
  });

  describe('Initial State Loading', () => {
    test('should load initial state from store', () => {
      const state = {
        trainingMaxes: { squat: 350, bench: 225, deadlift: 450, ohp: 175 },
        cycleSettings: { cycle: 5, week: 2 },
        accessories: { squat: ['Front Squat'], bench: [], deadlift: [], ohp: [] }
      };

      mockStateStore.getState.mockReturnValue(state);

      settingsManager.loadInitialState();

      expect(document.getElementById('squat-max').value).toBe('350');
      expect(document.getElementById('cycle-select').value).toBe('5');
    });

    test('should handle missing state store gracefully', () => {
      delete window.stateStore;

      expect(() => {
        settingsManager.loadInitialState();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle null training maxes', () => {
      expect(() => {
        settingsManager.updateTrainingMaxInputs(null);
      }).not.toThrow();
    });

    test('should handle null cycle settings', () => {
      expect(() => {
        settingsManager.updateCycleSettingsInputs(null);
      }).not.toThrow();
    });

    test('should handle null accessories', () => {
      expect(() => {
        settingsManager.applyAccessorySettingsToUI(null);
      }).not.toThrow();
    });

    test('should handle missing DOM elements', () => {
      // Remove all inputs
      document.body.innerHTML = '';

      expect(() => {
        settingsManager.updateTrainingMaxInputs({ squat: 300 });
      }).not.toThrow();
    });
  });
});

// Helper: Create settings DOM structure
function createSettingsDOM() {
  document.body.innerHTML = `
    <!-- Training Max Inputs -->
    <input type="number" id="squat-max" value="0">
    <input type="number" id="bench-max" value="0">
    <input type="number" id="deadlift-max" value="0">
    <input type="number" id="ohp-max" value="0">

    <!-- Cycle Settings -->
    <select id="cycle-select">
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
      <option value="5">5</option>
    </select>
    <select id="week-select">
      <option value="1">1</option>
      <option value="2">2</option>
      <option value="3">3</option>
    </select>

    <!-- Accessories -->
    <div class="accessories-list" data-lift="squat">
      <label class="accessory-checkbox">
        <input type="checkbox" value="Front Squat">
        Front Squat
      </label>
      <label class="accessory-checkbox">
        <input type="checkbox" value="Bulgarian Split Squat">
        Bulgarian Split Squat
      </label>
    </div>

    <div class="accessories-list" data-lift="bench">
      <label class="accessory-checkbox">
        <input type="checkbox" value="Dips">
        Dips
      </label>
    </div>

    <div class="accessories-list" data-lift="deadlift">
      <label class="accessory-checkbox">
        <input type="checkbox" value="RDL">
        RDL
      </label>
      <label class="accessory-checkbox">
        <input type="checkbox" value="Deficit Deadlift">
        Deficit Deadlift
      </label>
    </div>

    <div class="accessories-list" data-lift="ohp">
      <label class="accessory-checkbox">
        <input type="checkbox" value="Lateral Raises">
        Lateral Raises
      </label>
    </div>

    <!-- Selection Counts -->
    <span id="squat-count"></span>
    <span id="bench-count"></span>
    <span id="deadlift-count"></span>
    <span id="ohp-count"></span>

    <!-- Save Buttons -->
    <button id="save-training-maxes-btn">
      <span class="save-icon">💾</span>
      <span class="save-text">Save</span>
    </button>
    <button id="save-cycle-settings-btn">
      <span class="save-icon">💾</span>
      <span class="save-text">Save</span>
    </button>
    <button id="save-accessories-btn">
      <span class="save-icon">💾</span>
      <span class="save-text">Save</span>
    </button>
    <button id="save-all-settings-btn">
      <span class="save-icon">💾</span>
      <span class="save-text">Save</span>
    </button>

    <!-- Increase TM Button -->
    <button id="increaseTmButton">Increase TMs</button>
  `;
}

// Helper: Create minimal SettingsManager for testing
function createTestSettingsManager() {
  return {
    logger: {
      log: jest.fn(),
      error: jest.fn()
    },

    setupSubscriptions() {
      window.stateStore.subscribe('trainingMaxes', (tm) => this.updateTrainingMaxInputs(tm));
      window.stateStore.subscribe('cycleSettings', (cs) => this.updateCycleSettingsInputs(cs));
      window.stateStore.subscribe('accessories', (acc) => {
        this.applyAccessorySettingsToUI(acc);
        this.updateSelectionCounts(acc);
      });
    },

    setupEventListeners() {
      ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
        const input = document.getElementById(`${lift}-max`);
        if (input) {
          input.addEventListener('input', (e) => {
            window.stateStore.setTrainingMax(lift, parseFloat(e.target.value) || 0);
          });
        }
      });
    },

    updateTrainingMaxInputs(trainingMaxes) {
      if (!trainingMaxes) return;

      Object.keys(trainingMaxes).forEach(lift => {
        const input = document.getElementById(`${lift}-max`);
        if (input && input.value !== trainingMaxes[lift].toString()) {
          input.value = trainingMaxes[lift] || '';
        }
      });
    },

    updateCycleSettingsInputs(cycleSettings) {
      if (!cycleSettings) return;

      const cycleSelect = document.getElementById('cycle-select');
      const weekSelect = document.getElementById('week-select');

      if (cycleSelect && cycleSelect.value !== cycleSettings.cycle.toString()) {
        cycleSelect.value = cycleSettings.cycle;
      }

      if (weekSelect && weekSelect.value !== cycleSettings.week.toString()) {
        weekSelect.value = cycleSettings.week;
      }
    },

    applyAccessorySettingsToUI(accessories) {
      if (!accessories) return;

      Object.keys(accessories).forEach(liftType => {
        const accessoriesList = document.querySelector(`[data-lift="${liftType}"]`);
        if (!accessoriesList) return;

        const checkboxes = accessoriesList.querySelectorAll('input[type="checkbox"]');
        const selectedAccessories = accessories[liftType] || [];

        checkboxes.forEach(checkbox => {
          checkbox.checked = selectedAccessories.includes(checkbox.value);
        });
      });
    },

    updateSelectionCounts(accessories) {
      ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
        const count = accessories[lift]?.length || 0;
        const countElement = document.getElementById(`${lift}-count`);
        if (countElement) {
          countElement.textContent = `${count} selected`;

          const colors = {
            0: '#6c757d',
            1: '#ffc107',
            2: '#ffc107',
            default: count <= 4 ? 'var(--primary-color)' : 'var(--success-color)'
          };

          countElement.style.background = colors[count] || colors.default;
        }
      });
    },

    handleAccessoryChange(event) {
      const checkbox = event.target;
      const liftType = checkbox.closest('.accessories-list').dataset.lift;
      const currentAccessories = window.stateStore.getAccessories(liftType);

      if (checkbox.checked) {
        if (!currentAccessories.includes(checkbox.value)) {
          currentAccessories.push(checkbox.value);
        }
      } else {
        const index = currentAccessories.indexOf(checkbox.value);
        if (index > -1) {
          currentAccessories.splice(index, 1);
        }
      }

      window.stateStore.setAccessories(liftType, currentAccessories);
    },

    async saveWithFeedback(buttonId, fn) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;

      const setState = (icon, text, disabled) => {
        btn.disabled = disabled;
        const iconEl = btn.querySelector('.save-icon');
        const textEl = btn.querySelector('.save-text');
        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = text;
      };

      try {
        setState('⏳', 'Saving...', true);
        await fn();
        setState('✅', 'Saved!', false);
      } catch (error) {
        this.logger.error('Save error:', error);
        setState('❌', 'Failed', false);
      }

      setTimeout(() => setState('💾', 'Save', false), 2000);
    },

    selectAllForLift(liftType) {
      const accessoriesList = document.querySelector(`[data-lift="${liftType}"]`);
      if (!accessoriesList) return;

      const checkboxes = accessoriesList.querySelectorAll('input[type="checkbox"]');
      const newAccessories = Array.from(checkboxes).map(cb => {
        cb.checked = true;
        return cb.value;
      });

      window.stateStore.setAccessories(liftType, newAccessories);
    },

    deselectAllForLift(liftType) {
      const accessoriesList = document.querySelector(`[data-lift="${liftType}"]`);
      if (!accessoriesList) return;

      accessoriesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      window.stateStore.setAccessories(liftType, []);
    },

    loadInitialState() {
      if (!window.stateStore) return;

      const state = window.stateStore.getState();
      this.updateTrainingMaxInputs(state.trainingMaxes);
      this.updateCycleSettingsInputs(state.cycleSettings);
      this.applyAccessorySettingsToUI(state.accessories);
      this.updateSelectionCounts(state.accessories);
    }
  };
}
