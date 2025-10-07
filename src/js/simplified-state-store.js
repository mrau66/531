/**
 * UnifiedStateStore - Central State Management and Data Persistence
 *
 * PURPOSE:
 * Single source of truth for all application data. Manages state, handles data
 * persistence (localStorage + Supabase), provides reactive updates via subscriptions,
 * and manages the sync UI. Combines functionality of original state store + sync manager.
 *
 * KEY RESPONSIBILITIES:
 * - Maintains all application state in single state object
 * - Provides subscription system for reactive updates across components
 * - Manages localStorage for offline-first functionality
 * - Syncs with Supabase database when online and authenticated
 * - Creates and manages "Sync to Cloud" button with visual status indicators
 * - Handles authentication state changes and loads user data
 * - Tracks sync status (pending changes, last sync time)
 *
 * STATE STRUCTURE:
 * - trainingMaxes: {squat, bench, deadlift, ohp} - Current training max weights
 * - cycleSettings: {cycle, week} - Current position in program
 * - accessories: {lift: [exercises]} - Selected accessory exercises per lift
 * - sessionCompletion: Completed sets/exercises keyed by "lift_cycle_week"
 * - user: Current authenticated user (null if offline)
 * - Sync metadata: lastDatabaseSync, lastLocalChange, isLoading, etc.
 *
 * DATA FLOW:
 * Components → updateState() → localStorage → notifyListeners() → UI Updates
 *                                    ↓
 *                            Manual sync to Supabase
 *
 * SUBSCRIPTION PATTERN:
 * Components call subscribe('stateKey', callback) to react to specific state changes.
 * Callbacks fire immediately with current value and on every subsequent change.
 *
 * INITIALIZATION:
 * Auto-initializes as global window.stateStore, loads from localStorage immediately,
 * then attempts database sync if authenticated.
 */
import { supabase, getSupabase } from "./supabase.js";

class UnifiedStateStore {
  constructor() {
    this.state = {
      trainingMaxes: { squat: 0, bench: 0, deadlift: 0, ohp: 0 },
      cycleSettings: { cycle: 1, week: 1 },
      accessories: { squat: [], bench: [], deadlift: [], ohp: [] },
      sessionCompletion: {},
      user: null,
      isLoading: false,
      lastDatabaseSync: null,
      lastLocalChange: null,
      isInitialLoadComplete: false, // Keep this for compatibility
      currentCycleProgressId: null,
    };

    this.listeners = new Map();
    this.syncButton = null;
    this.isInitialized = false;
    this.init();
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  async init() {
    if (this.isInitialized) return;

    // Load local data immediately
    this.loadFromLocalStorage();

    // Setup auth listener
    this.setupAuthListener();

    // Wait for auth to be ready
    await this.waitForAuth();

    // Create sync UI if on app pages
    if (window.location.pathname.startsWith("/app")) {
      this.createSyncUI();
    }

    // detect when the app resumes and prevent interactions until the reload completes.
    this.setupVisibilityListener();

    this.isInitialized = true;
    console.log("✅ UnifiedStateStore initialized");
  }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.state.user) {
                console.log('👀 Page became visible, reloading data...');
                
                // Signal that we're reloading
                window.dispatchEvent(new CustomEvent('stateStoreReloading'));
                
                // Reload fresh data from database
                await this.loadFromDatabase();
                
                // Signal that reload is complete
                window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
                
                console.log('✅ Data reloaded after resume');
                }
        });
    }



  async waitForAuth() {
    console.log("⏳ Waiting for AuthManager...");

    // Wait for AuthManager or check session directly
    for (let i = 0; i < 30; i++) {
      if (window.auth?.hasCheckedSession) {
        console.log("✅ AuthManager ready");
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    // Check if user is authenticated
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("✅ Found existing session for:", session.user.email);
        await this.handleUserSignIn(session.user);
      } else {
        console.log("🔴 No authenticated user, offline mode");
        this.enableOfflineMode();
      }
    } catch (error) {
      console.warn("Auth check error:", error);
      this.enableOfflineMode();
    }
  }

  setupAuthListener() {
    // Listen for auth state changes from AuthManager
    window.addEventListener("authManagerReady", (event) => {
      console.log("🎯 AuthManager ready event:", event.detail);
      if (event.detail.hasSession && event.detail.user) {
        this.updateState({ user: event.detail.user });
      }
    });

    window.addEventListener("userSignedIn", (event) => {
      this.handleUserSignIn(event.detail.user);
    });

    window.addEventListener("userSignedOut", () => {
      this.handleUserSignOut();
    });

    window.addEventListener("appInitialized", (event) => {
      if (event.detail.user) {
        this.handleUserSignIn(event.detail.user);
      }


    });
  }

    async handleUserSignIn(user) {
        console.log('👤 Handling user sign in:', user.email);
        this.updateState({ user });
        
        // load from database first
        await this.loadFromDatabase();
        
        // Then check if localStorage has ADDITIONAL data not in database
        // (This would only happen if user worked out offline)
        const localOnlyData = this.checkForLocalOnlyData();
        
        if (localOnlyData) {
            console.log('⚠️ Found offline changes, merging with server data');
            await this.mergeAndSave(localOnlyData);
        }
        
        this.updateSyncUI();
        
        // Signal that StateStore is fully ready with data
        window.dispatchEvent(new CustomEvent('stateStoreFullyReady'));
        console.log('📢 StateStore fully ready event dispatched');
    }

  checkForLocalOnlyData() {
    // Load what was in localStorage
    const savedLocal = localStorage.getItem('531_unified_state');
    if (!savedLocal) return null;
    
    const localData = JSON.parse(savedLocal);
    
    // Compare with current state (which was just loaded from database)
    // Only return data that exists locally but not in database
    // This is complex - for now, just return null
    return null;
  }

  handleUserSignOut() {
    console.log("👋 User signed out");
    this.updateState({
      user: null,
      currentCycleProgressId: null,
      isInitialLoadComplete: true,
    });
    this.updateSyncUI();
  }

  enableOfflineMode() {
    console.log("🔴 Enabling offline mode");
    this.updateState({ isInitialLoadComplete: true });
  }

  // ===========================================
  // STATE MANAGEMENT
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

  getState(path = null) {
    if (!path) return { ...this.state };
    return path.split(".").reduce((obj, key) => obj?.[key], this.state);
  }

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

    // Save locally
    if (this.isUserDataChange(updates) || updates.isInitialLoadComplete) {
      this.saveToLocalStorage();
    }

    // Update sync UI
    this.updateSyncUI();
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
  // CONVENIENCE METHODS
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

  setCycleSettings(cycle, week) {
    this.updateState({
      cycleSettings: { cycle: parseInt(cycle) || 1, week: parseInt(week) || 1 },
    });
  }

  setAccessories(lift, accessories) {
    this.updateState({
      accessories: { ...this.state.accessories, [lift]: [...accessories] },
    });
  }

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

  getCycleSettings() {
    return { ...this.state.cycleSettings };
  }

  getAccessories(lift) {
    return [...(this.state.accessories[lift] || [])];
  }

  getTrainingMax(lift) {
    return this.state.trainingMaxes[lift] || 0;
  }

  hasTrainingMaxes() {
    return Object.values(this.state.trainingMaxes).some((tm) => tm > 0);
  }

  getCalculatorData() {
    return {
      trainingMaxes: { ...this.state.trainingMaxes },
      cycle: this.state.cycleSettings.cycle,
      week: this.state.cycleSettings.week,
      accessories: { ...this.state.accessories },
    };
  }

  // ===========================================
  // LOCAL STORAGE
  // ===========================================

  saveToLocalStorage() {
    try {
      const dataToSave = {
        trainingMaxes: this.state.trainingMaxes,
        cycleSettings: this.state.cycleSettings,
        accessories: this.state.accessories,
        sessionCompletion: this.state.sessionCompletion,
        lastDatabaseSync: this.state.lastDatabaseSync,
        lastLocalChange: this.state.lastLocalChange,
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
          Object.assign(this.state, data);
          console.log("✅ State loaded from localStorage");
        }
      }
    } catch (error) {
      console.error("LocalStorage load error:", error);
    }
  }

  // ===========================================
  // DATABASE OPERATIONS
  // ===========================================

  async loadFromDatabase() {
    if (!this.state.user) return;

    console.log("📄 Loading from database...");
    this.updateState({ isLoading: true });

    try {
      // Load in sequence to ensure proper dependencies
      await this.loadTrainingMaxes();
      await this.loadCycleSettings();
      await this.loadAccessories();
      await this.loadSessionCompletion();

      this.updateState({
        isLoading: false,
        isInitialLoadComplete: true,
        lastDatabaseSync: new Date().toISOString(),
        lastLocalChange: null,
      });

      console.log("✅ Database load completed");
    } catch (error) {
      console.error("Database load error:", error);
      this.updateState({
        isLoading: false,
        isInitialLoadComplete: true,
      });
    }
  }

  async saveToDatabase() {
    if (!this.state.user) throw new Error("Must be signed in");

    console.log("💾 Saving to database...");

    await Promise.all([
      this.saveTrainingMaxes(),
      this.saveCycleSettings(),
      this.saveAccessories(),
      this.saveAllSessionCompletion(),
    ]);

    this.state.lastDatabaseSync = new Date().toISOString();
    this.state.lastLocalChange = null;
    this.saveToLocalStorage();

    console.log("✅ Database save completed");
  }

  // Alias for compatibility
  async manualSaveToDatabase() {
    return this.saveToDatabase();
  }

  // Individual load methods
  async loadTrainingMaxes() {
    const { data, error } = await supabase
      .from("training_maxes")
      .select("*")
      .eq("user_id", this.state.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      this.updateState({
        trainingMaxes: {
          squat: data.squat_max || 0,
          bench: data.bench_max || 0,
          deadlift: data.deadlift_max || 0,
          ohp: data.ohp_max || 0,
        },
      });
    }
  }

  async loadCycleSettings() {
    const { data, error } = await supabase
      .from("cycle_progress")
      .select("*")
      .eq("user_id", this.state.user.id)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data) {
      this.updateState({
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

  async loadAccessories() {
    const { data, error } = await supabase
      .from("user_settings")
      .select("accessories")
      .eq("user_id", this.state.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    if (data?.accessories) {
      this.updateState({ accessories: data.accessories });
    } else {
      // Set defaults
      this.updateState({
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

  async loadSessionCompletion() {
    if (!this.state.currentCycleProgressId) {
      console.log("⌛ No cycle progress ID for session loading");
      return;
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", this.state.user.id)
      .eq("cycle_progress_id", this.state.currentCycleProgressId);

    if (error) throw error;

    const newSessionCompletion = {};
    const { cycle, week } = this.state.cycleSettings;

    // ✅ CRITICAL: Initialize ALL lifts to empty first
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

    this.state.sessionCompletion = newSessionCompletion;
    this.notifyListeners({ sessionCompletion: {} });
  }

  // Individual save methods
  async saveTrainingMaxes() {
    const tm = this.state.trainingMaxes;
    if (!Object.values(tm).some((v) => v > 0)) return;

    const { error } = await supabase.from("training_maxes").upsert(
      {
        user_id: this.state.user.id,
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

  async saveCycleSettings() {
    const { cycle, week } = this.state.cycleSettings;

    // Deactivate old progress
    if (this.state.currentCycleProgressId) {
      await supabase
        .from("cycle_progress")
        .update({ is_active: false })
        .eq("id", this.state.currentCycleProgressId);
    }

    // Create/update new progress
    const { data, error } = await supabase
      .from("cycle_progress")
      .upsert(
        {
          user_id: this.state.user.id,
          cycle_number: cycle,
          week_number: week,
          is_active: true,
        },
        { onConflict: "user_id,cycle_number,week_number" }
      )
      .select()
      .single();

    if (error) throw error;
    this.updateState({ currentCycleProgressId: data.id });
  }

  async saveAccessories() {
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: this.state.user.id,
        accessories: this.state.accessories,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;
  }

  async saveAllSessionCompletion() {
    const promises = Object.entries(this.state.sessionCompletion).map(
      ([key, data]) => {
        const [lift] = key.split("_");
        return this.saveSessionCompletionToDB(lift, data);
      }
    );
    await Promise.all(promises);
  }

  async saveSessionCompletionToDB(lift, data) {
    if (!this.state.currentCycleProgressId) {
      await this.loadCycleSettings();
    }

    if (!this.state.currentCycleProgressId) {
      throw new Error("No active cycle progress");
    }

    const { error } = await supabase.from("workout_sessions").upsert(
      {
        user_id: this.state.user.id,
        cycle_progress_id: this.state.currentCycleProgressId,
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

  // Compatibility aliases
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
  // SYNC UI
  // ===========================================

  createSyncUI() {
    if (document.getElementById("manual-sync-btn")) return;

    const button = document.createElement("button");
    button.id = "manual-sync-btn";
    button.className = "sync-btn";
    button.type = "button";
    button.innerHTML = `
            <span class="sync-icon">☁️</span>
            <span class="sync-text">Sync to Cloud</span>
            <span class="sync-status">Ready</span>
        `;
    button.onclick = () => this.performSync();

    // Find insertion point
    const saveBtn = document.getElementById("save-workout-btn");
    const inputSection = document.querySelector(
      ".input-section .section-header"
    );
    const navbar = document.querySelector(".lift-header");

    let target = null;
    if (saveBtn?.parentElement) {
      target = saveBtn.parentElement;
      saveBtn.style.display = "none";
    } else if (inputSection) {
      target = inputSection;
    } else if (navbar) {
      target = navbar;
    }

    if (target) {
      target.appendChild(button);
      this.addSyncStyles();
      this.syncButton = button;
      this.updateSyncUI();
    }
  }

  addSyncStyles() {
    if (document.getElementById("sync-button-styles")) return;

    const style = document.createElement("style");
    style.id = "sync-button-styles";
    style.textContent = `
            .sync-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 20px;
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
            }
            .sync-btn:hover:not(:disabled) {
                background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
            }
            .sync-btn:disabled {
                background: #6c757d;
                cursor: not-allowed;
                transform: none;
            }
            .sync-btn.offline { background: linear-gradient(135deg, #6c757d 0%, #545b62 100%); }
            .sync-btn.pending { 
                background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
                animation: pulse 2s infinite;
            }
            .sync-btn.syncing { 
                background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            }
            .sync-btn.success { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); }
            .sync-btn.error { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); }
            
            .sync-status {
                font-size: 11px;
                opacity: 0.8;
                background: rgba(255, 255, 255, 0.2);
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 50px;
                text-align: center;
            }
           
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }

            /* Default (desktop / larger screens) */
            .sync-btn .sync-text,
            .sync-btn .sync-status {
            display: inline;
            }
            
            /* Small screens: hide text, only show icon */
            @media (max-width: 600px) {
            .sync-btn .sync-text,
            .sync-btn .sync-status {
                display: none;
            }

            .sync-btn {
                padding: 10px;
                gap: 0; /* tighter spacing */
                min-width: 44px; /* keep it tappable */
                justify-content: center;
            }
            }
        `;
    document.head.appendChild(style);
  }

  updateSyncUI() {
    const btn = document.getElementById("manual-sync-btn");
    if (!btn) return;

    // Clear classes
    btn.classList.remove("offline", "pending", "syncing", "success", "error");

    const iconEl = btn.querySelector(".sync-icon");
    const textEl = btn.querySelector(".sync-text");
    const statusEl = btn.querySelector(".sync-status");

    if (!this.state.user) {
      btn.classList.add("offline");
      if (iconEl) iconEl.textContent = "🔴";
      if (statusEl) statusEl.textContent = "Offline";
    } else if (this.hasUnsavedChanges()) {
      btn.classList.add("pending");
      if (iconEl) iconEl.textContent = "🟡";
      if (statusEl) statusEl.textContent = "Changes ready";
    } else {
      if (iconEl) iconEl.textContent = "☁️";
      if (statusEl) statusEl.textContent = "In sync";
    }
  }

  hasUnsavedChanges() {
    if (!this.state.lastDatabaseSync) return true;
    if (!this.state.lastLocalChange) return false;
    return (
      new Date(this.state.lastLocalChange) >
      new Date(this.state.lastDatabaseSync)
    );
  }

  async performSync() {
    if (!this.state.user || this.state.isLoading) return;

    const btn = document.getElementById("manual-sync-btn");
    if (!btn) return;

    try {
      btn.classList.remove("offline", "pending", "success", "error");
      btn.classList.add("syncing");
      btn.disabled = true;

      const iconEl = btn.querySelector(".sync-icon");
      const statusEl = btn.querySelector(".sync-status");
      if (iconEl) iconEl.textContent = "🔄";
      if (statusEl) statusEl.textContent = "Syncing...";

      await this.saveToDatabase();

      btn.classList.remove("syncing");
      btn.classList.add("success");
      if (iconEl) iconEl.textContent = "✅";
      if (statusEl) statusEl.textContent = "Synced!";

      setTimeout(() => this.updateSyncUI(), 2000);
    } catch (error) {
      console.error("Sync error:", error);
      btn.classList.remove("syncing");
      btn.classList.add("error");

      const iconEl = btn.querySelector(".sync-icon");
      const statusEl = btn.querySelector(".sync-status");
      if (iconEl) iconEl.textContent = "❌";
      if (statusEl) statusEl.textContent = "Error";

      setTimeout(() => this.updateSyncUI(), 3000);
    } finally {
      btn.disabled = false;
    }
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  increaseTrainingMaxes() {
    const tm = this.state.trainingMaxes;
    this.updateState({
      trainingMaxes: {
        squat: (tm.squat || 0) + 2.5,
        bench: (tm.bench || 0) + 2.5,
        deadlift: (tm.deadlift || 0) + 2.5,
        ohp: (tm.ohp || 0) + 1.25,
      },
    });
  }

  resetState() {
    this.state = {
      trainingMaxes: { squat: 0, bench: 0, deadlift: 0, ohp: 0 },
      cycleSettings: { cycle: 1, week: 1 },
      accessories: { squat: [], bench: [], deadlift: [], ohp: [] },
      sessionCompletion: {},
      user: this.state.user, // Keep user
      isLoading: false,
      lastDatabaseSync: null,
      lastLocalChange: null,
      currentCycleProgressId: null,
      isInitialLoadComplete: false,
    };
    this.saveToLocalStorage();
    this.notifyListeners({});
  }

  dumpState() {
    console.log("Current State:", this.state);
    console.log("Listeners:", Array.from(this.listeners.keys()));
    console.log("Has unsaved changes:", this.hasUnsavedChanges());
    return this.state;
  }

  getSyncInfo() {
    return {
      hasUser: !!this.state.user,
      lastDatabaseSync: this.state.lastDatabaseSync,
      lastLocalChange: this.state.lastLocalChange,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      isInitialLoadComplete: this.state.isInitialLoadComplete,
    };
  }

  // Legacy compatibility
  async forceDatabaseSync() {
    this.updateState({ isInitialLoadComplete: false });
    await this.loadFromDatabase();
  }
}

// Create global instance
const unifiedStateStore = new UnifiedStateStore();
window.stateStore = unifiedStateStore;

// Debug methods
window.dumpState = () => unifiedStateStore.dumpState();
window.syncNow = () => unifiedStateStore.performSync();
window.forceDatabaseSync = () => unifiedStateStore.forceDatabaseSync();
window.getSyncInfo = () => unifiedStateStore.getSyncInfo();

// Export for modules
export { UnifiedStateStore };
export default unifiedStateStore;
