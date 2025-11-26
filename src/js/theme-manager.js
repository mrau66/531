/**
 * Theme Manager - Handles application theming
 *
 * PURPOSE:
 * Manages theme switching by applying CSS variables dynamically.
 * Subscribes to theme changes in state and updates the DOM.
 *
 * SUPPORTED THEMES:
 * - light: Clean, bright interface for daytime use
 * - dark: Eye-friendly dark theme for low-light environments
 * - contrast: Maximum contrast for accessibility
 */

import { THEMES } from './config.js';
import { ModuleInitializer, DebugLogger } from './shared-init.js';

class ThemeManager {
    constructor() {
        this.logger = new DebugLogger('ThemeManager');
        this.currentTheme = 'light';
        this.init();
    }

    async init() {
        await ModuleInitializer.waitForStateStore();

        if (window.stateStore) {
            // Apply initial theme
            const initialTheme = window.stateStore.getState('theme') || 'light';
            this.applyTheme(initialTheme);

            // Subscribe to theme changes
            window.stateStore.subscribe('theme', (theme) => {
                this.logger.log(`Theme changed to: ${theme}`);
                this.applyTheme(theme);
            });

            this.logger.log('Initialized');
        }
    }

    applyTheme(themeName) {
        const theme = THEMES[themeName];

        if (!theme) {
            this.logger.log(`Theme "${themeName}" not found, using light`);
            themeName = 'light';
        }

        this.currentTheme = themeName;
        const themeConfig = THEMES[themeName];

        // Apply CSS variables to :root
        const root = document.documentElement;
        Object.entries(themeConfig.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });

        // Add theme class to body for additional styling
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-contrast');
        document.body.classList.add(`theme-${themeName}`);

        // Store theme preference for persistence
        this.logger.log(`Applied theme: ${themeName}`);
    }

    getAvailableThemes() {
        return Object.keys(THEMES).map(key => ({
            id: key,
            ...THEMES[key]
        }));
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Initialize theme manager
document.addEventListener('DOMContentLoaded', function() {
    window.themeManager = new ThemeManager();
    console.log('✅ Theme Manager initialized');
});

export { ThemeManager };
export default ThemeManager;
