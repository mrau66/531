/**
 * Workout Manager 
 */
import { ModuleInitializer, DebugLogger } from './shared-init.js';

class WorkoutManager {
    constructor() {
        this.logger = new DebugLogger('WorkoutManager');
        this.pageType = this.detectPageType();
        this.liftType = this.detectLiftType();
        this.cycleConfigs = {
            1: { percentage: 45, reps: 12, type: "Volume", description: "5 sets x 12 reps @ 45%" },
            2: { percentage: 75, reps: 6, type: "Intensity", description: "5 sets x 6 reps @ 75%" },
            3: { percentage: 50, reps: 11, type: "Volume", description: "5 sets x 11 reps @ 50%" },
            4: { percentage: 80, reps: 5, type: "Intensity", description: "5 sets x 5 reps @ 80%" },
            5: { percentage: 55, reps: 10, type: "Volume", description: "5 sets x 10 reps @ 55%" },
            6: { percentage: 85, reps: 4, type: "Intensity", description: "5 sets x 4 reps @ 85%" },
            7: { percentage: 60, reps: 9, type: "Volume", description: "5 sets x 9 reps @ 60%" },
            8: { percentage: 90, reps: 3, type: "Intensity", description: "5 sets x 3 reps @ 90%" },
            9: { percentage: 65, reps: 8, type: "Volume", description: "5 sets x 8 reps @ 65%" },
            10: { percentage: 95, reps: 2, type: "Intensity", description: "5 sets x 2 reps @ 95%" },
            11: { percentage: 70, reps: 7, type: "Volume", description: "5 sets x 7 reps @ 70%" },
            12: { percentage: 100, reps: 1, type: "Test Week", description: "Test maxes or TM test" }
        };
        this.weekConfigs = {
            1: [{ percentage: 65, reps: 5 }, { percentage: 75, reps: 5 }, { percentage: 85, reps: 5 }],
            2: [{ percentage: 70, reps: 5 }, { percentage: 80, reps: 5 }, { percentage: 90, reps: 5 }],
            3: [{ percentage: 75, reps: 5 }, { percentage: 85, reps: 5 }, { percentage: 95, reps: 5 }]
        };
        this.init();
    }

    detectPageType() {
        const path = window.location.pathname;
        if (path === '/app/') return 'dashboard';
        if (path.match(/\/app\/(squat|bench|deadlift|ohp)\//)) return 'lift';
        return null;
    }

    detectLiftType() {
        const match = window.location.pathname.match(/\/(squat|bench|deadlift|ohp)\//);
        return match ? match[1] : null;
    }

    async init() {
        await ModuleInitializer.waitForStateStore();
        if (!window.stateStore) return;

        this.setupSubscriptions();
        this.updateAll();
        
        if (this.pageType === 'lift') {
            this.setupKeyboardNav();
        }
        
        this.logger.log(`Initialized for ${this.pageType || 'unknown'} page`);
    }

    setupSubscriptions() {
        window.stateStore.subscribe('trainingMaxes', () => this.updateWorkouts());
        window.stateStore.subscribe('cycleSettings', () => this.updateAll());
        window.stateStore.subscribe('accessories', () => this.updateAccessories());
    }

    updateAll() {
        const state = window.stateStore.getState();
        this.updateCycleInfo(state.cycleSettings);
        this.updateWorkouts();
        this.updateAccessories();
    }

    updateCycleInfo({ cycle, week }) {
        const config = this.cycleConfigs[cycle];
        if (!config) return;

        document.title = `C${cycle}W${week} - ${config.type} (${config.description}) | 531 x 365`;

        const badge = document.getElementById('cycle-badge-text');
        if (badge) {
            badge.textContent = `C${cycle}W${week} • ${config.description.replace(' sets x ', '×').replace(' reps @ ', '@')}`;
        }

        const updates = {
            'cycle-text-inline': `Cycle ${cycle} - ${config.type} Phase`,
            'week-text-inline': `Week ${week}`,
            'description-text-inline': config.description,
            'cycle-info': `<h3>Cycle ${cycle} (Week ${week}) - ${config.type} Phase</h3><p class="cycle-type">${config.description}</p>`
        };

        Object.entries(updates).forEach(([id, content]) => {
            const el = document.getElementById(id);
            if (el) {
                el[id === 'cycle-info' ? 'innerHTML' : 'textContent'] = content;
            }
        });
    }

    getActiveLifts() {
        return this.pageType === 'lift' ? [this.liftType] : ['squat', 'bench', 'deadlift', 'ohp'];
    }

    updateWorkouts() {
        const { trainingMaxes, cycleSettings } = window.stateStore.getState();
        const hasData = Object.values(trainingMaxes).some(tm => tm > 0);
        
        const globalNoData = document.getElementById('global-no-data');
        if (globalNoData) {
            globalNoData.style.display = hasData ? 'none' : 'block';
        }

        this.getActiveLifts().forEach(lift => {
            this.updateLift(lift, trainingMaxes[lift] || 0, cycleSettings);
        });
    }

    updateLift(liftName, tm, { cycle, week }) {
        const container = this.pageType === 'lift' 
            ? document.querySelector('.lift-workout')
            : document.querySelector(`[data-tab="${liftName}"] .lift-card`);
        
        const noData = document.getElementById(`${liftName}-no-data`);
        const tmDisplay = document.getElementById(`${liftName}-tm-display`);
        
        if (tmDisplay) tmDisplay.textContent = tm;

        if (tm <= 0) {
            if (container) container.style.display = 'none';
            if (noData) noData.style.display = 'block';
            return;
        }
        
        if (container) container.style.display = 'block';
        if (noData) noData.style.display = 'none';

        this.updateSets(liftName, tm, cycle, week);
    }

    updateSets(liftName, tm, cycle, week) {
        this.updateMainSets(liftName, tm, week);
        this.updateSupplementalSets(liftName, tm, cycle);
    }

    updateMainSets(liftName, tm, week) {
        const container = document.getElementById(`${liftName}-main-sets`);
        if (!container) return;

        const mainSets = this.weekConfigs[week] || [];
        const rows = container.querySelectorAll('.set-row');
        
        mainSets.forEach((set, i) => {
            if (rows[i]) {
                const weight = Math.round(tm * set.percentage / 100 * 2) / 2;
                this.updateSetRow(rows[i], set.reps, set.percentage, weight);
                rows[i].style.display = 'flex';
            }
        });
        
        for (let i = mainSets.length; i < rows.length; i++) {
            rows[i].style.display = 'none';
        }
    }

    updateSupplementalSets(liftName, tm, cycle) {
        const container = document.getElementById(`${liftName}-supplemental-sets`);
        if (!container) return;

        const config = this.cycleConfigs[cycle];
        const rows = container.querySelectorAll('.set-row');
        
        if (cycle === 12) {
            if (rows[0]) {
                rows[0].innerHTML = '<span class="set-info">Work up to new 1RM</span><span class="weight">Test Max</span>';
                rows[0].style.display = 'flex';
            }
            for (let i = 1; i < rows.length; i++) {
                rows[i].style.display = 'none';
            }
        } else if (config) {
            const weight = Math.round(tm * config.percentage / 100 * 2) / 2;
            for (let i = 0; i < 5 && rows[i]; i++) {
                this.updateSetRow(rows[i], config.reps, config.percentage, weight);
                rows[i].style.display = 'flex';
            }
        }
    }

    updateSetRow(row, reps, percentage, weight) {
        const updates = {
            '.reps': reps,
            '.percentage': percentage,
            '.weight-value': weight
        };
        
        Object.entries(updates).forEach(([selector, value]) => {
            const el = row.querySelector(selector);
            if (el) el.textContent = value;
        });
    }

    updateAccessories() {
        const { accessories } = window.stateStore.getState();
        if (!accessories) return;

        this.getActiveLifts().forEach(lift => {
            const container = document.getElementById(`${lift}-accessories`);
            if (!container) return;
            
            container.innerHTML = '';
            (accessories[lift] || []).forEach(accessory => {
                const div = document.createElement('div');
                div.className = 'accessory-item';
                div.textContent = accessory;
                container.appendChild(div);
            });
        });
    }

    setupKeyboardNav() {
        const order = ['squat', 'bench', 'deadlift', 'ohp'];
        const currentIndex = order.indexOf(this.liftType);
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                window.location.href = `/app/${order[(currentIndex - 1 + 4) % 4]}/`;
            } else if (e.key === 'ArrowRight') {
                window.location.href = `/app/${order[(currentIndex + 1) % 4]}/`;
            } else if (e.key === 'h') {
                window.location.href = '/app/';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.startsWith('/app/')) {
        window.workoutManager = new WorkoutManager();
        // window.calculator = window.workoutManager;
        window.refreshWorkout = () => window.workoutManager?.updateWorkouts();
    }
});
