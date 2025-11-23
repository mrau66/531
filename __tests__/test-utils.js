// Test utilities and helpers
import { jest } from '@jest/globals';

/**
 * Creates a mock StateStore for testing
 */
export function createMockStateStore(initialState = {}) {
  const defaultState = {
    trainingMaxes: { squat: 0, bench: 0, deadlift: 0, ohp: 0 },
    cycleSettings: { cycle: 1, week: 1 },
    accessories: { squat: [], bench: [], deadlift: [], ohp: [] },
    sessionCompletion: {},
    user: null,
    isLoading: false,
    lastDatabaseSync: null,
    lastLocalChange: null,
    isInitialLoadComplete: false,
    currentCycleProgressId: null,
    ...initialState
  };

  const listeners = new Map();

  const store = {
    state: defaultState,
    listeners,

    getState: jest.fn((path = null) => {
      if (!path) return { ...defaultState };
      return path.split('.').reduce((obj, key) => obj?.[key], defaultState);
    }),

    updateState: jest.fn(function(updates) {
      const prevState = { ...defaultState };

      // Deep merge for nested objects
      Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key]) && updates[key] !== null) {
          defaultState[key] = { ...defaultState[key], ...updates[key] };
        } else {
          defaultState[key] = updates[key];
        }
      });

      // Notify listeners
      listeners.forEach((callbacks, path) => {
        const currentValue = path.split('.').reduce((obj, key) => obj?.[key], defaultState);
        const prevValue = path.split('.').reduce((obj, key) => obj?.[key], prevState);

        if (JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
          callbacks.forEach(callback => callback(currentValue, prevValue));
        }
      });
    }),

    subscribe: jest.fn((path, callback) => {
      if (!listeners.has(path)) {
        listeners.set(path, new Set());
      }
      listeners.get(path).add(callback);
      const currentValue = path.split('.').reduce((obj, key) => obj?.[key], defaultState);
      callback(currentValue, currentValue);
      return () => listeners.get(path)?.delete(callback);
    }),

    setTrainingMax: jest.fn(function(lift, value) {
      store.updateState({
        trainingMaxes: { ...defaultState.trainingMaxes, [lift]: parseFloat(value) || 0 }
      });
    }),

    setCycleSettings: jest.fn(function(cycle, week) {
      store.updateState({
        cycleSettings: { cycle: parseInt(cycle) || 1, week: parseInt(week) || 1 }
      });
    }),

    setSessionCompletion: jest.fn((lift, cycle, week, data) => {
      const key = `${lift}_${cycle}_${week}`;
      defaultState.sessionCompletion[key] = data;
    }),

    getSessionCompletion: jest.fn((lift, cycle = null, week = null) => {
      if (!cycle || !week) {
        cycle = defaultState.cycleSettings.cycle;
        week = defaultState.cycleSettings.week;
      }
      const key = `${lift}_${cycle}_${week}`;
      return defaultState.sessionCompletion[key] || {
        mainSets: [],
        supplementalSets: [],
        accessories: []
      };
    }),

    getCycleSettings: jest.fn(() => ({ ...defaultState.cycleSettings })),

    getTrainingMax: jest.fn((lift) => defaultState.trainingMaxes[lift] || 0),

    hasTrainingMaxes: jest.fn(() => Object.values(defaultState.trainingMaxes).some(tm => tm > 0)),

    getAccessories: jest.fn((lift) => [...(defaultState.accessories[lift] || [])]),

    setAccessories: jest.fn(function(lift, accessories) {
      store.updateState({
        accessories: { ...defaultState.accessories, [lift]: [...accessories] }
      });
    }),

    increaseTrainingMaxes: jest.fn(function() {
      const tm = defaultState.trainingMaxes;
      store.updateState({
        trainingMaxes: {
          squat: (tm.squat || 0) + 2.5,
          bench: (tm.bench || 0) + 2.5,
          deadlift: (tm.deadlift || 0) + 2.5,
          ohp: (tm.ohp || 0) + 1.25
        }
      });
    }),

    saveTrainingMaxes: jest.fn(() => Promise.resolve()),
    saveCycleSettings: jest.fn(() => Promise.resolve()),
    saveAccessories: jest.fn(() => Promise.resolve()),
    saveToLocalStorage: jest.fn(),
    loadFromLocalStorage: jest.fn(),
    saveToDatabase: jest.fn(() => Promise.resolve()),
    loadFromDatabase: jest.fn(() => Promise.resolve())
  };

  return store;
}

/**
 * Creates mock DOM elements for workout testing
 */
export function createWorkoutDOM(liftType = 'squat') {
  const container = document.createElement('div');
  container.className = 'lift-workout';

  // Main sets
  const mainSetsContainer = document.createElement('div');
  mainSetsContainer.id = `${liftType}-main-sets`;
  mainSetsContainer.className = 'set-group';

  const mainSetsHeader = document.createElement('h3');
  mainSetsHeader.textContent = 'Main Sets (5s PRO)';
  mainSetsContainer.appendChild(mainSetsHeader);

  // Create 3 main sets
  for (let i = 0; i < 3; i++) {
    const setRow = document.createElement('div');
    setRow.className = 'set-row';
    setRow.innerHTML = `
      <span class="set-info">
        <span class="reps">5</span> reps @
        <span class="percentage">65</span>%
      </span>
      <span class="weight">
        <span class="weight-value">200</span> lbs
      </span>
    `;
    mainSetsContainer.appendChild(setRow);
  }

  container.appendChild(mainSetsContainer);

  // Supplemental sets
  const supplementalSetsContainer = document.createElement('div');
  supplementalSetsContainer.id = `${liftType}-supplemental-sets`;
  supplementalSetsContainer.className = 'set-group';

  const supplementalHeader = document.createElement('h4');
  supplementalHeader.textContent = 'Supplemental (FSL)';
  supplementalSetsContainer.appendChild(supplementalHeader);

  // Create 5 supplemental sets
  for (let i = 0; i < 5; i++) {
    const setRow = document.createElement('div');
    setRow.className = 'set-row';
    setRow.innerHTML = `
      <span class="set-info">
        <span class="reps">12</span> reps @
        <span class="percentage">45</span>%
      </span>
      <span class="weight">
        <span class="weight-value">135</span> lbs
      </span>
    `;
    supplementalSetsContainer.appendChild(setRow);
  }

  container.appendChild(supplementalSetsContainer);

  // Accessories
  const accessoriesContainer = document.createElement('div');
  accessoriesContainer.id = `${liftType}-accessories`;
  accessoriesContainer.className = 'accessories-group';

  const accessories = [
    'Bulgarian Split Squats - 3x8-12 each leg',
    'Jump Squats - 3x8-10'
  ];

  accessories.forEach(acc => {
    const accItem = document.createElement('div');
    accItem.className = 'accessory-item';
    accItem.textContent = acc;
    accessoriesContainer.appendChild(accItem);
  });

  container.appendChild(accessoriesContainer);

  // Progress display
  const progressContainer = document.createElement('div');
  progressContainer.innerHTML = `
    <div class="progress-text">
      <span id="${liftType}-progress">0/10 exercises completed (0%)</span>
    </div>
    <div class="progress-bar-container">
      <div id="${liftType}-progress-bar" class="progress-bar" style="width: 0%"></div>
    </div>
  `;
  container.appendChild(progressContainer);

  document.body.appendChild(container);
  return container;
}

/**
 * Wait for async operations
 */
export function waitFor(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock user object
 */
export function createMockUser(email = 'test@example.com') {
  return {
    id: 'test-user-id',
    email,
    created_at: new Date().toISOString()
  };
}

/**
 * Simulate pointer/click event
 */
export function simulateClick(element) {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(event);
}
