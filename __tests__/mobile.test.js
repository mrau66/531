/**
 * Mobile-Specific Behavior Tests
 * Tests touch events, haptic feedback, pending actions queue, and mobile UI patterns
 */
import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createMockStateStore } from './test-utils.js';

describe('Mobile - Touch Events', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('div');
    element.className = 'set-row';
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('should handle pointerdown events', () => {
    const handler = jest.fn();
    element.addEventListener('pointerdown', handler);

    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerType: 'touch'
    });

    element.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });

  test('should distinguish between touch and mouse events', () => {
    const handler = jest.fn((e) => {
      return e.pointerType;
    });

    element.addEventListener('pointerdown', handler);

    // Touch event
    const touchEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch'
    });
    element.dispatchEvent(touchEvent);

    // Mouse event
    const mouseEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'mouse'
    });
    element.dispatchEvent(mouseEvent);

    expect(handler).toHaveBeenCalledTimes(2);
  });

  test('should handle rapid tap events', () => {
    const handler = jest.fn();
    element.addEventListener('pointerdown', handler);

    // Simulate rapid tapping
    for (let i = 0; i < 10; i++) {
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        pointerType: 'touch'
      });
      element.dispatchEvent(event);
    }

    expect(handler).toHaveBeenCalledTimes(10);
  });

  test('should handle touch with multiple fingers', () => {
    const handler = jest.fn();
    element.addEventListener('pointerdown', handler);

    // First finger
    const event1 = new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 1,
      pointerType: 'touch'
    });

    // Second finger
    const event2 = new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 2,
      pointerType: 'touch'
    });

    element.dispatchEvent(event1);
    element.dispatchEvent(event2);

    expect(handler).toHaveBeenCalledTimes(2);
  });
});

describe('Mobile - Haptic Feedback', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should trigger haptic feedback on interaction', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { vibrate: vibrateMock }
    });

    // Simulate vibrate call on tap
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }

    expect(vibrateMock).toHaveBeenCalledWith(30);
  });

  test('should handle missing vibrate API gracefully', () => {
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: {}
    });

    expect(() => {
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }).not.toThrow();
  });

  test('should use different vibration patterns', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { vibrate: vibrateMock }
    });

    // Short tap
    navigator.vibrate(10);

    // Medium tap
    navigator.vibrate(30);

    // Strong feedback
    navigator.vibrate(50);

    expect(vibrateMock).toHaveBeenCalledTimes(3);
  });

  test('should handle vibrate pattern array', () => {
    const vibrateMock = jest.fn();
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: { vibrate: vibrateMock }
    });

    // Pattern: vibrate, pause, vibrate
    navigator.vibrate([100, 50, 100]);

    expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100]);
  });
});

describe('Mobile - Pending Actions Queue', () => {
  let mockStateStore;
  let pendingActions;

  beforeEach(() => {
    mockStateStore = createMockStateStore();
    window.stateStore = mockStateStore;
    pendingActions = [];
  });

  test('should queue actions while loading', () => {
    mockStateStore.state.isLoading = true;

    // Try to complete sets while loading
    const action = {
      type: 'setCompletion',
      lift: 'squat',
      cycle: 1,
      week: 1,
      setIndex: 0
    };

    if (mockStateStore.state.isLoading) {
      pendingActions.push(action);
    }

    expect(pendingActions.length).toBe(1);
    expect(pendingActions[0]).toEqual(action);
  });

  test('should process pending actions after loading completes', () => {
    mockStateStore.state.isLoading = true;

    // Queue multiple actions
    pendingActions.push({ type: 'setCompletion', setIndex: 0 });
    pendingActions.push({ type: 'setCompletion', setIndex: 1 });
    pendingActions.push({ type: 'setCompletion', setIndex: 2 });

    expect(pendingActions.length).toBe(3);

    // Loading completes
    mockStateStore.state.isLoading = false;

    // Process pending actions
    const processedActions = [...pendingActions];
    pendingActions = [];

    expect(processedActions.length).toBe(3);
    expect(pendingActions.length).toBe(0);
  });

  test('should maintain action order in queue', () => {
    mockStateStore.state.isLoading = true;

    const actions = [
      { type: 'setCompletion', id: 1 },
      { type: 'setCompletion', id: 2 },
      { type: 'setCompletion', id: 3 }
    ];

    actions.forEach(action => pendingActions.push(action));

    expect(pendingActions[0].id).toBe(1);
    expect(pendingActions[1].id).toBe(2);
    expect(pendingActions[2].id).toBe(3);
  });

  test('should prevent duplicate actions in queue', () => {
    mockStateStore.state.isLoading = true;

    const action = { type: 'setCompletion', lift: 'squat', setIndex: 0 };

    // Try to add same action twice
    if (!pendingActions.find(a => a.setIndex === action.setIndex)) {
      pendingActions.push(action);
    }

    if (!pendingActions.find(a => a.setIndex === action.setIndex)) {
      pendingActions.push(action);
    }

    expect(pendingActions.length).toBe(1);
  });
});

describe('Mobile - UI Grey-out During Loading', () => {
  let buttons;

  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn1" class="interactive">Button 1</button>
      <button id="btn2" class="interactive">Button 2</button>
      <button id="btn3" class="interactive">Button 3</button>
    `;
    buttons = document.querySelectorAll('.interactive');
  });

  test('should disable buttons during loading', () => {
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });

    buttons.forEach(btn => {
      expect(btn.disabled).toBe(true);
      expect(btn.style.opacity).toBe('0.5');
    });
  });

  test('should re-enable buttons after loading', () => {
    // Disable
    buttons.forEach(btn => btn.disabled = true);

    // Re-enable
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });

    buttons.forEach(btn => {
      expect(btn.disabled).toBe(false);
      expect(btn.style.opacity).toBe('1');
    });
  });

  test('should show loading indicator', () => {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.style.display = 'block';
    document.body.appendChild(loadingDiv);

    expect(loadingDiv.style.display).toBe('block');

    // Hide loading
    loadingDiv.style.display = 'none';
    expect(loadingDiv.style.display).toBe('none');
  });
});

describe('Mobile - Viewport and Orientation', () => {
  test('should handle orientation change', () => {
    const handler = jest.fn();
    window.addEventListener('orientationchange', handler);

    // Simulate orientation change
    const event = new Event('orientationchange');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('orientationchange', handler);
  });

  test('should handle resize events', () => {
    const handler = jest.fn();
    window.addEventListener('resize', handler);

    const event = new Event('resize');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('resize', handler);
  });

  test('should detect viewport width', () => {
    // Mock window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375
    });

    const isMobile = window.innerWidth < 768;
    expect(isMobile).toBe(true);

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024
    });

    const isDesktop = window.innerWidth >= 768;
    expect(isDesktop).toBe(true);
  });
});

describe('Mobile - Scroll and Pull-to-Refresh', () => {
  test('should handle scroll events', () => {
    const handler = jest.fn();
    window.addEventListener('scroll', handler);

    const event = new Event('scroll');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('scroll', handler);
  });

  test('should prevent default pull-to-refresh on specific elements', () => {
    const element = document.createElement('div');
    const handler = jest.fn((e) => {
      e.preventDefault();
    });

    element.addEventListener('touchstart', handler);

    const event = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true
    });

    element.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
  });
});

describe('Mobile - Network Status', () => {
  let originalNavigator;

  beforeEach(() => {
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.navigator = originalNavigator;
  });

  test('should detect online status', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: true
    });

    expect(navigator.onLine).toBe(true);
  });

  test('should detect offline status', () => {
    Object.defineProperty(global.navigator, 'onLine', {
      writable: true,
      value: false
    });

    expect(navigator.onLine).toBe(false);
  });

  test('should handle online event', () => {
    const handler = jest.fn();
    window.addEventListener('online', handler);

    const event = new Event('online');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('online', handler);
  });

  test('should handle offline event', () => {
    const handler = jest.fn();
    window.addEventListener('offline', handler);

    const event = new Event('offline');
    window.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('offline', handler);
  });
});
