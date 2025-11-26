/**
 * CoreStateStore - Pure State Management
 *
 * PURPOSE:
 * Manages application state with reactive subscription system.
 * Does NOT handle persistence or UI - focuses solely on state logic.
 *
 * RESPONSIBILITIES:
 * - Maintains state object
 * - Provides subscription system for reactive updates
 * - Manages state changes and notifications
 * - Provides convenience methods for common state operations
 *
 * STATE STRUCTURE:
 * - trainingMaxes: {squat, bench, deadlift, ohp}
 * - cycleSettings: {cycle, week}
 * - progressionRate: 'conservative' | 'standard' | 'aggressive'
 * - repScheme: 'standard' | 'fives_pro'
 * - supplementalTemplate: '531x365' | 'bbb' | 'fsl' | 'ssl' | 'fsl_amrap' | 'bbb_beefcake' | 'simplest'
 * - theme: 'light' | 'dark' | 'contrast'
 * - accessories: {lift: [exercises]}
 * - sessionCompletion: Keyed by "lift_cycle_week"
 * - user: Current authenticated user
 * - Metadata: lastDatabaseSync, lastLocalChange, etc.
 */

import { PROGRESSION_PRESETS } from './config.js';

export class CoreStateStore {
  constructor() {
    this.state = {
      trainingMaxes: { squat: 0, bench: 0, deadlift: 0, ohp: 0 },
      cycleSettings: { cycle: 1, week: 1 },
      progressionRate: 'conservative',  // 'conservative', 'standard', or 'aggressive'
      repScheme: 'standard',  // 'standard' (5/3/1) or 'fives_pro' (5s PRO)
      supplementalTemplate: '531x365',  // Supplemental work template
      theme: 'light',  // 'light', 'dark', or 'contrast'
      accessories: { squat: [], bench: [], deadlift: [], ohp: [] },
      sessionCompletion: {},
      user: null,
      isLoading: false,
      lastDatabaseSync: null,
      lastLocalChange: null,
      isInitialLoadComplete: false,
      currentCycleProgressId: null,
    };

    this.listeners = new Map();
  }

  // ===========================================
  // SUBSCRIPTION SYSTEM
  // ===========================================

  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Call immediately with current value
    const currentValue = this.getState(path);
    callback(currentValue, currentValue);

    // Return unsubscribe function
    return () => this.listeners.get(path)?.delete(callback);
  }

  // ===========================================
  // STATE ACCESS
  // ===========================================

  getState(path = null) {
    if (!path) return { ...this.state };
    return path.split(".").reduce((obj, key) => obj?.[key], this.state);
  }

  // ===========================================
  // STATE UPDATES
  // ===========================================

  updateState(updates) {
    const prevState = { ...this.state };

    // Handle session completion specially during initial load
    if (updates.sessionCompletion && !this.state.isInitialLoadComplete) {
      this.state.sessionCompletion = updates.sessionCompletion;
      delete updates.sessionCompletion;
    }

    // Merge updates - do deep merge for nested objects
    Object.keys(updates).forEach((key) => {
      if (
        typeof updates[key] === "object" &&
        !Array.isArray(updates[key]) &&
        updates[key] !== null
      ) {
        this.state[key] = { ...this.state[key], ...updates[key] };
      } else {
        this.state[key] = updates[key];
      }
    });

    // Track changes
    if (this.isUserDataChange(updates) && this.state.isInitialLoadComplete) {
      this.state.lastLocalChange = new Date().toISOString();
    }

    // Notify listeners
    this.notifyListeners(prevState);

    // Return whether this was a user data change (for persistence layer)
    return this.isUserDataChange(updates) || updates.isInitialLoadComplete;
  }

  isUserDataChange(updates) {
    return Object.keys(updates).some((key) =>
      [
        "trainingMaxes",
        "cycleSettings",
        "accessories",
        "sessionCompletion",
      ].includes(key)
    );
  }

  notifyListeners(prevState) {
    this.listeners.forEach((callbacks, path) => {
      const currentValue = this.getState(path);
      const prevValue = path
        .split(".")
        .reduce((obj, key) => obj?.[key], prevState);

      if (JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
        callbacks.forEach((callback) => {
          try {
            callback(currentValue, prevValue);
          } catch (error) {
            console.error("Listener error:", error);
          }
        });
      }
    });
  }

  // ===========================================
  // CONVENIENCE METHODS - Training Maxes
  // ===========================================

  setTrainingMax(lift, value) {
    this.updateState({
      trainingMaxes: {
        ...this.state.trainingMaxes,
        [lift]: parseFloat(value) || 0,
      },
    });
  }

  setAllTrainingMaxes(maxes) {
    this.updateState({
      trainingMaxes: { ...this.state.trainingMaxes, ...maxes },
    });
  }

  getTrainingMax(lift) {
    return this.state.trainingMaxes[lift] || 0;
  }

  hasTrainingMaxes() {
    return Object.values(this.state.trainingMaxes).some((tm) => tm > 0);
  }

  increaseTrainingMaxes() {
    const tm = this.state.trainingMaxes;
    const progressionRate = this.state.progressionRate || 'conservative';
    let progression = PROGRESSION_PRESETS[progressionRate];

    if (!progression) {
      console.error(`Invalid progression rate: ${progressionRate}, using conservative`);
      progression = PROGRESSION_PRESETS.conservative;
    }

    this.updateState({
      trainingMaxes: {
        squat: (tm.squat || 0) + progression.main,
        bench: (tm.bench || 0) + progression.main,
        deadlift: (tm.deadlift || 0) + progression.main,
        ohp: (tm.ohp || 0) + progression.ohp,
      },
    });
  }

  // ===========================================
  // CONVENIENCE METHODS - Cycle Settings
  // ===========================================

  setCycleSettings(cycle, week) {
    this.updateState({
      cycleSettings: { cycle: parseInt(cycle) || 1, week: parseInt(week) || 1 },
    });
  }

  getCycleSettings() {
    return { ...this.state.cycleSettings };
  }

  // ===========================================
  // CONVENIENCE METHODS - Accessories
  // ===========================================

  setAccessories(lift, accessories) {
    this.updateState({
      accessories: { ...this.state.accessories, [lift]: [...accessories] },
    });
  }

  getAccessories(lift) {
    return [...(this.state.accessories[lift] || [])];
  }

  // ===========================================
  // CONVENIENCE METHODS - Session Completion
  // ===========================================

  setSessionCompletion(lift, cycle, week, data) {
    const key = `${lift}_${cycle}_${week}`;

    const validatedData = {
      mainSets: data.mainSets || [],
      supplementalSets: data.supplementalSets || [],
      accessories: data.accessories || [],
    };

    if (this.state.isInitialLoadComplete) {
      this.updateState({
        sessionCompletion: {
          ...this.state.sessionCompletion,
          [key]: validatedData,
        },
      });
    } else {
      // During initial load, modify state directly
      this.state.sessionCompletion[key] = validatedData;
    }
  }

  getSessionCompletion(lift, cycle = null, week = null) {
    if (!cycle || !week) {
      const { cycle: c, week: w } = this.state.cycleSettings;
      cycle = cycle || c;
      week = week || w;
    }

    const key = `${lift}_${cycle}_${week}`;
    return (
      this.state.sessionCompletion[key] || {
        mainSets: [],
        supplementalSets: [],
        accessories: [],
      }
    );
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  getCalculatorData() {
    return {
      trainingMaxes: { ...this.state.trainingMaxes },
      cycle: this.state.cycleSettings.cycle,
      week: this.state.cycleSettings.week,
      accessories: { ...this.state.accessories },
    };
  }

  resetState() {
    const userToKeep = this.state.user;
    this.state = {
      trainingMaxes: { squat: 0, bench: 0, deadlift: 0, ohp: 0 },
      cycleSettings: { cycle: 1, week: 1 },
      accessories: { squat: [], bench: [], deadlift: [], ohp: [] },
      sessionCompletion: {},
      user: userToKeep,
      isLoading: false,
      lastDatabaseSync: null,
      lastLocalChange: null,
      currentCycleProgressId: null,
      isInitialLoadComplete: false,
    };
    this.notifyListeners({});
  }

  dumpState() {
    console.log("Current State:", this.state);
    console.log("Listeners:", Array.from(this.listeners.keys()));
    return this.state;
  }
}
