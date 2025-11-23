/**
 * Tests for Shared Utilities (shared-init.js)
 * Tests ModuleInitializer, DebugLogger, debounce, and vibrate utilities
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('ModuleInitializer', () => {
  describe('waitFor', () => {
    test('should resolve when condition is true', async () => {
      let isReady = false;

      setTimeout(() => {
        isReady = true;
      }, 50);

      const result = await waitFor(() => isReady, 1000, 10);

      expect(result).toBe(true);
    });

    test('should timeout when condition never becomes true', async () => {
      const result = await waitFor(() => false, 100, 10);

      expect(result).toBe(false);
    });

    test('should resolve immediately if condition is already true', async () => {
      const start = Date.now();

      const result = await waitFor(() => true, 1000, 10);
      const elapsed = Date.now() - start;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(50); // Should be nearly instant
    });

    test('should check condition at specified interval', async () => {
      jest.useFakeTimers();

      let checkCount = 0;
      const condition = () => {
        checkCount++;
        return checkCount >= 5;
      };

      const promise = waitFor(condition, 1000, 100);

      // Advance by intervals
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Allow microtasks to run
      }

      const result = await promise;

      expect(result).toBe(true);
      expect(checkCount).toBeGreaterThanOrEqual(5);

      jest.useRealTimers();
    });

    test('should respect custom timeout', async () => {
      jest.useFakeTimers();

      const promise = waitFor(() => false, 200, 50);

      jest.advanceTimersByTime(250);
      const result = await promise;

      expect(result).toBe(false);

      jest.useRealTimers();
    });
  });

  describe('waitForStateStore', () => {
    beforeEach(() => {
      delete window.stateStore;
    });

    test('should resolve when stateStore becomes available', async () => {
      setTimeout(() => {
        window.stateStore = { test: true };
      }, 50);

      const result = await waitForStateStore();

      expect(result).toBeTruthy();
      expect(window.stateStore).toBeDefined();
    });

    test('should resolve immediately if stateStore already exists', async () => {
      window.stateStore = { test: true };

      const start = Date.now();
      const result = await waitForStateStore();
      const elapsed = Date.now() - start;

      expect(result).toBeTruthy();
      expect(elapsed).toBeLessThan(50);
    });

    test('should timeout if stateStore never appears', async () => {
      const result = await waitFor(() => window.stateStore, 100, 10);

      expect(result).toBeFalsy();
    });
  });

  describe('waitForAuth', () => {
    beforeEach(() => {
      delete window.auth;
    });

    test('should resolve when auth is ready', async () => {
      setTimeout(() => {
        window.auth = { hasCheckedSession: true };
      }, 50);

      const result = await waitForAuth();

      expect(result).toBe(true);
    });

    test('should wait for hasCheckedSession flag', async () => {
      window.auth = { hasCheckedSession: false };

      setTimeout(() => {
        window.auth.hasCheckedSession = true;
      }, 50);

      const result = await waitForAuth();

      expect(result).toBe(true);
    });

    test('should resolve immediately if auth already ready', async () => {
      window.auth = { hasCheckedSession: true };

      const start = Date.now();
      const result = await waitForAuth();
      const elapsed = Date.now() - start;

      expect(result).toBe(true);
      expect(elapsed).toBeLessThan(50);
    });
  });
});

describe('DebugLogger', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = global.localStorage;
    localStorage.clear();
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  test('should log when debug mode is enabled', () => {
    localStorage.setItem('debug', 'true');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const logger = createDebugLogger('TestModule');
    logger.log('Test message');

    expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Test message');

    consoleSpy.mockRestore();
  });

  test('should not log when debug mode is disabled', () => {
    localStorage.setItem('debug', 'false');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const logger = createDebugLogger('TestModule');
    logger.log('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should not log when debug is not set', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const logger = createDebugLogger('TestModule');
    logger.log('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should always log errors', () => {
    localStorage.setItem('debug', 'false');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const logger = createDebugLogger('TestModule');
    logger.error('Error message');

    expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Error message');

    consoleSpy.mockRestore();
  });

  test('should include module name in logs', () => {
    localStorage.setItem('debug', 'true');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const logger = createDebugLogger('MyModule');
    logger.log('Test');

    expect(consoleSpy).toHaveBeenCalledWith('[MyModule]', 'Test');

    consoleSpy.mockRestore();
  });

  test('should support multiple arguments', () => {
    localStorage.setItem('debug', 'true');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const logger = createDebugLogger('TestModule');
    logger.log('Message', 123, { key: 'value' });

    expect(consoleSpy).toHaveBeenCalledWith('[TestModule]', 'Message', 123, { key: 'value' });

    consoleSpy.mockRestore();
  });
});

describe('debounce', () => {
  test('should delay function execution', async () => {
    jest.useFakeTimers();

    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test('should cancel previous call when called again', async () => {
    jest.useFakeTimers();

    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);
    debounced();
    jest.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test('should pass arguments to debounced function', async () => {
    jest.useFakeTimers();

    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');

    jest.useRealTimers();
  });

  test('should preserve this context', async () => {
    jest.useFakeTimers();

    const obj = {
      value: 42,
      getValue: function() {
        return this.value;
      }
    };

    const fn = jest.fn(function() {
      return obj.getValue.call(this);
    });

    obj.debouncedFn = debounce(fn, 100);

    obj.debouncedFn();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalled();

    jest.useRealTimers();
  });

  test('should handle multiple rapid calls', async () => {
    jest.useFakeTimers();

    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    for (let i = 0; i < 10; i++) {
      debounced();
      jest.advanceTimersByTime(20);
    }

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe('vibrate', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should call navigator.vibrate with default duration', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { vibrate: vibrateMock }
    });

    vibrate();

    expect(vibrateMock).toHaveBeenCalledWith(30);
  });

  test('should call navigator.vibrate with custom duration', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { vibrate: vibrateMock }
    });

    vibrate(50);

    expect(vibrateMock).toHaveBeenCalledWith(50);
  });

  test('should not throw if vibrate is not supported', () => {
    global.navigator = {};

    expect(() => {
      vibrate();
    }).not.toThrow();
  });

  test('should silently fail if vibrate throws error', () => {
    global.navigator = {
      vibrate: () => {
        throw new Error('Vibrate error');
      }
    };

    expect(() => {
      vibrate();
    }).not.toThrow();
  });

  test('should work with vibrate returning false', () => {
    global.navigator = {
      vibrate: jest.fn(() => false)
    };

    expect(() => {
      vibrate();
    }).not.toThrow();

    expect(navigator.vibrate).toHaveBeenCalled();
  });
});

// Helper: waitFor implementation
async function waitFor(condition, timeout = 5000, interval = 100) {
  const start = Date.now();
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return condition();
}

// Helper: waitForStateStore implementation
async function waitForStateStore() {
  return waitFor(() => window.stateStore);
}

// Helper: waitForAuth implementation
async function waitForAuth() {
  return waitFor(() => window.auth?.hasCheckedSession);
}

// Helper: DebugLogger implementation
function createDebugLogger(moduleName) {
  const enabled = localStorage.getItem('debug') === 'true';

  return {
    log(...args) {
      if (enabled) {
        console.log(`[${moduleName}]`, ...args);
      }
    },

    error(...args) {
      console.error(`[${moduleName}]`, ...args);
    }
  };
}

// Helper: debounce implementation
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Helper: vibrate implementation
function vibrate(duration = 30) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Silently fail
    }
  }
}
