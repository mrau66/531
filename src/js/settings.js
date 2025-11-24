/**
 * Settings Manager - Simplified
 */
import { ModuleInitializer, DebugLogger } from './shared-init.js';

class SettingsManager {
    constructor() {
        this.logger = new DebugLogger('SettingsManager');
        // this.hasUnsavedChanges = false;
        this.init();
    }

    async init() {
        await ModuleInitializer.waitForStateStore();
        
        if (window.stateStore) {
            this.setupSubscriptions();
            this.setupEventListeners();
            setTimeout(() => this.loadInitialState(), 100);
            this.logger.log('Initialized');
        }
    }

    setupSubscriptions() {
        window.stateStore.subscribe('trainingMaxes', (tm) => this.updateTrainingMaxInputs(tm));
        window.stateStore.subscribe('cycleSettings', (cs) => this.updateCycleSettingsInputs(cs));
        window.stateStore.subscribe('progressionRate', (rate) => this.updateProgressionRateInput(rate));
        window.stateStore.subscribe('repScheme', (scheme) => this.updateRepSchemeInput(scheme));
        window.stateStore.subscribe('accessories', (acc) => {
            this.applyAccessorySettingsToUI(acc);
            this.updateSelectionCounts(acc);
        });
    }

    setupEventListeners() {
        // Training max inputs
        ['squat', 'bench', 'deadlift', 'ohp'].forEach(lift => {
            const input = document.getElementById(`${lift}-max`);
            if (input) {
                input.addEventListener('input', (e) => {
                    window.stateStore.setTrainingMax(lift, parseFloat(e.target.value) || 0);
                    // this.hasUnsavedChanges = true;
                });
            }
        });

        // Progression rate
        const progressionSelect = document.getElementById('progression-rate-select');
        progressionSelect?.addEventListener('change', (e) => {
            window.stateStore.updateState({ progressionRate: e.target.value });
        });

        // Rep scheme
        const repSchemeSelect = document.getElementById('rep-scheme-select');
        repSchemeSelect?.addEventListener('change', (e) => {
            window.stateStore.updateState({ repScheme: e.target.value });
        });

        // Cycle settings
        const cycleSelect = document.getElementById('cycle-select');
        const weekSelect = document.getElementById('week-select');

        const updateCycle = () => {
            const cycle = parseInt(cycleSelect?.value || 1);
            const week = parseInt(weekSelect?.value || 1);
            window.stateStore.setCycleSettings(cycle, week);
            // this.hasUnsavedChanges = true;
        };

        cycleSelect?.addEventListener('change', updateCycle);
        weekSelect?.addEventListener('change', updateCycle);

        // Accessory checkboxes
        document.querySelectorAll('.accessory-checkbox input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleAccessoryChange(e));
        });

        // Save buttons
        this.setupSaveButtons();

        // Increase TM button
        document.getElementById("increaseTmButton")?.addEventListener("click", () => {
            window.stateStore.increaseTrainingMaxes();
            // this.hasUnsavedChanges = true;
        });

        // Quick action buttons
        this.addQuickActionButtons();
    }

    setupSaveButtons() {
        const buttons = [
            { id: 'save-training-maxes-btn', fn: () => window.stateStore.saveTrainingMaxes() },
            { id: 'save-progression-btn', fn: () => window.stateStore.saveProgressionRate() },
            { id: 'save-rep-scheme-btn', fn: () => window.stateStore.saveRepScheme() },
            { id: 'save-cycle-settings-btn', fn: () => window.stateStore.saveCycleSettings() },
            { id: 'save-accessories-btn', fn: () => window.stateStore.saveAccessories() },
            { id: 'save-all-settings-btn', fn: () => window.stateStore.saveToDatabase() }
        ];

        buttons.forEach(({ id, fn }) => {
            document.getElementById(id)?.addEventListener('click', () => this.saveWithFeedback(id, fn));
        });
    }

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
            // this.hasUnsavedChanges = false;
        } catch (error) {
            this.logger.error('Save error:', error);
            setState('❌', 'Failed', false);
        }
        
        setTimeout(() => setState('💾', 'Save', false), 2000);
    }

    loadInitialState() {
        if (!window.stateStore) return;

        const state = window.stateStore.getState();
        this.updateTrainingMaxInputs(state.trainingMaxes);
        this.updateProgressionRateInput(state.progressionRate);
        this.updateRepSchemeInput(state.repScheme);
        this.updateCycleSettingsInputs(state.cycleSettings);
        this.applyAccessorySettingsToUI(state.accessories);
        this.updateSelectionCounts(state.accessories);
    }

    updateTrainingMaxInputs(trainingMaxes) {
        if (!trainingMaxes) return;

        Object.keys(trainingMaxes).forEach(lift => {
            const input = document.getElementById(`${lift}-max`);
            if (input && input.value !== trainingMaxes[lift].toString()) {
                input.value = trainingMaxes[lift] || '';
            }
        });
    }

    updateProgressionRateInput(progressionRate) {
        const select = document.getElementById('progression-rate-select');
        if (select && progressionRate && select.value !== progressionRate) {
            select.value = progressionRate;
        }
    }

    updateRepSchemeInput(repScheme) {
        const select = document.getElementById('rep-scheme-select');
        if (select && repScheme && select.value !== repScheme) {
            select.value = repScheme;
        }
    }

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
    }

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
    }

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
    }

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
        // this.hasUnsavedChanges = true;
    }

    addQuickActionButtons() {
        const liftCards = document.querySelectorAll('.lift-settings-card');
        
        liftCards.forEach((card, index) => {
            const header = card.querySelector('.lift-settings-header');
            const liftType = ['squat', 'bench', 'deadlift', 'ohp'][index];
            
            if (!header || !liftType || header.querySelector('.quick-actions')) return;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'quick-actions';
            actionsDiv.innerHTML = `
                <button type="button" class="quick-action-btn" onclick="window.settingsManager.selectAllForLift('${liftType}')">
                    Select All
                </button>
                <button type="button" class="quick-action-btn" onclick="window.settingsManager.deselectAllForLift('${liftType}')">
                    Clear
                </button>
            `;

            const selectionCount = header.querySelector('.selection-count');
            header.insertBefore(actionsDiv, selectionCount);
        });

        if (!document.getElementById('quick-actions-styles')) {
            const style = document.createElement('style');
            style.id = 'quick-actions-styles';
            style.textContent = `
                .quick-actions {
                    display: flex;
                    gap: 8px;
                }
                .quick-action-btn {
                    background: rgba(255, 255, 255, 0.9);
                    border: 1px solid rgba(0, 0, 0, 0.1);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75em;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: var(--dark-gray-color);
                }
                .quick-action-btn:hover {
                    background: white;
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
            `;
            document.head.appendChild(style);
        }
    }

    selectAllForLift(liftType) {
        const accessoriesList = document.querySelector(`[data-lift="${liftType}"]`);
        if (!accessoriesList) return;

        const checkboxes = accessoriesList.querySelectorAll('input[type="checkbox"]');
        const newAccessories = Array.from(checkboxes).map(cb => {
            cb.checked = true;
            return cb.value;
        });

        window.stateStore.setAccessories(liftType, newAccessories);
        // this.hasUnsavedChanges = true;
    }

    deselectAllForLift(liftType) {
        const accessoriesList = document.querySelector(`[data-lift="${liftType}"]`);
        if (!accessoriesList) return;

        accessoriesList.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        window.stateStore.setAccessories(liftType, []);
        // this.hasUnsavedChanges = true;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/settings')) {
        window.settingsManager = new SettingsManager();
        window.forceRefreshSettings = () => window.settingsManager.loadInitialState();
    }
});
