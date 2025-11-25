/**
 * Tests for Rest Timer
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { RestTimer } from '../src/js/rest-timer.js';

// Mock window and DOM
global.window = global.window || {};
global.document = global.document || {};

describe('RestTimer', () => {
  let timer;
  let mockStateStore;
  let vibrateMock;

  beforeEach(() => {
    // Clear the DOM
    document.body.innerHTML = '';

    // Mock navigator.vibrate
    vibrateMock = jest.fn();
    global.navigator = { vibrate: vibrateMock };

    // Mock stateStore
    mockStateStore = {
      getState: jest.fn(() => ({
        timerSettings: {
          autoStart: true,
          defaultDuration: 120,
          soundEnabled: true,
          vibrationEnabled: true
        }
      }))
    };
    window.stateStore = mockStateStore;

    // Create timer instance
    timer = new RestTimer();

    // Fast-forward timers by default
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (timer) {
      timer.stop();
    }
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should create timer UI overlay', () => {
      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay.classList.contains('rest-timer-overlay')).toBe(true);
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('should create all UI elements', () => {
      expect(document.querySelector('.rest-timer-container')).toBeTruthy();
      expect(document.querySelector('.rest-timer-display')).toBeTruthy();
      expect(document.querySelector('.rest-timer-time')).toBeTruthy();
      expect(document.querySelector('.rest-timer-controls')).toBeTruthy();
      expect(document.querySelector('.rest-timer-presets')).toBeTruthy();
    });

    test('should create preset buttons', () => {
      const presets = document.querySelectorAll('.rest-timer-preset');
      expect(presets.length).toBe(4);
      expect(presets[0].dataset.seconds).toBe('90');
      expect(presets[1].dataset.seconds).toBe('120');
      expect(presets[2].dataset.seconds).toBe('180');
      expect(presets[3].dataset.seconds).toBe('300');
    });

    test('should have pause and skip buttons', () => {
      expect(document.getElementById('rest-timer-pause')).toBeTruthy();
      expect(document.getElementById('rest-timer-skip')).toBeTruthy();
    });
  });

  describe('Starting Timer', () => {
    test('should start timer with given duration', () => {
      timer.start(120);

      expect(timer.isRunning).toBe(true);
      expect(timer.isPaused).toBe(false);
      expect(timer.remainingTime).toBe(120);
    });

    test('should show overlay when started', () => {
      timer.start(120);

      jest.advanceTimersByTime(20); // Wait for animation
      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay.classList.contains('visible')).toBe(true);
    });

    test('should update display with initial time', () => {
      timer.start(150); // 2:30

      const minutes = document.querySelector('.rest-timer-minutes');
      const seconds = document.querySelector('.rest-timer-seconds');

      expect(minutes.textContent).toBe('2');
      expect(seconds.textContent).toBe('30');
    });

    test('should start with default duration from settings', () => {
      mockStateStore.getState.mockReturnValue({
        timerSettings: { defaultDuration: 180 }
      });

      timer.startWithDefault();

      expect(timer.remainingTime).toBe(180);
    });
  });

  describe('Countdown Functionality', () => {
    test('should count down every second', () => {
      timer.start(10);

      expect(timer.remainingTime).toBe(10);

      jest.advanceTimersByTime(1000);
      expect(timer.remainingTime).toBe(9);

      jest.advanceTimersByTime(2000);
      expect(timer.remainingTime).toBe(7);
    });

    test('should update display during countdown', () => {
      timer.start(65); // 1:05

      const minutes = document.querySelector('.rest-timer-minutes');
      const seconds = document.querySelector('.rest-timer-seconds');

      expect(minutes.textContent).toBe('1');
      expect(seconds.textContent).toBe('05');

      jest.advanceTimersByTime(10000); // 10 seconds

      expect(minutes.textContent).toBe('0');
      expect(seconds.textContent).toBe('55');
    });

    test('should stop at zero', () => {
      timer.start(2);

      jest.advanceTimersByTime(3000);

      expect(timer.remainingTime).toBe(0);
      expect(timer.isRunning).toBe(false);
    });

    test('should pad seconds with leading zero', () => {
      timer.start(65); // 1:05

      const seconds = document.querySelector('.rest-timer-seconds');
      expect(seconds.textContent).toBe('05');

      jest.advanceTimersByTime(60000); // 1 minute
      expect(seconds.textContent).toBe('05');
    });
  });

  describe('Pause and Resume', () => {
    test('should pause countdown', () => {
      timer.start(10);

      jest.advanceTimersByTime(2000);
      expect(timer.remainingTime).toBe(8);

      timer.pause();
      expect(timer.isPaused).toBe(true);

      jest.advanceTimersByTime(5000);
      expect(timer.remainingTime).toBe(8); // Should not have counted down
    });

    test('should resume from paused time', () => {
      timer.start(10);

      jest.advanceTimersByTime(3000);
      expect(timer.remainingTime).toBe(7);

      timer.pause();
      jest.advanceTimersByTime(2000);

      timer.resume();
      expect(timer.isPaused).toBe(false);

      jest.advanceTimersByTime(1000);
      expect(timer.remainingTime).toBe(6);
    });

    test('should update pause button text when paused', () => {
      timer.start(10);
      const pauseBtn = document.getElementById('rest-timer-pause');

      timer.pause();
      expect(pauseBtn.querySelector('.pause-text').textContent).toBe('Resume');

      timer.resume();
      expect(pauseBtn.querySelector('.pause-text').textContent).toBe('Pause');
    });

    test('should add paused class to container', () => {
      timer.start(10);

      timer.pause();
      expect(timer.container.classList.contains('paused')).toBe(true);

      timer.resume();
      expect(timer.container.classList.contains('paused')).toBe(false);
    });
  });

  describe('Stop and Skip', () => {
    test('should stop timer', () => {
      timer.start(120);

      expect(timer.isRunning).toBe(true);

      timer.stop();

      expect(timer.isRunning).toBe(false);
      expect(timer.isPaused).toBe(false);
      expect(timer.intervalId).toBeNull();
    });

    test('should hide overlay when stopped via skip button', () => {
      timer.start(120);

      const skipBtn = document.getElementById('rest-timer-skip');
      skipBtn.click();

      expect(timer.isRunning).toBe(false);

      jest.advanceTimersByTime(350); // Wait for hide animation
      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Completion', () => {
    test('should trigger completion when reaching zero', () => {
      const completeSpy = jest.spyOn(timer, 'complete');

      timer.start(2);
      jest.advanceTimersByTime(2500);

      expect(completeSpy).toHaveBeenCalled();
    });

    test('should stop timer on completion', () => {
      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(timer.isRunning).toBe(false);
    });

    test('should add complete class on completion', () => {
      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(timer.container.classList.contains('complete')).toBe(true);
    });

    test('should auto-hide after completion', () => {
      timer.start(1);
      jest.advanceTimersByTime(1500);

      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay.classList.contains('visible')).toBe(true);

      jest.advanceTimersByTime(3500);
      expect(overlay.classList.contains('visible')).toBe(false);
    });
  });

  describe('Vibration Alert', () => {
    test('should vibrate on completion if enabled', () => {
      mockStateStore.getState.mockReturnValue({
        timerSettings: { vibrationEnabled: true }
      });

      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(vibrateMock).toHaveBeenCalledWith([200, 100, 200]);
    });

    test('should not vibrate if disabled', () => {
      mockStateStore.getState.mockReturnValue({
        timerSettings: { vibrationEnabled: false }
      });

      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(vibrateMock).not.toHaveBeenCalled();
    });

    test('should handle missing vibration API gracefully', () => {
      delete global.navigator.vibrate;

      timer.start(1);
      jest.advanceTimersByTime(1500);

      // Should not throw error
      expect(timer.isRunning).toBe(false);

      global.navigator.vibrate = vibrateMock;
    });
  });

  describe('Audio Alert', () => {
    test('should play beep on completion if enabled', () => {
      const playBeepSpy = jest.spyOn(timer, 'playBeep');

      mockStateStore.getState.mockReturnValue({
        timerSettings: { soundEnabled: true }
      });

      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(playBeepSpy).toHaveBeenCalled();
    });

    test('should not play beep if disabled', () => {
      const playBeepSpy = jest.spyOn(timer, 'playBeep');

      mockStateStore.getState.mockReturnValue({
        timerSettings: { soundEnabled: false }
      });

      timer.start(1);
      jest.advanceTimersByTime(1500);

      expect(playBeepSpy).not.toHaveBeenCalled();
    });
  });

  describe('Preset Buttons', () => {
    test('should start timer with preset duration when clicked', () => {
      const preset120 = document.querySelector('[data-seconds="120"]');

      preset120.click();

      expect(timer.isRunning).toBe(true);
      expect(timer.remainingTime).toBe(120);
    });

    test('should work for all preset durations', () => {
      const presets = [
        { seconds: 90, label: '1:30' },
        { seconds: 120, label: '2:00' },
        { seconds: 180, label: '3:00' },
        { seconds: 300, label: '5:00' }
      ];

      presets.forEach(preset => {
        timer.stop();
        const btn = document.querySelector(`[data-seconds="${preset.seconds}"]`);
        btn.click();

        expect(timer.remainingTime).toBe(preset.seconds);
      });
    });
  });

  describe('UI Interactions', () => {
    test('should close timer when close button clicked', () => {
      timer.start(120);

      const closeBtn = document.querySelector('.rest-timer-close');
      closeBtn.click();

      expect(timer.isRunning).toBe(false);

      jest.advanceTimersByTime(350);
      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('should hide timer when clicking overlay background', () => {
      timer.start(120);

      const overlay = document.getElementById('rest-timer-overlay');
      const event = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(event, 'target', { value: overlay });
      overlay.dispatchEvent(event);

      jest.advanceTimersByTime(350);
      expect(overlay.classList.contains('hidden')).toBe(true);
    });

    test('should not hide when clicking inside container', () => {
      timer.start(120);

      const container = document.querySelector('.rest-timer-container');
      container.click();

      const overlay = document.getElementById('rest-timer-overlay');
      expect(overlay.classList.contains('visible')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero duration', () => {
      timer.start(0);

      expect(timer.remainingTime).toBe(0);
      expect(timer.isRunning).toBe(false);
    });

    test('should handle negative duration', () => {
      timer.start(-5);

      jest.advanceTimersByTime(1000);
      expect(timer.remainingTime).toBeLessThanOrEqual(0);
    });

    test('should handle very long durations', () => {
      timer.start(3600); // 1 hour

      expect(timer.remainingTime).toBe(3600);

      const minutes = document.querySelector('.rest-timer-minutes');
      expect(minutes.textContent).toBe('60');
    });

    test('should handle rapid start/stop', () => {
      timer.start(10);
      timer.stop();
      timer.start(20);
      timer.stop();
      timer.start(30);

      expect(timer.remainingTime).toBe(30);
      expect(timer.isRunning).toBe(true);
    });

    test('should handle pause without start', () => {
      timer.pause();
      expect(timer.isPaused).toBe(false);
    });

    test('should handle resume without pause', () => {
      timer.start(10);
      timer.resume();

      expect(timer.isPaused).toBe(false);
      expect(timer.isRunning).toBe(true);
    });

    test('should handle missing stateStore', () => {
      delete window.stateStore;

      timer.start(120);

      expect(timer.isRunning).toBe(true);
      // Should use defaults
    });
  });

  describe('Progress Display', () => {
    test('should update SVG circle progress', () => {
      timer.start(120);

      const circle = document.querySelector('.rest-timer-circle-progress');
      const initialOffset = parseFloat(circle.style.strokeDashoffset) || 0;

      jest.advanceTimersByTime(60000); // Half time

      const midOffset = parseFloat(circle.style.strokeDashoffset);
      expect(midOffset).toBeGreaterThan(initialOffset);
    });

    test('should complete circle at 100%', () => {
      timer.start(10);

      jest.advanceTimersByTime(10500);

      const circle = document.querySelector('.rest-timer-circle-progress');
      // At completion, offset should be at maximum
      expect(circle.style.strokeDashoffset).toBeTruthy();
    });
  });

  describe('Time Formatting', () => {
    test('should format time correctly', () => {
      const testCases = [
        { seconds: 0, expectedMin: '0', expectedSec: '00' },
        { seconds: 5, expectedMin: '0', expectedSec: '05' },
        { seconds: 59, expectedMin: '0', expectedSec: '59' },
        { seconds: 60, expectedMin: '1', expectedSec: '00' },
        { seconds: 125, expectedMin: '2', expectedSec: '05' },
        { seconds: 600, expectedMin: '10', expectedSec: '00' }
      ];

      testCases.forEach(({ seconds, expectedMin, expectedSec }) => {
        timer.start(seconds);

        const minutes = document.querySelector('.rest-timer-minutes');
        const secs = document.querySelector('.rest-timer-seconds');

        expect(minutes.textContent).toBe(expectedMin);
        expect(secs.textContent).toBe(expectedSec);

        timer.stop();
      });
    });
  });
});
