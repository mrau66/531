/**
 * Shared Utilities
 * Common functions used across multiple modules
 */

export class ModuleInitializer {
    static async waitFor(condition, timeout = 5000, interval = 100) {
        const start = Date.now();
        while (!condition() && Date.now() - start < timeout) {
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        return condition();
    }
    
    static async waitForStateStore() {
        return this.waitFor(() => window.stateStore);
    }
    
    static async waitForAuth() {
        return this.waitFor(() => window.auth?.hasCheckedSession);
    }
}

export class DebugLogger {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.enabled = localStorage.getItem('debug') === 'true';
    }
    
    log(...args) {
        if (this.enabled) {
            console.log(`[${this.moduleName}]`, ...args);
        }
    }
    
    error(...args) {
        console.error(`[${this.moduleName}]`, ...args);
    }
}

export function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function vibrate(duration = 30) {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(duration);
        } catch (e) {
            // Silently fail
        }
    }
}
