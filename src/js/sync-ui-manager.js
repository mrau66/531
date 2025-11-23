/**
 * SyncUIManager - Sync Button UI Management
 *
 * PURPOSE:
 * Manages the "Sync to Cloud" button that appears on app pages.
 * Handles button creation, styling, state updates, and sync operations.
 *
 * RESPONSIBILITIES:
 * - Create and inject sync button into DOM
 * - Add button styles dynamically
 * - Update button state based on sync status
 * - Perform manual sync operations
 * - Show visual feedback (syncing, success, error)
 *
 * DEPENDENCIES:
 * - CoreStateStore: Check user status and sync state
 * - PersistenceManager: Execute save operations
 */

export class SyncUIManager {
  constructor(coreStore, persistenceManager) {
    this.coreStore = coreStore;
    this.persistenceManager = persistenceManager;
    this.syncButton = null;
  }

  // ===========================================
  // SYNC UI CREATION
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
          gap: 0;
          min-width: 44px;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ===========================================
  // SYNC UI UPDATES
  // ===========================================

  updateSyncUI() {
    const btn = document.getElementById("manual-sync-btn");
    if (!btn) return;

    // Clear classes
    btn.classList.remove("offline", "pending", "syncing", "success", "error");

    const iconEl = btn.querySelector(".sync-icon");
    const statusEl = btn.querySelector(".sync-status");

    if (!this.coreStore.state.user) {
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
    if (!this.coreStore.state.lastDatabaseSync) return true;
    if (!this.coreStore.state.lastLocalChange) return false;
    return (
      new Date(this.coreStore.state.lastLocalChange) >
      new Date(this.coreStore.state.lastDatabaseSync)
    );
  }

  // ===========================================
  // SYNC OPERATIONS
  // ===========================================

  async performSync() {
    if (!this.coreStore.state.user || this.coreStore.state.isLoading) return;

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

      await this.persistenceManager.saveToDatabase();

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

  getSyncInfo() {
    return {
      hasUser: !!this.coreStore.state.user,
      lastDatabaseSync: this.coreStore.state.lastDatabaseSync,
      lastLocalChange: this.coreStore.state.lastLocalChange,
      hasUnsavedChanges: this.hasUnsavedChanges(),
      isInitialLoadComplete: this.coreStore.state.isInitialLoadComplete,
    };
  }
}
