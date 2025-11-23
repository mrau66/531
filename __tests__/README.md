# Unit Tests

This directory contains unit tests for the 531 x 365 Calculator application.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Test Files

- **state-store.test.js** - Tests for UnifiedStateStore
  - State management and updates
  - Subscription system
  - Training maxes CRUD operations
  - Cycle settings management
  - Session completion tracking
  - LocalStorage persistence
  - Helper methods

- **workout-manager.test.js** - Tests for WorkoutManager
  - Cycle configurations (12 cycles, Volume/Intensity alternation)
  - Week configurations (3 weeks per cycle)
  - Weight calculations and rounding
  - Progressive overload (TM increases)
  - Workout display updates
  - Page type detection

- **session-tracker.test.js** - Tests for SessionTracker
  - Set completion tracking (main and supplemental)
  - Accessory completion tracking
  - Visual feedback (styles, strikethrough)
  - Progress tracking and percentage calculation
  - State persistence and loading
  - Session summary aggregation
  - Loading states and grey-out
  - Pending actions queue

### Test Utilities

- **setup.js** - Global test setup
  - localStorage mock
  - Supabase client mock
  - navigator.vibrate mock
  - CustomEvent polyfill
  - beforeEach cleanup

- **test-utils.js** - Test helper functions
  - `createMockStateStore()` - Creates mock state store
  - `createWorkoutDOM()` - Creates test DOM elements
  - `createMockUser()` - Creates mock user object
  - `simulateClick()` - Simulates pointer events
  - `waitFor()` - Async wait helper

## Test Coverage

Current test coverage includes:

### UnifiedStateStore (simplified-state-store.js)
- ✅ State initialization and updates
- ✅ Subscription system
- ✅ Training maxes management
- ✅ Cycle settings management
- ✅ Accessories management
- ✅ Session completion tracking
- ✅ LocalStorage persistence
- ✅ Helper methods and utilities

### WorkoutManager (workout-manager.js)
- ✅ Cycle configurations (all 12 cycles)
- ✅ Week configurations (all 3 weeks)
- ✅ Weight calculation formulas
- ✅ Weight rounding (0.5 lb increments)
- ✅ Progressive overload calculations
- ✅ DOM update logic
- ✅ Page type detection

### SessionTracker (session-tracker.js)
- ✅ Interactive completion tracking
- ✅ Visual feedback and styling
- ✅ Progress calculation
- ✅ State persistence
- ✅ Session summaries
- ✅ Loading states
- ✅ Pending actions queue

## Writing New Tests

### Example Test Structure

```javascript
describe('FeatureName', () => {
  let mockStateStore;

  beforeEach(() => {
    // Setup
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
  });

  describe('Specific Functionality', () => {
    test('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Testing DOM Interactions

```javascript
test('should update DOM element', () => {
  // Create test DOM
  createWorkoutDOM('squat');

  // Get element
  const element = document.querySelector('#squat-main-sets .set-row');

  // Simulate interaction
  simulateClick(element);

  // Verify result
  expect(element.classList.contains('completed')).toBe(true);
});
```

### Testing State Changes

```javascript
test('should update state store', () => {
  const mockStore = createMockStateStore();
  window.stateStore = mockStore;

  // Make change
  mockStore.setTrainingMax('squat', 300);

  // Verify
  expect(mockStore.state.trainingMaxes.squat).toBe(300);
});
```

## Key Testing Patterns

### 1. Mock StateStore
Always use `createMockStateStore()` for consistent state management testing.

### 2. DOM Cleanup
The `beforeEach` in setup.js automatically clears DOM between tests.

### 3. Async Operations
Use `waitFor()` helper for async operations:
```javascript
await waitFor(100); // Wait 100ms
```

### 4. Event Simulation
Use `simulateClick()` for pointer events:
```javascript
simulateClick(element);
```

## Continuous Integration

These tests are designed to run in CI/CD pipelines. The test suite should:
- Complete in under 30 seconds
- Not require external dependencies (mocked)
- Provide clear error messages
- Have no flaky tests

## Coverage Goals

Target coverage levels:
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

View detailed coverage report after running:
```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view.

## Troubleshooting

### Tests Failing Locally

1. Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Check Node version (requires Node 20+):
```bash
node --version
```

3. Run with verbose output:
```bash
npm test -- --verbose
```

### Mock Issues

If mocks aren't working:
- Check that `setup.js` is being loaded
- Verify `beforeEach` is running
- Check console for initialization errors

### DOM Not Found

If DOM elements aren't found:
- Verify `createWorkoutDOM()` was called
- Check element selectors match actual DOM
- Ensure proper cleanup in `beforeEach`
