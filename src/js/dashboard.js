/**
 * Dashboard Manager - Simplified
 */
import { ModuleInitializer, DebugLogger } from './shared-init.js';

class DashboardManager {
    constructor() {
        this.logger = new DebugLogger('Dashboard');
        this.init();
    }
    
    async init() {
        await ModuleInitializer.waitForStateStore();
        
        if (window.stateStore) {
            this.setupSubscriptions();
            this.updateAllDisplays();
            this.logger.log('Initialized');
        }
    }
    
    setupSubscriptions() {
        window.stateStore.subscribe('trainingMaxes', (tm) => this.updateDashboardTMs(tm));
        window.stateStore.subscribe('cycleSettings', (cs) => this.updateCycleDisplay(cs));
    }
    
    updateDashboardTMs(trainingMaxes) {
        if (!trainingMaxes) return;
        
        Object.keys(trainingMaxes).forEach(lift => {
            const displayEl = document.getElementById(`${lift}-tm-dash`);
            if (displayEl) {
                displayEl.textContent = trainingMaxes[lift] || 0;
            }
        });
    }
    
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
                'cycle-text-inline': `Cycle ${cycle} - ${config.type} Phase`,
                'week-text-inline': `Week ${week}`,
                'description-text-inline': config.description
            };
            
            Object.entries(updates).forEach(([id, text]) => {
                const el = document.getElementById(id);
                if (el) el.textContent = text;
            });
        }
    }
    
    updateAllDisplays() {
        if (!window.stateStore) return;
        
        const state = window.stateStore.getState();
        this.updateDashboardTMs(state.trainingMaxes);
        this.updateCycleDisplay(state.cycleSettings);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/app/') {
        window.dashboardManager = new DashboardManager();
    }
});
