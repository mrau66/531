/**
 * Rest Timer
 *
 * Countdown timer between sets with audio/vibration alerts
 */

import { DebugLogger } from './shared-init.js';

export class RestTimer {
  constructor() {
    this.logger = new DebugLogger('RestTimer');
    this.isRunning = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.intervalId = null;
    this.startTime = null;
    this.pausedTime = 0;

    // Audio context for beep sound
    this.audioContext = null;

    this.createTimerUI();
    this.setupEventListeners();
  }

  createTimerUI() {
    // Create timer overlay
    const overlay = document.createElement('div');
    overlay.id = 'rest-timer-overlay';
    overlay.className = 'rest-timer-overlay hidden';
    overlay.innerHTML = `
      <div class="rest-timer-container">
        <div class="rest-timer-header">
          <h3>Rest Timer</h3>
          <button class="rest-timer-close" aria-label="Close timer">×</button>
        </div>

        <div class="rest-timer-display">
          <svg class="rest-timer-circle" viewBox="0 0 200 200">
            <circle class="rest-timer-circle-bg" cx="100" cy="100" r="90" />
            <circle class="rest-timer-circle-progress" cx="100" cy="100" r="90" />
          </svg>
          <div class="rest-timer-time">
            <span class="rest-timer-minutes">0</span>:<span class="rest-timer-seconds">00</span>
          </div>
        </div>

        <div class="rest-timer-controls">
          <button class="rest-timer-btn rest-timer-btn-secondary" id="rest-timer-pause">
            <span class="pause-icon">⏸</span>
            <span class="pause-text">Pause</span>
          </button>
          <button class="rest-timer-btn rest-timer-btn-primary" id="rest-timer-skip">
            <span>Skip Rest</span>
          </button>
        </div>

        <div class="rest-timer-presets">
          <button class="rest-timer-preset" data-seconds="90">1:30</button>
          <button class="rest-timer-preset" data-seconds="120">2:00</button>
          <button class="rest-timer-preset" data-seconds="180">3:00</button>
          <button class="rest-timer-preset" data-seconds="300">5:00</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
    this.container = overlay.querySelector('.rest-timer-container');
  }

  setupEventListeners() {
    // Close button
    this.overlay.querySelector('.rest-timer-close').addEventListener('click', () => {
      this.stop();
      this.hide();
    });

    // Pause/Resume button
    const pauseBtn = document.getElementById('rest-timer-pause');
    pauseBtn.addEventListener('click', () => {
      if (this.isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    });

    // Skip button
    document.getElementById('rest-timer-skip').addEventListener('click', () => {
      this.stop();
      this.hide();
    });

    // Preset buttons
    this.overlay.querySelectorAll('.rest-timer-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const seconds = parseInt(btn.dataset.seconds);
        this.start(seconds);
      });
    });

    // Click overlay background to hide
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });
  }

  start(seconds) {
    // Get timer settings from state
    const state = window.stateStore?.getState();
    const settings = state?.timerSettings || {};

    this.remainingTime = seconds;
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.pausedTime = 0;

    this.show();
    this.updateDisplay();

    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        const elapsed = Math.floor((Date.now() - this.startTime - this.pausedTime) / 1000);
        this.remainingTime = seconds - elapsed;

        if (this.remainingTime <= 0) {
          this.remainingTime = 0;
          this.complete(settings);
        }

        this.updateDisplay();
      }
    }, 100); // Update every 100ms for smooth animation

    this.logger.log(`Timer started: ${seconds}s`);
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;
    this.pausedTime += Date.now() - this.startTime;

    const pauseBtn = document.getElementById('rest-timer-pause');
    pauseBtn.innerHTML = '<span class="pause-icon">▶</span><span class="pause-text">Resume</span>';

    this.container.classList.add('paused');
    this.logger.log('Timer paused');
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.startTime = Date.now();

    const pauseBtn = document.getElementById('rest-timer-pause');
    pauseBtn.innerHTML = '<span class="pause-icon">⏸</span><span class="pause-text">Pause</span>';

    this.container.classList.remove('paused');
    this.logger.log('Timer resumed');
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.logger.log('Timer stopped');
  }

  complete(settings) {
    this.stop();

    // Play alert if enabled
    if (settings.soundEnabled !== false) {
      this.playBeep();
    }

    // Vibrate if enabled
    if (settings.vibrationEnabled !== false) {
      this.vibrate();
    }

    // Flash the display
    this.container.classList.add('complete');
    setTimeout(() => {
      this.container.classList.remove('complete');
    }, 1000);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (this.remainingTime === 0) {
        this.hide();
      }
    }, 3000);

    this.logger.log('Timer complete!');
  }

  updateDisplay() {
    const minutes = Math.floor(this.remainingTime / 60);
    const seconds = this.remainingTime % 60;

    this.overlay.querySelector('.rest-timer-minutes').textContent = minutes;
    this.overlay.querySelector('.rest-timer-seconds').textContent =
      seconds.toString().padStart(2, '0');

    // Update progress circle
    const totalSeconds = parseInt(this.overlay.querySelector('.rest-timer-preset.active')?.dataset.seconds) || 120;
    const progress = this.remainingTime / totalSeconds;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference * (1 - progress);

    this.overlay.querySelector('.rest-timer-circle-progress').style.strokeDashoffset = offset;
  }

  show() {
    this.overlay.classList.remove('hidden');
    // Animate in
    setTimeout(() => {
      this.overlay.classList.add('visible');
    }, 10);
  }

  hide() {
    this.overlay.classList.remove('visible');
    setTimeout(() => {
      this.overlay.classList.add('hidden');
    }, 300);
  }

  playBeep() {
    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Three ascending beeps
      const beepPattern = [
        { freq: 800, start: 0, duration: 0.1 },
        { freq: 1000, start: 0.15, duration: 0.1 },
        { freq: 1200, start: 0.3, duration: 0.15 }
      ];

      beepPattern.forEach(beep => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = beep.freq;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, ctx.currentTime + beep.start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + beep.start + beep.duration);

        osc.start(ctx.currentTime + beep.start);
        osc.stop(ctx.currentTime + beep.start + beep.duration);
      });
    } catch (error) {
      this.logger.log('Could not play beep:', error);
    }
  }

  vibrate() {
    if ('vibrate' in navigator) {
      // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms
      navigator.vibrate([200, 100, 200]);
    }
  }

  // Public method to start timer with default duration
  startWithDefault() {
    const state = window.stateStore?.getState();
    const settings = state?.timerSettings || {};
    const defaultDuration = settings.defaultDuration || 120; // Default 2 minutes

    this.start(defaultDuration);
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.restTimer = new RestTimer();
}

export default RestTimer;
