# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

531 x 365 Calculator - A comprehensive training calculator for the 531 powerlifting program built with Eleventy (static site generator). Features a 12-cycle year-long program with offline-first architecture using localStorage and optional Supabase cloud sync.

## Development Commands

```bash
# Development server with hot reload
npm run serve
# or
npm start

# Production build (enables JS minification)
npm run build

# Production build (alternative env var)
npm run build:prod

# Debug mode with verbose Eleventy logging
npm run debug

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Environment Setup

Create a `.env` file with Supabase credentials:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

These are injected into templates via `.eleventy.js` global data and rendered in `env-config.njk`.

## Architecture

### Static Site Generation (Eleventy)

- **Input**: `src/` directory
- **Output**: `_site/` directory
- **Templates**: Nunjucks (`.njk`) files
- **Layouts**: `src/_layouts/` - `app-base.njk` (authenticated pages), `login-base.njk` (public pages)
- **Includes**: `src/_includes/` - Reusable components
- **Pages**: Top-level `.njk` files in `src/` (e.g., `squat.njk`, `bench.njk`, `app.njk`)

### Client-Side State Management

**UnifiedStateStore** (`simplified-state-store.js`) - Single source of truth for all app data:
- **State structure**: `trainingMaxes`, `cycleSettings`, `accessories`, `sessionCompletion`, `user`, sync metadata
- **Persistence**: Offline-first with localStorage, manual sync to Supabase via "Sync to Cloud" button
- **Subscription system**: Components subscribe to state changes via `subscribe(path, callback)`
- **Initialization**: Auto-loads from localStorage immediately, then syncs with database if authenticated

### Key JavaScript Modules

All modules use ES6 imports and are located in `src/js/`:

1. **supabase.js** - Supabase client initialization
   - Waits for `window.SUPABASE_CONFIG` from rendered template
   - Exports `getSupabase()` async function and `supabase` global

2. **auth.js** - AuthManager class
   - Handles sign in/out, session checking, redirects
   - Dispatches custom events: `authManagerReady`, `userSignedIn`, `userSignedOut`, `appInitialized`
   - Auto-redirects: login → app (if authenticated), app → login (if not)

3. **simplified-state-store.js** - UnifiedStateStore class (see above)
   - Creates sync UI button dynamically on app pages
   - Handles app resume visibility detection and data reload
   - Global instance: `window.stateStore`

4. **workout-manager.js** - WorkoutManager class
   - Calculates and displays workout weights based on training maxes and cycle/week
   - Updates main sets (3 sets per week), supplemental sets (5 sets FSL), accessories
   - Handles keyboard navigation (left/right arrows between lifts, 'h' for home)

5. **session-tracker.js** - SessionTracker class
   - Interactive workout completion tracking (tap/click to mark sets complete)
   - Visual feedback: green background, strikethrough, border
   - Persists to StateStore, auto-saves to DB if online
   - Mobile-optimized: pending actions queue, haptic feedback, grey-out during loading
   - Progress tracking: displays "x/y exercises completed (%)"

6. **shared-init.js** - ModuleInitializer and DebugLogger utilities
   - Provides `waitForStateStore()` helper for module initialization

### 531 Program Logic

**12 Cycles** defined in `src/_data/cycles.json` and `workout-manager.js`:
- Cycles 1-11: Alternating Volume (45-70% for higher reps) and Intensity (75-100% for lower reps)
- Cycle 12: Max test week
- Training Max progression: +2.5 lbs per cycle (Squat/Bench/Deadlift), +1.25 lbs (OHP)

**3 Weeks per Cycle**:
- Week 1: 65%×5, 75%×5, 85%×5
- Week 2: 70%×5, 80%×5, 90%×5
- Week 3: 75%×5, 85%×5, 95%×5

**Supplemental Work**: 5 sets of FSL (First Set Last) at cycle-specific percentages

### Data Flow

1. **Page Load**:
   - Eleventy renders static HTML with data from `_data/cycles.json`
   - `env-config.njk` injects Supabase credentials
   - Modules initialize: `supabase.js` → `auth.js` → `simplified-state-store.js` → `workout-manager.js` → `session-tracker.js`

2. **State Updates**:
   - User changes data → `stateStore.updateState()` → saves to localStorage → notifies subscribers
   - Subscribers (WorkoutManager, SessionTracker) update UI
   - Manual "Sync to Cloud" button saves to Supabase

3. **Session Completion**:
   - User taps exercise → SessionTracker toggles visual state → updates StateStore → auto-saves to DB (if online)
   - Session data keyed by `{lift}_{cycle}_{week}` with arrays for `mainSets`, `supplementalSets`, `accessories`

### Database Schema (Supabase)

Tables referenced in code:
- `training_maxes` - User training maxes with `effective_date`
- `cycle_progress` - Current cycle/week with `is_active` flag
- `workout_sessions` - Session completion data linked to `cycle_progress_id`
- `user_settings` - Accessories JSON object

### Event System

Custom events for cross-module communication:
- `authManagerReady` - Auth check complete
- `userSignedIn` - User authenticated
- `userSignedOut` - User logged out
- `appInitialized` - App ready with user data
- `stateStoreFullyReady` - Database load complete
- `stateStoreReloading` - App resumed, reloading data

### Build Process

Development mode (`npm run serve`):
- No JS minification
- CSS minification via CleanCSS transform
- Live reload enabled
- Watches `src/js/` and `src/assets/css/`

Production mode (`npm run build`):
- JS minification via Terser in `afterBuild` hook
- Recursively processes `src/js/` directory
- CSS minification enabled
- Environment check via `NODE_ENV=production` or `ELEVENTY_ENV=production`

### File Structure Notes

- Each lift has dedicated page: `squat.njk`, `bench.njk`, `deadlift.njk`, `ohp.njk`
- Dashboard: `app.njk` with tabbed interface for all lifts
- Shared workout display: `lift-workout.njk` include
- Input form: `input-form.njk` (used in settings for training maxes)
- Navbar: `navbar-app.njk` (authenticated), `navbar.njk` (public)

### Important Implementation Details

1. **Offline-First**: Always save to localStorage first, sync to cloud is optional and manual
2. **Page Resume**: App detects visibility changes and reloads data to prevent stale state
3. **Initialization Race Conditions**: SessionTracker waits for `stateStoreFullyReady` event before accepting interactions
4. **Debouncing**: Session saves debounced to 1 second, cycle settings reloads debounced to 200ms
5. **Weight Rounding**: All weights rounded to nearest 0.5 lbs (half-pound plates)
6. **Percentage Calculation**: `Math.round(trainingMax * percentage / 100 * 2) / 2`

### Common Patterns

**Subscribing to state changes**:
```javascript
window.stateStore.subscribe('trainingMaxes', (newValue, oldValue) => {
    // React to changes
});
```

**Updating state**:
```javascript
window.stateStore.updateState({
    trainingMaxes: { squat: 300 }
});
```

**Getting session completion**:
```javascript
const completion = window.stateStore.getSessionCompletion('squat', cycle, week);
// Returns: { mainSets: [bool], supplementalSets: [bool], accessories: [bool] }
```

### Testing

Comprehensive Jest test suite with 76+ passing tests covering:

**Test Files** (`__tests__/`):
- `state-store.test.js` - UnifiedStateStore functionality (30 tests)
- `workout-manager.test.js` - Workout calculations and display (30 tests)
- `session-tracker.test.js` - Interactive completion tracking (16 tests)
- `test-utils.js` - Shared test utilities and mocks
- `setup.js` - Global test setup (localStorage, Supabase, PointerEvent mocks)

**Coverage Areas**:
- State management and subscriptions
- Training maxes CRUD operations
- Cycle/week configurations
- Weight calculations and rounding
- Session completion tracking
- Visual feedback and progress tracking
- LocalStorage persistence

**Running Tests**:
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

**Manual Testing Checklist**:
1. Offline mode (no auth, localStorage persistence)
2. Online mode (auth, database sync)
3. App resume (switch apps, verify data reloads)
4. Cross-device sync
