# 531 x 365 Calculator - Architecture Overview

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Layers](#architecture-layers)
4. [Core Modules](#core-modules)
5. [Class Relationships](#class-relationships)
6. [Data Flow](#data-flow)
7. [Initialization Sequence](#initialization-sequence)
8. [Event System](#event-system)
9. [531 Program Logic](#531-program-logic)

---

## Project Overview

A comprehensive training calculator for the 531 powerlifting program, providing a 12-cycle year-long training program. Built as a static site with offline-first architecture.

**Key Features:**
- Offline-first with localStorage persistence
- Optional cloud sync via Supabase
- Interactive workout tracking with visual feedback
- 4 main lifts: Squat, Bench Press, Deadlift, Overhead Press
- 12 training cycles with progressive overload
- Real-time progress tracking

---

## Technology Stack

### Build & Frontend
- **Eleventy (11ty)** - Static site generator
- **Nunjucks** - Template engine
- **ES6 Modules** - Client-side JavaScript
- **CSS3** - Styling with transforms and animations

### Backend & Data
- **Supabase** - PostgreSQL database and authentication
- **localStorage** - Offline persistence
- **JWT** - Session management

### Testing
- **Jest** - Unit testing framework (259 passing tests)
- **jsdom** - DOM simulation for tests

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  (Eleventy Templates - .njk files in src/)              │
│  - Generates static HTML pages                          │
│  - Injects environment config and Supabase credentials  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                      │
│  (JavaScript Modules in src/js/)                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │     Auth     │  │    State     │  │   Workout    │ │
│  │   Manager    │  │    Store     │  │   Manager    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Session    │  │  Dashboard   │  │   Settings   │ │
│  │   Tracker    │  │   Manager    │  │   Manager    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     DATA LAYER                          │
│                                                          │
│  ┌──────────────┐              ┌──────────────┐        │
│  │ localStorage │              │   Supabase   │        │
│  │  (Offline)   │◄────────────►│   (Cloud)    │        │
│  └──────────────┘              └──────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## Core Modules

### 1. Authentication (`auth.js`)

**Purpose:** Manages user authentication and session handling

**Class:** `AuthManager`

**Responsibilities:**
- Check authentication status
- Handle sign in/out flows
- Redirect users based on auth state
- Dispatch auth-related events

**Key Methods:**
```javascript
init()                           // Initialize auth system
checkSession()                   // Verify current session
handleAuthenticatedUser()        // Process authenticated flow
handleUnauthenticatedUser()      // Process unauthenticated flow
setupAuthStateListener()         // Listen for auth changes
signOut()                        // Sign user out
```

**Events Dispatched:**
- `authManagerReady` - Auth check complete
- `userSignedIn` - User authenticated
- `userSignedOut` - User logged out
- `appInitialized` - App ready with user data

---

### 2. State Management

State management is handled by the **UnifiedStateStore** orchestrator and its specialized sub-managers.

#### 2.1 UnifiedStateStore (`simplified-state-store.js`)

**Purpose:** Orchestrates all state management operations

**Delegates to:**
- `CoreStateStore` - Pure state management
- `PersistenceManager` - Storage operations
- `SyncUIManager` - Sync button UI

**Key Methods:**
```javascript
updateState(updates)             // Update app state
subscribe(path, callback)        // Subscribe to state changes
getState(path)                   // Get current state value
getCycleSettings()               // Get current cycle/week
getSessionCompletion()           // Get workout completion data
```

**State Structure:**
```javascript
{
  trainingMaxes: { squat, bench, deadlift, ohp },
  cycleSettings: { cycle, week },
  accessories: { squat: [...], bench: [...], ... },
  sessionCompletion: {
    'squat_1_1': { mainSets: [], supplementalSets: [], accessories: [] },
    // ... more sessions
  },
  user: { id, email, ... },
  isLoading: false,
  lastDatabaseSync: timestamp,
  lastLocalChange: timestamp
}
```

#### 2.2 CoreStateStore (`core-state-store.js`)

**Purpose:** Pure state management with reactive subscriptions

**Responsibilities:**
- Maintain application state
- Notify subscribers on changes
- Deep merge state updates
- Track state history

**Key Features:**
- Reactive subscription system
- Path-based state access (e.g., `'trainingMaxes'`, `'user'`)
- Automatic change detection
- Immediate callback on subscription

#### 2.3 PersistenceManager (`persistence-manager.js`)

**Purpose:** Handle all storage operations (localStorage + database)

**Responsibilities:**
- Save/load from localStorage
- Sync with Supabase database
- Handle data migration
- Manage offline/online states

**Key Methods:**
```javascript
saveToLocalStorage()             // Save state to localStorage
loadFromLocalStorage()           // Load state from localStorage
loadFromDatabase()               // Load all data from Supabase
saveSessionCompletionToDB()      // Save workout completion
saveCycleSettingsToDB()          // Save cycle/week progress
```

**Database Tables Used:**
- `training_maxes` - Training max history
- `cycle_progress` - Current cycle/week
- `workout_sessions` - Session completion data
- `user_settings` - User preferences and accessories

#### 2.4 SyncUIManager (`sync-ui-manager.js`)

**Purpose:** Manage manual cloud sync UI and operations

**Responsibilities:**
- Create "Sync to Cloud" button
- Update sync status indicators
- Execute manual sync operations
- Visual feedback for sync state

**Sync States:**
- `Ready` - No pending changes
- `Syncing...` - Upload in progress
- `Synced ✓` - Successfully synced
- `Error` - Sync failed

---

### 3. Workout Management (`workout-manager.js`)

**Purpose:** Calculate and display workout weights

**Class:** `WorkoutManager`

**Responsibilities:**
- Calculate weight percentages based on training maxes
- Display main sets (3 sets per week)
- Display supplemental sets (5 sets FSL - First Set Last)
- Handle cycle/week navigation
- Keyboard shortcuts

**Key Methods:**
```javascript
init()                           // Initialize on page load
updateWorkout()                  // Recalculate and display weights
renderMainSets()                 // Display week's main sets
renderSupplementalSets()         // Display FSL supplemental sets
handleCycleChange()              // Navigate between cycles/weeks
setupKeyboardShortcuts()         // Arrow keys, 'h' for home
```

**Weight Calculation:**
```javascript
// Formula: Round to nearest 0.5 lbs
weight = Math.round(trainingMax * percentage / 100 * 2) / 2
```

---

### 4. Session Tracking

Session tracking is handled by the **SessionTracker** orchestrator and its specialized sub-managers.

#### 4.1 SessionTracker (`session-tracker.js`)

**Purpose:** Orchestrates interactive workout completion tracking

**Delegates to:**
- `SessionVisualManager` - Visual feedback
- `SessionProgressTracker` - Progress calculation
- `SessionStateManager` - State updates
- `SessionEventHandler` - User interactions

**Lifecycle:**
```javascript
constructor()                    // Create sub-managers
init()                           // Setup event listeners
waitForStateStore()              // Wait for data to load
setupEventListeners()            // Attach pointer events
```

#### 4.2 SessionVisualManager (`session-visual-manager.js`)

**Purpose:** Handle all visual feedback for workout tracking

**Responsibilities:**
- Apply completion styling (green background, strikethrough)
- Show/hide loading states
- Animate state changes
- Grey out during database operations

**Visual States:**
- **Completed:** Green background (#d4edda), strikethrough text, border
- **Loading:** Grey background, reduced opacity
- **Active:** Highlight on interaction

#### 4.3 SessionProgressTracker (`session-progress-tracker.js`)

**Purpose:** Calculate and display workout progress

**Responsibilities:**
- Count completed exercises
- Calculate completion percentage
- Update progress text ("5/13 exercises completed (38%)")
- Update progress bar width

**Key Methods:**
```javascript
getProgressStats(lift)           // Calculate stats
updateProgressText(lift, stats)  // Update text display
updateProgressBar(lift, stats)   // Update progress bar
updateProgress(lift)             // Update all progress UI
```

#### 4.4 SessionStateManager (`session-state-manager.js`)

**Purpose:** Manage session completion state

**Responsibilities:**
- Toggle exercise completion
- Update StateStore
- Debounced database saves
- Handle state persistence

**Key Features:**
- **Debounced saves:** 1 second delay to batch updates
- **Optimistic updates:** UI updates immediately
- **Error handling:** Graceful degradation if save fails

#### 4.5 SessionEventHandler (`session-event-handler.js`)

**Purpose:** Handle all user interactions for session tracking

**Responsibilities:**
- Pointer event handling (touch + mouse)
- Double-click prevention
- Haptic feedback (mobile)
- Loading state blocking
- Pending actions queue

**Interaction Flow:**
```
User taps exercise
  ↓
Check if loading (block if true)
  ↓
Prevent double-clicks (500ms)
  ↓
Trigger haptic feedback (30ms vibration)
  ↓
Route to correct handler (main/supplemental/accessory/tab)
  ↓
Update state and visual feedback
```

---

### 5. Dashboard Management (`dashboard.js`)

**Purpose:** Manage tabbed interface showing all lifts

**Class:** `DashboardManager`

**Responsibilities:**
- Tab switching (Squat, Bench, Deadlift, OHP)
- Load workout data for each lift
- Coordinate WorkoutManager and SessionTracker
- URL hash navigation

**Key Methods:**
```javascript
init()                           // Initialize dashboard
switchTab(liftType)              // Switch between lifts
showWorkout(lift)                // Display lift workout
updateHash(lift)                 // Update URL hash
```

---

### 6. Settings Management (`settings.js`)

**Purpose:** Manage training max inputs and accessories

**Class:** `SettingsManager`

**Responsibilities:**
- Render training max input forms
- Save training maxes to database
- Manage accessory exercises
- Handle form validation

**Key Methods:**
```javascript
init()                           // Initialize settings page
setupTrainingMaxForm()           // Create input form
saveTrainingMaxes()              // Save to database
updateAccessories()              // Update accessory list
```

---

### 7. Shared Utilities (`shared-init.js`)

**Purpose:** Common utilities used across modules

**Exports:**
- `ModuleInitializer` - Base class for module initialization
- `DebugLogger` - Consistent logging
- `debounce()` - Debounce utility function
- `waitForStateStore()` - Helper to wait for StateStore

---

### 8. Constants

#### 8.1 DOM Selectors (`dom-selectors.js`)

**Purpose:** Centralized DOM selectors and CSS classes

**Exports:**
```javascript
SELECTORS     // CSS selectors (.set-row, .accessory-item, etc.)
CLASSES       // CSS class names (completed, active, etc.)
IDS           // Element IDs with helper functions
DATA_ATTRS    // Data attributes
LIFTS         // Lift arrays (ALL, MAIN, ACCESSORY)
```

**Example Usage:**
```javascript
import { SELECTORS, IDS, LIFTS } from './dom-selectors.js';

document.querySelector(SELECTORS.SET_ROW);
document.getElementById(IDS.progress('squat'));
LIFTS.ALL.forEach(lift => { ... });
```

#### 8.2 Configuration (`config.js`)

**Purpose:** Centralized configuration and magic numbers

**Exports:**
```javascript
TIMING        // Debounce delays, timeouts
COLORS        // UI colors (completed, sync states)
UI_TEXT       // User-facing text
CYCLE_CONFIGS // 12 cycle configurations
WEEK_CONFIGS  // Week set/rep schemes
DEFAULT_ACCESSORIES
PROGRESSION   // Weight increments per cycle
ROUTES        // Page routes
STORAGE_KEYS  // localStorage keys
DB_TABLES     // Supabase table names
ERROR_CODES   // Error handling codes
```

---

## Class Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      AuthManager                            │
│  - Checks authentication status                             │
│  - Dispatches auth events                                   │
└────────────────────┬────────────────────────────────────────┘
                     │ Emits events
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   UnifiedStateStore                         │
│  (Orchestrator Pattern)                                     │
│                                                              │
│  ┌──────────────────┐  ┌───────────────────┐              │
│  │ CoreStateStore   │  │ PersistenceManager│              │
│  │ - State tree     │  │ - localStorage    │              │
│  │ - Subscriptions  │  │ - Supabase sync   │              │
│  └──────────────────┘  └───────────────────┘              │
│                                                              │
│  ┌──────────────────┐                                       │
│  │  SyncUIManager   │                                       │
│  │  - Sync button   │                                       │
│  │  - Sync status   │                                       │
│  └──────────────────┘                                       │
└───────────┬──────────────────────────────────────────────┬──┘
            │ Subscribes                                   │
            ↓                                             ↓
┌─────────────────────────┐              ┌──────────────────────────┐
│    WorkoutManager       │              │     SessionTracker        │
│  - Calculates weights   │              │  (Orchestrator Pattern)   │
│  - Displays sets        │              │                           │
│  - Keyboard nav         │              │  ┌──────────────────────┐│
└─────────────────────────┘              │  │ SessionVisualManager ││
                                          │  │ - Visual feedback    ││
┌─────────────────────────┐              │  └──────────────────────┘│
│    DashboardManager     │              │                           │
│  - Tab switching        │              │  ┌──────────────────────┐│
│  - Coordinates workout  │              │  │SessionProgressTracker││
│    and session tracking │              │  │ - Progress calc      ││
└─────────────────────────┘              │  └──────────────────────┘│
                                          │                           │
┌─────────────────────────┐              │  ┌──────────────────────┐│
│    SettingsManager      │              │  │ SessionStateManager  ││
│  - Training max forms   │              │  │ - State updates      ││
│  - Accessory management │              │  │ - Debounced saves    ││
└─────────────────────────┘              │  └──────────────────────┘│
                                          │                           │
                                          │  ┌──────────────────────┐│
                                          │  │ SessionEventHandler  ││
                                          │  │ - User interactions  ││
                                          │  │ - Event routing      ││
                                          │  └──────────────────────┘│
                                          └──────────────────────────┘
```

---

## Data Flow

### 1. Initial Page Load

```
Page Load
  ↓
Eleventy renders static HTML
  ↓
Browser loads ES6 modules
  ↓
1. supabase.js initializes
  ↓
2. auth.js checks session
  ├─ Authenticated → Load app
  └─ Not authenticated → Redirect to login
  ↓
3. simplified-state-store.js initializes
  ├─ Load from localStorage (instant)
  └─ Load from database (async)
  ↓
4. workout-manager.js initializes
  └─ Subscribe to trainingMaxes changes
  ↓
5. session-tracker.js initializes
  └─ Wait for stateStoreFullyReady event
  ↓
App Ready
```

### 2. User Updates Training Max

```
User enters new squat max (315 lbs)
  ↓
SettingsManager.saveTrainingMaxes()
  ↓
stateStore.updateState({ trainingMaxes: { squat: 315 } })
  ↓
CoreStateStore updates state
  ↓
PersistenceManager.saveToLocalStorage()
  ↓
CoreStateStore notifies subscribers
  ↓
WorkoutManager receives update
  ↓
WorkoutManager.updateWorkout()
  ↓
Recalculates all weights
  ↓
Renders new sets with updated weights
  ↓
User clicks "Sync to Cloud"
  ↓
SyncUIManager.performSync()
  ↓
PersistenceManager saves to Supabase
  ↓
SyncUIManager shows "Synced ✓"
```

### 3. User Completes Exercise

```
User taps main set 2
  ↓
SessionEventHandler.handlePointerDown()
  ├─ Check if loading (block if true)
  ├─ Prevent double-click
  └─ Trigger haptic feedback
  ↓
SessionEventHandler.handleSetClick()
  ↓
SessionStateManager.toggleSet('squat', 'mainSets', 1)
  ↓
Get current completion state
  ↓
Toggle index 1 (true ↔ false)
  ↓
stateStore.updateSessionCompletion('squat', updatedState)
  ↓
CoreStateStore updates state
  ↓
PersistenceManager.saveToLocalStorage()
  ↓
SessionStateManager.save() [debounced 1s]
  ↓
SessionVisualManager.toggleSetCompletion()
  ├─ Apply green background
  ├─ Add strikethrough
  └─ Animate border
  ↓
SessionProgressTracker.updateProgress()
  ├─ Calculate: 6/13 exercises (46%)
  ├─ Update progress text
  └─ Update progress bar width
  ↓
[After 1s debounce]
  ↓
PersistenceManager.saveSessionCompletionToDB()
  ↓
Save to Supabase workout_sessions table
```

### 4. App Resume (Mobile)

```
User switches to another app
  ↓
Page visibility changes (hidden)
  ↓
User returns to app
  ↓
Page visibility changes (visible)
  ↓
UnifiedStateStore detects resume
  ↓
Dispatch 'stateStoreReloading' event
  ↓
PersistenceManager.loadFromDatabase()
  ↓
Fetch latest data from Supabase
  ↓
CoreStateStore updates state
  ↓
Notify all subscribers
  ↓
WorkoutManager updates display
  ↓
SessionTracker restores completion states
  ↓
Dispatch 'stateStoreFullyReady' event
  ↓
App refreshed with latest data
```

---

## Initialization Sequence

### Authenticated Page Load (app.njk, squat.njk, etc.)

```javascript
// 1. Supabase client
import { getSupabase } from './supabase.js';
await getSupabase(); // Waits for window.SUPABASE_CONFIG

// 2. Auth check
import { authManager } from './auth.js';
await authManager.init();
// → Checks session
// → Redirects if not authenticated
// → Dispatches 'authManagerReady'

// 3. State store
import './simplified-state-store.js';
// → Creates global window.stateStore
// → Loads from localStorage immediately
// → Loads from database (async)
// → Dispatches 'stateStoreFullyReady'

// 4. Workout manager (if lift page)
import { WorkoutManager } from './workout-manager.js';
const workoutManager = new WorkoutManager('squat');
workoutManager.init();
// → Subscribes to state changes
// → Renders initial workout

// 5. Session tracker (if lift page)
import { SessionTracker } from './session-tracker.js';
const sessionTracker = new SessionTracker();
// → Waits for stateStoreFullyReady
// → Sets up event listeners
// → Restores visual states
```

### Dashboard Page Load (app.njk with tabs)

```javascript
// 1-3. Same as above (Supabase, Auth, StateStore)

// 4. Dashboard manager
import { DashboardManager } from './dashboard.js';
const dashboardManager = new DashboardManager();
dashboardManager.init();
// → Creates WorkoutManager instances for each lift
// → Creates SessionTracker instance
// → Sets up tab switching
// → Loads initial tab from URL hash
```

---

## Event System

The app uses a custom event-driven architecture for cross-module communication.

### Auth Events

| Event | When | Detail | Listeners |
|-------|------|--------|-----------|
| `authManagerReady` | Auth check complete | `{ hasSession, user }` | StateStore |
| `userSignedIn` | User signs in | `{ user }` | StateStore |
| `userSignedOut` | User signs out | - | StateStore |
| `appInitialized` | App ready with data | `{ user }` | All modules |

### State Events

| Event | When | Detail | Listeners |
|-------|------|--------|-----------|
| `stateStoreFullyReady` | Database load complete | - | SessionTracker |
| `stateStoreReloading` | App resumed, reloading | - | UI modules |

### Usage Pattern

```javascript
// Dispatch event
window.dispatchEvent(new CustomEvent('eventName', {
  detail: { data: 'value' }
}));

// Listen for event
window.addEventListener('eventName', (e) => {
  console.log(e.detail.data);
});
```

### State Subscriptions

In addition to events, the StateStore uses a subscription system:

```javascript
// Subscribe to changes
const unsubscribe = window.stateStore.subscribe('trainingMaxes', (newValue, oldValue) => {
  console.log('Training maxes changed:', newValue);
  updateDisplay(newValue);
});

// Unsubscribe when done
unsubscribe();
```

**Available subscription paths:**
- `'trainingMaxes'` - Training max changes
- `'cycleSettings'` - Cycle/week changes
- `'accessories'` - Accessory list changes
- `'sessionCompletion'` - Workout completion changes
- `'user'` - User authentication changes

---

## 531 Program Logic

### 12-Cycle Year Structure

The program follows Jim Wendler's 531 methodology with 12 cycles:

| Cycle | Type | Focus | Supplemental % |
|-------|------|-------|----------------|
| 1 | Volume | Higher reps, lower intensity | 45-70% |
| 2 | Intensity | Lower reps, higher intensity | 75-100% |
| 3 | Volume | Higher reps, lower intensity | 45-70% |
| 4 | Intensity | Lower reps, higher intensity | 75-100% |
| ... | Alternating pattern continues | | |
| 11 | Volume | Higher reps, lower intensity | 45-70% |
| 12 | Max Test | Test new maxes | N/A |

### Week Structure (3 weeks per cycle)

Each cycle has 3 weeks with different percentages following the standard 531 progression:

**Week 1:**
- Set 1: 65% × 5 reps
- Set 2: 75% × 5 reps
- Set 3: 85% × 5+ reps ⭐ **AMRAP** (As Many Reps As Possible)

**Week 2:**
- Set 1: 70% × 3 reps
- Set 2: 80% × 3 reps
- Set 3: 90% × 3+ reps ⭐ **AMRAP**

**Week 3:**
- Set 1: 75% × 5 reps
- Set 2: 85% × 3 reps
- Set 3: 95% × 1+ reps ⭐ **AMRAP**

**AMRAP sets** are indicated with a "+" sign and an orange badge in the UI. These are critical for gauging progress and determining if your training max needs adjustment.

### Rep Scheme Options

The app supports two rep scheme methodologies, configurable in **Settings → Rep Scheme**:

#### Standard 531 (5/3/1) - Default

Traditional 531 with AMRAP sets on the final set each week:
- Week 1: 5/5/5+ reps
- Week 2: 3/3/3+ reps
- Week 3: 5/3/1+ reps

This is the classic Jim Wendler approach where you push the final AMRAP set to gauge progress and autoregulate intensity.

#### 5s PRO (5s Progression)

Straight sets of 5 reps at prescribed percentages with no AMRAP sets:
- Week 1: 5/5/5 reps (65%, 75%, 85%)
- Week 2: 5/5/5 reps (70%, 80%, 90%)
- Week 3: 5/5/5 reps (75%, 85%, 95%)

**When to use 5s PRO:**
- When doing high-volume supplemental or accessory work
- To reduce CNS fatigue and manage recovery
- For template variations that don't require AMRAP testing
- During deload or recovery phases

```javascript
// From config.js
export const REP_SCHEME_PRESETS = {
  standard: {
    name: 'Standard 531 (5/3/1)',
    description: 'Traditional 531 with AMRAP sets on the final set each week',
    configs: WEEK_CONFIGS_STANDARD,
  },
  fives_pro: {
    name: '5s PRO',
    description: 'Straight sets of 5 reps at prescribed percentages (no AMRAP)',
    configs: WEEK_CONFIGS_5S_PRO,
  },
};
```

**Implementation:** The workout manager subscribes to `repScheme` state changes and dynamically swaps the week configurations when the user changes their selection. UI updates immediately to show/hide AMRAP indicators.

### Supplemental Work (FSL - First Set Last)

After main sets, perform 5 sets using the first set percentage:

**Volume Cycles (1, 3, 5, 7, 9, 11):**
- 5 sets at lower percentages (45-70%)
- Higher rep ranges (8-12 reps)

**Intensity Cycles (2, 4, 6, 8, 10):**
- 5 sets at higher percentages (75-100%)
- Lower rep ranges (3-5 reps)

### Training Max Progression

After each cycle, training maxes increase based on the user's selected progression rate:

**Progression Presets** (configurable in settings):

| Preset | Main Lifts | OHP | Description |
|--------|-----------|-----|-------------|
| **Conservative** (default) | +2.5 kg | +1.25 kg | Recommended for beginners and injury prevention |
| **Standard** | +5.0 kg | +2.5 kg | Original 531 x 365 program |
| **Aggressive** | +10.0 kg | +5.0 kg | Advanced lifters only |

```javascript
// From config.js
export const PROGRESSION_PRESETS = {
  conservative: { main: 2.5, ohp: 1.25 },
  standard: { main: 5.0, ohp: 2.5 },      // Original program
  aggressive: { main: 10.0, ohp: 5.0 },
};
```

Users can select their preferred progression rate in the **Settings** page under "Training Max Progression Rate."

### Weight Calculation

All weights are rounded to nearest 0.5 kg:

```javascript
function calculateWeight(trainingMax, percentage) {
  return Math.round(trainingMax * percentage / 100 * 2) / 2;
}

// Example:
// Training Max: 140 kg
// Percentage: 85%
// Calculation: 140 * 0.85 = 119
// Rounded: Math.round(119 * 2) / 2 = Math.round(238) / 2 = 238 / 2 = 119 kg
```

### Accessory Exercises

Each lift includes accessory work:

**Default accessories** (from `config.js`):
```javascript
{
  squat: ['Leg Press 3x12', 'Leg Curls 3x12', 'Abs 3x15'],
  bench: ['Dumbbell Bench 3x12', 'Tricep Extensions 3x12', 'Face Pulls 3x15'],
  deadlift: ['Romanian Deadlifts 3x12', 'Lat Pulldowns 3x12', 'Abs 3x15'],
  ohp: ['Lateral Raises 3x15', 'Rear Delt Flyes 3x15', 'Barbell Curls 3x12']
}
```

---

## Key Design Patterns

### 1. Orchestrator Pattern

Large classes delegate to specialized sub-managers:

```javascript
class UnifiedStateStore {
  constructor() {
    this.coreStore = new CoreStateStore();
    this.persistence = new PersistenceManager(this.coreStore);
    this.syncUI = new SyncUIManager(this.coreStore, this.persistence);
  }

  // Delegate methods to appropriate manager
  updateState(updates) {
    const shouldPersist = this.coreStore.updateState(updates);
    if (shouldPersist) {
      this.persistence.saveToLocalStorage();
    }
    this.syncUI.updateSyncUI();
  }
}
```

**Benefits:**
- Single Responsibility Principle
- Easier testing (test each manager independently)
- Better code organization

### 2. Observer Pattern (Subscriptions)

State changes automatically notify subscribers:

```javascript
class CoreStateStore {
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);
    callback(this.getState(path), this.getState(path));
    return () => this.listeners.get(path)?.delete(callback);
  }

  notifyListeners(path, newValue, oldValue) {
    this.listeners.get(path)?.forEach(callback => {
      callback(newValue, oldValue);
    });
  }
}
```

**Benefits:**
- Decoupled components
- Automatic UI updates
- Easy to add new listeners

### 3. Dependency Injection

Managers receive dependencies through constructors:

```javascript
class PersistenceManager {
  constructor(coreStore) {
    this.coreStore = coreStore;  // Injected dependency
  }
}
```

**Benefits:**
- Easier testing (mock dependencies)
- Loose coupling
- Clear dependencies

### 4. Debouncing

Prevent excessive saves/updates:

```javascript
this.save = debounce(async (liftType) => {
  await saveToDatabase(liftType);
}, 1000); // Wait 1 second before saving
```

**Benefits:**
- Reduced database calls
- Better performance
- Improved UX (no lag)

### 5. Offline-First

Always save locally first, sync to cloud manually:

```javascript
updateState(updates) {
  // 1. Update in-memory state
  this.coreStore.updateState(updates);

  // 2. Save to localStorage immediately
  this.persistence.saveToLocalStorage();

  // 3. Cloud sync is manual (user clicks "Sync to Cloud")
}
```

**Benefits:**
- Works without internet
- Fast updates
- No sync conflicts

---

## Testing Strategy

### Test Coverage

- **259 passing tests** across 11 test suites
- **3 skipped tests** (intentionally disabled)
- **100% coverage** of core functionality

### Test Files

1. `state-store.test.js` - State management (30 tests)
2. `workout-manager.test.js` - Workout calculations (30 tests)
3. `session-tracker.test.js` - Session tracking (16 tests)
4. `auth-simple.test.js` - Authentication flows
5. `supabase-simple.test.js` - Database operations
6. `dashboard.test.js` - Dashboard interactions
7. `settings.test.js` - Settings management
8. `mobile.test.js` - Mobile-specific features
9. `edge-cases.test.js` - Error handling
10. `data-integrity.test.js` - Data validation
11. `shared-init.test.js` - Utility functions

### Testing Approach

**Unit Tests:** Test individual classes and methods
**Integration Tests:** Test class interactions
**Mock Strategy:** Mock Supabase, localStorage, DOM

---

## Performance Optimizations

### 1. Debounced Saves
- Session saves debounced to 1 second
- Prevents rapid-fire database writes
- Batches multiple changes

### 2. Optimistic UI Updates
- UI updates immediately
- Database saves happen async
- Graceful error handling

### 3. Lazy Loading
- Load data only when needed
- Dashboard loads tabs on demand
- Progressive enhancement

### 4. Event Delegation
- Single event listener for all sets
- Uses `closest()` to find target
- Better performance with many elements

### 5. Visibility-Based Reloading
- Only reload when app becomes visible
- Prevents background network calls
- Saves battery on mobile

---

## File Structure Reference

```
src/
├── js/
│   ├── auth.js                      # Authentication manager
│   ├── simplified-state-store.js    # State orchestrator
│   ├── core-state-store.js          # Pure state management
│   ├── persistence-manager.js       # Storage operations
│   ├── sync-ui-manager.js           # Sync button UI
│   ├── session-tracker.js           # Session tracking orchestrator
│   ├── session-visual-manager.js    # Visual feedback
│   ├── session-progress-tracker.js  # Progress calculation
│   ├── session-state-manager.js     # State updates
│   ├── session-event-handler.js     # User interactions
│   ├── workout-manager.js           # Workout calculations
│   ├── dashboard.js                 # Dashboard tabs
│   ├── settings.js                  # Settings page
│   ├── shared-init.js               # Utilities
│   ├── dom-selectors.js             # DOM constants
│   ├── config.js                    # Configuration
│   └── supabase.js                  # Supabase client
│
├── _layouts/
│   ├── app-base.njk                 # Authenticated layout
│   └── login-base.njk               # Public layout
│
├── _includes/
│   ├── lift-workout.njk             # Workout display component
│   ├── input-form.njk               # Training max form
│   ├── navbar-app.njk               # Authenticated navbar
│   └── navbar.njk                   # Public navbar
│
├── _data/
│   └── cycles.json                  # 12 cycle configurations
│
├── squat.njk                        # Squat workout page
├── bench.njk                        # Bench workout page
├── deadlift.njk                     # Deadlift workout page
├── ohp.njk                          # OHP workout page
├── app.njk                          # Dashboard (all lifts)
├── settings.njk                     # Settings page
└── login.njk                        # Login page
```

---

## Common Tasks

### Add a new lift
1. Update `LIFTS.ALL` in `dom-selectors.js`
2. Add default accessories in `config.js`
3. Create new `.njk` page (copy from `squat.njk`)
4. Update dashboard tabs in `app.njk`

### Modify workout calculations
1. Edit `WorkoutManager` in `workout-manager.js`
2. Update cycle configs in `config.js` or `src/_data/cycles.json`
3. Run tests: `npm test`

### Change sync behavior
1. Edit `SyncUIManager` for UI changes
2. Edit `PersistenceManager` for sync logic
3. Test offline/online scenarios

### Add new state property
1. Add to `CoreStateStore` default state
2. Add subscription path if needed
3. Update `saveToLocalStorage()` and `loadFromDatabase()`
4. Write tests

---

## Troubleshooting

### State not updating
- Check if `updateState()` is being called
- Verify subscription path is correct
- Check browser console for errors
- Confirm localStorage isn't full

### Database not syncing
- Verify Supabase credentials in `.env`
- Check network tab in dev tools
- Confirm user is authenticated
- Check database RLS policies

### Visual states not showing
- Ensure `stateStoreFullyReady` event fired
- Check if CSS classes are applied
- Verify element selectors in `dom-selectors.js`
- Test with browser dev tools

### Tests failing
- Clear Jest cache: `npm test -- --clearCache`
- Check test setup in `__tests__/setup.js`
- Verify mocks are up to date
- Run single test file for debugging

---

## Further Reading

- [CLAUDE.md](./CLAUDE.md) - Detailed project documentation
- [README.md](./README.md) - Project overview and setup
- [Eleventy Documentation](https://www.11ty.dev/docs/)
- [531 Program by Jim Wendler](https://www.jimwendler.com/blogs/jimwendler-com/101065094-5-3-1-for-a-beginner)
