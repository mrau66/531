/**
 * PersistenceManager - Data Persistence Layer
 *
 * PURPOSE:
 * Handles all data persistence operations for the application.
 * Manages both localStorage (offline) and Supabase database (online) storage.
 *
 * RESPONSIBILITIES:
 * - Save/load from localStorage
 * - Save/load from Supabase database
 * - Individual entity persistence (training maxes, cycle settings, etc.)
 * - Data merging between local and remote
 *
 * DEPENDENCIES:
 * - CoreStateStore: Reads/writes state
 * - Supabase: Database operations
 */

import { supabase } from "./supabase.js";

export class PersistenceManager {
  constructor(coreStore) {
    this.coreStore = coreStore;
  }

  // ===========================================
  // LOCAL STORAGE
  // ===========================================

  saveToLocalStorage() {
    try {
      const dataToSave = {
        trainingMaxes: this.coreStore.state.trainingMaxes,
        cycleSettings: this.coreStore.state.cycleSettings,
        accessories: this.coreStore.state.accessories,
        sessionCompletion: this.coreStore.state.sessionCompletion,
        lastDatabaseSync: this.coreStore.state.lastDatabaseSync,
        lastLocalChange: this.coreStore.state.lastLocalChange,
        isInitialLoadComplete: true,
      };
      localStorage.setItem("531_unified_state", JSON.stringify(dataToSave));
    } catch (error) {
      console.error("LocalStorage save error:", error);
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem("531_unified_state");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.isInitialLoadComplete) {
          Object.assign(this.coreStore.state, data);
          console.log("✅ State loaded from localStorage");
        }
      }
    } catch (error) {
      console.error("LocalStorage load error:", error);
    }
  }

  // ===========================================
  // DATABASE OPERATIONS - Full Sync
  // ===========================================

  async loadFromDatabase() {
    if (!this.coreStore.state.user) return;

    console.log("📄 Loading from database...");
    this.coreStore.updateState({ isLoading: true });

    try {
      // Load in sequence to ensure proper dependencies
      await this.loadTrainingMaxes();
      await this.loadCycleSettings();
      await this.loadAccessories();
      await this.loadSessionCompletion();

      this.coreStore.updateState({
        isLoading: false,
        isInitialLoadComplete: true,
        lastDatabaseSync: new Date().toISOString(),
        lastLocalChange: null,
      });

      console.log("✅ Database load completed");
    } catch (error) {
      console.error("Database load error:", error);
      this.coreStore.updateState({
        isLoading: false,
        isInitialLoadComplete: true,
      });
    }
  }

  async saveToDatabase() {
    if (!this.coreStore.state.user) throw new Error("Must be signed in");

    console.log("💾 Saving to database...");

    await Promise.all([
      this.saveTrainingMaxes(),
      this.saveCycleSettings(),
      this.saveAccessories(),
      this.saveAllSessionCompletion(),
    ]);

    this.coreStore.state.lastDatabaseSync = new Date().toISOString();
    this.coreStore.state.lastLocalChange = null;
    this.saveToLocalStorage();

    console.log("✅ Database save completed");
  }

  // Alias for compatibility
  async manualSaveToDatabase() {
    return this.saveToDatabase();
  }

  // ===========================================
  // DATABASE OPERATIONS - Training Maxes
  // ===========================================

  async loadTrainingMaxes() {
    const { data, error } = await supabase
      .from("training_maxes")
      .select("*")
      .eq("user_id", this.coreStore.state.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      this.coreStore.updateState({
        trainingMaxes: {
          squat: data.squat_max || 0,
          bench: data.bench_max || 0,
          deadlift: data.deadlift_max || 0,
          ohp: data.ohp_max || 0,
        },
      });
    }
  }

  async saveTrainingMaxes() {
    const tm = this.coreStore.state.trainingMaxes;
    if (!Object.values(tm).some((v) => v > 0)) return;

    const { error } = await supabase.from("training_maxes").upsert(
      {
        user_id: this.coreStore.state.user.id,
        squat_max: tm.squat || null,
        bench_max: tm.bench || null,
        deadlift_max: tm.deadlift || null,
        ohp_max: tm.ohp || null,
        effective_date: new Date().toISOString().split("T")[0],
        notes: "Auto-saved",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,effective_date" }
    );

    if (error) throw error;
  }

  // ===========================================
  // DATABASE OPERATIONS - Cycle Settings
  // ===========================================

  async loadCycleSettings() {
    const { data, error } = await supabase
      .from("cycle_progress")
      .select("*")
      .eq("user_id", this.coreStore.state.user.id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      this.coreStore.updateState({
        cycleSettings: {
          cycle: data.cycle_number || 1,
          week: data.week_number || 1,
        },
        currentCycleProgressId: data.id,
      });
    } else {
      // Create initial cycle progress
      await this.saveCycleSettings();
    }
  }

  async saveCycleSettings() {
    const { cycle, week } = this.coreStore.state.cycleSettings;

    // Deactivate old progress
    if (this.coreStore.state.currentCycleProgressId) {
      await supabase
        .from("cycle_progress")
        .update({ is_active: false })
        .eq("id", this.coreStore.state.currentCycleProgressId);
    }

    // Create/update new progress
    const { data, error } = await supabase
      .from("cycle_progress")
      .upsert(
        {
          user_id: this.coreStore.state.user.id,
          cycle_number: cycle,
          week_number: week,
          is_active: true,
        },
        { onConflict: "user_id,cycle_number,week_number" }
      )
      .select()
      .single();

    if (error) throw error;
    this.coreStore.updateState({ currentCycleProgressId: data.id });
  }

  // ===========================================
  // DATABASE OPERATIONS - Accessories
  // ===========================================

  async loadAccessories() {
    const { data, error } = await supabase
      .from("user_settings")
      .select("accessories, progression_rate")
      .eq("user_id", this.coreStore.state.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    const updates = {};
    if (data?.accessories) {
      updates.accessories = data.accessories;
    }
    if (data?.progression_rate) {
      updates.progressionRate = data.progression_rate;
    }

    if (Object.keys(updates).length > 0) {
      this.coreStore.updateState(updates);
    } else if (!data?.accessories) {
      // Set defaults
      this.coreStore.updateState({
        accessories: {
          squat: [
            "Bulgarian Split Squats - 3x8-12 each leg",
            "Jump Squats - 3x8-10",
          ],
          bench: ["Push-ups (various grips) - 3x8-15", "Tricep Dips - 3x8-12"],
          deadlift: [
            "Single-leg Romanian Deadlifts - 3x8-10 each",
            "Glute Bridges - 3x12-15",
          ],
          ohp: ["Pike Push-ups - 3x5-10", "Push-ups - 3x10-15"],
        },
      });
    }
  }

  async saveAccessories() {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: this.coreStore.state.user.id,
        accessories: this.coreStore.state.accessories,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;
  }

  async saveProgressionRate() {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: this.coreStore.state.user.id,
        progression_rate: this.coreStore.state.progressionRate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;
  }

  // ===========================================
  // DATABASE OPERATIONS - Session Completion
  // ===========================================

  async loadSessionCompletion() {
    if (!this.coreStore.state.currentCycleProgressId) {
      console.log("⌛ No cycle progress ID for session loading");
      return;
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", this.coreStore.state.user.id)
      .eq("cycle_progress_id", this.coreStore.state.currentCycleProgressId);

    if (error) throw error;

    const newSessionCompletion = {};
    const { cycle, week } = this.coreStore.state.cycleSettings;

    // Initialize ALL lifts to empty first
    ["squat", "bench", "deadlift", "ohp"].forEach((lift) => {
      const key = `${lift}_${cycle}_${week}`;
      newSessionCompletion[key] = {
        mainSets: [],
        supplementalSets: [],
        accessories: [],
      };
    });

    // Then overwrite with actual data from database (if any)
    if (data && data.length > 0) {
      data.forEach((session) => {
        const key = `${session.lift_type}_${cycle}_${week}`;
        newSessionCompletion[key] = {
          mainSets: session.main_sets_completed || [],
          supplementalSets: session.supplemental_sets_completed || [],
          accessories: session.accessories_completed || [],
        };
      });
    }

    this.coreStore.state.sessionCompletion = newSessionCompletion;
    this.coreStore.notifyListeners({ sessionCompletion: {} });
  }

  async saveAllSessionCompletion() {
    const promises = Object.entries(this.coreStore.state.sessionCompletion).map(
      ([key, data]) => {
        const [lift] = key.split("_");
        return this.saveSessionCompletionToDB(lift, data);
      }
    );
    await Promise.all(promises);
  }

  async saveSessionCompletionToDB(lift, data) {
    if (!this.coreStore.state.currentCycleProgressId) {
      await this.loadCycleSettings();
    }

    if (!this.coreStore.state.currentCycleProgressId) {
      throw new Error("No active cycle progress");
    }

    const { error } = await supabase.from("workout_sessions").upsert(
      {
        user_id: this.coreStore.state.user.id,
        cycle_progress_id: this.coreStore.state.currentCycleProgressId,
        lift_type: lift,
        session_date: new Date().toISOString().split("T")[0],
        main_sets_completed: data.mainSets || [],
        supplemental_sets_completed: data.supplementalSets || [],
        accessories_completed: data.accessories || [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,cycle_progress_id,lift_type" }
    );

    if (error) throw error;
  }

  // ===========================================
  // COMPATIBILITY ALIASES
  // ===========================================

  async saveTrainingMaxesToDB() {
    return this.saveTrainingMaxes();
  }

  async saveCycleSettingsToDB() {
    return this.saveCycleSettings();
  }

  async saveAccessoriesToDB() {
    return this.saveAccessories();
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  checkForLocalOnlyData() {
    // Load what was in localStorage
    const savedLocal = localStorage.getItem("531_unified_state");
    if (!savedLocal) return null;

    const localData = JSON.parse(savedLocal);

    // Compare with current state (which was just loaded from database)
    // Only return data that exists locally but not in database
    // This is complex - for now, just return null
    return null;
  }

  async mergeAndSave(localOnlyData) {
    // Future implementation for merging offline changes with server data
    console.log("Merging local data with server data:", localOnlyData);
  }

  async forceDatabaseSync() {
    this.coreStore.updateState({ isInitialLoadComplete: false });
    await this.loadFromDatabase();
  }
}
