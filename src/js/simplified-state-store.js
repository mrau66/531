/**
 * UnifiedStateStore - Central State Management Orchestrator
 *
 * PURPOSE:
 * Single source of truth for all application data. Orchestrates state management,
 * persistence, and sync UI by delegating to specialized managers.
 *
 * ARCHITECTURE:
 * This class has been refactored to follow Single Responsibility Principle:
 * - CoreStateStore: Pure state management and subscriptions
 * - PersistenceManager: LocalStorage and database operations
 * - SyncUIManager: Sync button UI and manual sync operations
 *
 * KEY RESPONSIBILITIES:
 * - Initialize all sub-managers
 * - Handle auth state changes
 * - Handle visibility changes (app resume)
 * - Provide unified API by delegating to sub-managers
 *
 * DATA FLOW:
 * Components → UnifiedStateStore → CoreStateStore → Persistence → UI Updates
 *
 * SUBSCRIPTION PATTERN:
 * Components call subscribe('stateKey', callback) to react to specific state changes.
 * Callbacks fire immediately with current value and on every subsequent change.
 *
 * INITIALIZATION:
 * Auto-initializes as global window.stateStore, loads from localStorage immediately,
 * then attempts database sync if authenticated.
 */
import { supabase } from "./supabase.js";
import { CoreStateStore } from "./core-state-store.js";
import { PersistenceManager } from "./persistence-manager.js";
import { SyncUIManager } from "./sync-ui-manager.js";

class UnifiedStateStore {
  constructor() {
    // Create sub-managers
    this.coreStore = new CoreStateStore();
    this.persistence = new PersistenceManager(this.coreStore);
    this.syncUI = new SyncUIManager(this.coreStore, this.persistence);

    // Initialization state
    this.isInitialized = false;

    // Start initialization
    this.init();
  }

  // ===========================================
  // INITIALIZATION
  // ===========================================

  async init() {
    if (this.isInitialized) return;

    // Load local data immediately
    this.persistence.loadFromLocalStorage();

    // Setup auth listener
    this.setupAuthListener();

    // Wait for auth to be ready
    await this.waitForAuth();

    // Create sync UI if on app pages
    if (window.location.pathname.startsWith("/app")) {
      this.syncUI.createSyncUI();
    }

    // Detect when the app resumes and prevent interactions until reload completes
    this.setupVisibilityListener();

    this.isInitialized = true;
    console.log("✅ UnifiedStateStore initialized");
  }

  setupVisibilityListener() {
    document.addEventListener("visibilitychange", async () => {
      if (!document.hidden && this.coreStore.state.user) {
        console.log("👀 Page became visible, reloading data...");

        // Signal that we're reloading
        window.dispatchEvent(new CustomEvent("stateStoreReloading"));

        // Reload fresh data from database
        await this.persistence.loadFromDatabase();

        // Signal that reload is complete
        window.dispatchEvent(new CustomEvent("stateStoreFullyReady"));

        console.log("✅ Data reloaded after resume");
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
        this.coreStore.updateState({ user: event.detail.user });
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
    console.log("👤 Handling user sign in:", user.email);
    this.coreStore.updateState({ user });

    // Load from database first
    await this.persistence.loadFromDatabase();

    // Then check if localStorage has ADDITIONAL data not in database
    const localOnlyData = this.persistence.checkForLocalOnlyData();

    if (localOnlyData) {
      console.log("⚠️ Found offline changes, merging with server data");
      await this.persistence.mergeAndSave(localOnlyData);
    }

    this.syncUI.updateSyncUI();

    // Signal that StateStore is fully ready with data
    window.dispatchEvent(new CustomEvent("stateStoreFullyReady"));
    console.log("📢 StateStore fully ready event dispatched");
  }

  handleUserSignOut() {
    console.log("👋 User signed out");
    this.coreStore.updateState({
      user: null,
      currentCycleProgressId: null,
      isInitialLoadComplete: true,
    });
    this.syncUI.updateSyncUI();
  }

  enableOfflineMode() {
    console.log("🔴 Enabling offline mode");
    this.coreStore.updateState({ isInitialLoadComplete: true });
  }

  // ===========================================
  // DELEGATED METHODS - State Management
  // ===========================================

  subscribe(path, callback) {
    return this.coreStore.subscribe(path, callback);
  }

  getState(path = null) {
    return this.coreStore.getState(path);
  }

  updateState(updates) {
    const shouldPersist = this.coreStore.updateState(updates);

    // Save to localStorage if this was a user data change
    if (shouldPersist) {
      this.persistence.saveToLocalStorage();
    }

    // Update sync UI
    this.syncUI.updateSyncUI();
  }

  // ===========================================
  // DELEGATED METHODS - Convenience Setters/Getters
  // ===========================================

  setTrainingMax(lift, value) {
    this.coreStore.setTrainingMax(lift, value);
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  setAllTrainingMaxes(maxes) {
    this.coreStore.setAllTrainingMaxes(maxes);
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  getTrainingMax(lift) {
    return this.coreStore.getTrainingMax(lift);
  }

  hasTrainingMaxes() {
    return this.coreStore.hasTrainingMaxes();
  }

  increaseTrainingMaxes() {
    this.coreStore.increaseTrainingMaxes();
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  setCycleSettings(cycle, week) {
    this.coreStore.setCycleSettings(cycle, week);
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  getCycleSettings() {
    return this.coreStore.getCycleSettings();
  }

  setAccessories(lift, accessories) {
    this.coreStore.setAccessories(lift, accessories);
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  getAccessories(lift) {
    return this.coreStore.getAccessories(lift);
  }

  setSessionCompletion(lift, cycle, week, data) {
    this.coreStore.setSessionCompletion(lift, cycle, week, data);
    if (this.coreStore.state.isInitialLoadComplete) {
      this.persistence.saveToLocalStorage();
      this.syncUI.updateSyncUI();
    }
  }

  getSessionCompletion(lift, cycle = null, week = null) {
    return this.coreStore.getSessionCompletion(lift, cycle, week);
  }

  getCalculatorData() {
    return this.coreStore.getCalculatorData();
  }

  // ===========================================
  // DELEGATED METHODS - Persistence
  // ===========================================

  saveToDatabase() {
    return this.persistence.saveToDatabase();
  }

  manualSaveToDatabase() {
    return this.persistence.manualSaveToDatabase();
  }

  loadFromDatabase() {
    return this.persistence.loadFromDatabase();
  }

  saveTrainingMaxes() {
    return this.persistence.saveTrainingMaxes();
  }

  saveCycleSettings() {
    return this.persistence.saveCycleSettings();
  }

  saveAccessories() {
    return this.persistence.saveAccessories();
  }

  saveSessionCompletionToDB(lift, data) {
    return this.persistence.saveSessionCompletionToDB(lift, data);
  }

  // Compatibility aliases
  saveTrainingMaxesToDB() {
    return this.persistence.saveTrainingMaxesToDB();
  }

  saveCycleSettingsToDB() {
    return this.persistence.saveCycleSettingsToDB();
  }

  saveAccessoriesToDB() {
    return this.persistence.saveAccessoriesToDB();
  }

  forceDatabaseSync() {
    return this.persistence.forceDatabaseSync();
  }

  // ===========================================
  // DELEGATED METHODS - Sync UI
  // ===========================================

  performSync() {
    return this.syncUI.performSync();
  }

  getSyncInfo() {
    return this.syncUI.getSyncInfo();
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  resetState() {
    this.coreStore.resetState();
    this.persistence.saveToLocalStorage();
    this.syncUI.updateSyncUI();
  }

  dumpState() {
    return this.coreStore.dumpState();
  }

  // Expose state for backward compatibility
  get state() {
    return this.coreStore.state;
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
