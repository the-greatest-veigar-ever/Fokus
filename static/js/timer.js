// ======================
// TIMER FUNCTIONALITY
// ======================

class FocusTimer {
    constructor() {
        this.duration = 25 * 60; // 25 minutes in seconds
        this.timeLeft = this.duration;
        this.isRunning = false;
        this.isPaused = false;
        this.sessionType = 'focus';
        this.sessionCount = 1;
        this.interval = null;
        this.currentSessionId = null;

        this.elements = {
            display: document.getElementById('timerDisplay'),
            startPauseBtn: document.getElementById('startPauseBtn'),
            resetBtn: document.getElementById('resetBtn'),
            skipBtn: document.getElementById('skipBtn'),
            sessionCount: document.getElementById('sessionCount'),
            currentType: document.getElementById('currentType'),
            timerLabel: document.getElementById('timerLabel'),
            progressRing: document.querySelector('.timer-ring-progress')
        };

        this.bindEvents();
        this.updateDisplay();
        this.loadSavedState();
    }

    bindEvents() {
        if (this.elements.startPauseBtn) {
            this.elements.startPauseBtn.addEventListener('click', () => this.toggleTimer());
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => this.resetTimer());
        }

        if (this.elements.skipBtn) {
            this.elements.skipBtn.addEventListener('click', () => this.skipSession());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
                switch(e.key) {
                    case ' ':
                    case 'Enter':
                        e.preventDefault();
                        this.toggleTimer();
                        break;
                    case 'r':
                    case 'R':
                        this.resetTimer();
                        break;
                    case 's':
                    case 'S':
                        this.skipSession();
                        break;
                }
            }
        });

        // Handle session complete modal buttons
        this.setupSessionCompleteHandlers();
    }

    setupSessionCompleteHandlers() {
        const startBreakBtn = document.getElementById('startBreak');
        const startAnotherBtn = document.getElementById('startAnother');
        const finishSessionBtn = document.getElementById('finishSession');

        if (startBreakBtn) {
            startBreakBtn.addEventListener('click', () => {
                this.startBreakSession();
                window.FocusFlow.closeModal('sessionComplete');
            });
        }

        if (startAnotherBtn) {
            startAnotherBtn.addEventListener('click', () => {
                this.startNextSession();
                window.FocusFlow.closeModal('sessionComplete');
            });
        }

        if (finishSessionBtn) {
            finishSessionBtn.addEventListener('click', () => {
                window.FocusFlow.closeModal('sessionComplete');
                window.location.href = '/dashboard';
            });
        }
    }

    toggleTimer() {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    }

    async startTimer() {
        if (!this.currentSessionId) {
            try {
                const response = await window.FocusFlow.apiRequest('/api/session/start', {
                    method: 'POST',
                    body: JSON.stringify({
                        duration: Math.round(this.duration / 60),
                        type: this.sessionType,
                        environment: this.getCurrentEnvironment()
                    })
                });

                this.currentSessionId = response.session_id;
            } catch (error) {
                console.error('Failed to start session:', error);
                // Continue with local timer even if API fails
            }
        }

        this.isRunning = true;
        this.isPaused = false;

        this.interval = setInterval(() => {
            this.tick();
        }, 1000);

        this.updateStartPauseButton();
        this.updateTimerActiveState();
        this.saveState();

        // Show notification
        window.FocusFlow.showNotification(`${this.sessionType === 'focus' ? 'Focus' : 'Break'} session started!`);

        // Play start sound
        this.playNotificationSound('start');

        // Dispatch timer state change event
        window.dispatchEvent(new CustomEvent('timerStateChanged', {
            detail: { isRunning: true, sessionType: this.sessionType }
        }));
    }

    pauseTimer() {
        this.isRunning = false;
        this.isPaused = true;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateStartPauseButton();
        this.updateTimerActiveState();
        this.saveState();

        window.FocusFlow.showNotification('Timer paused');

        // Dispatch timer state change event
        window.dispatchEvent(new CustomEvent('timerStateChanged', {
            detail: { isRunning: false, sessionType: this.sessionType }
        }));
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = this.duration;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateDisplay();
        this.updateStartPauseButton();
        this.updateProgressRing();
        this.updateTimerActiveState();
        this.saveState();

        window.FocusFlow.showNotification('Timer reset');

        // Dispatch timer state change event
        window.dispatchEvent(new CustomEvent('timerStateChanged', {
            detail: { isRunning: false, sessionType: this.sessionType }
        }));
    }

    updateTimerActiveState() {
        const timerComponent = document.querySelector('.timer-component');
        if (timerComponent) {
            if (this.isRunning) {
                timerComponent.classList.add('timer-active');
            } else {
                timerComponent.classList.remove('timer-active');
            }
        }
    }

    skipSession() {
        if (this.isRunning || this.isPaused) {
            this.completeSession(false); // Mark as incomplete
        }
    }

    tick() {
        this.timeLeft--;
        this.updateDisplay();
        this.updateProgressRing();

        // Save state every 30 seconds
        if (this.timeLeft % 30 === 0) {
            this.saveState();
        }

        if (this.timeLeft <= 0) {
            this.completeSession(true);
        }
    }

    async completeSession(completed = true) {
        this.isRunning = false;
        this.isPaused = false;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }

        this.updateTimerActiveState();

        const actualDuration = Math.round((this.duration - this.timeLeft) / 60);

        // Send completion to API
        if (this.currentSessionId) {
            try {
                await window.FocusFlow.apiRequest('/api/session/end', {
                    method: 'POST',
                    body: JSON.stringify({
                        session_id: this.currentSessionId,
                        actual_duration: actualDuration,
                        completed: completed
                    })
                });
            } catch (error) {
                console.error('Failed to end session:', error);
            }
        }

        // Reset session ID
        this.currentSessionId = null;

        if (completed) {
            this.showSessionComplete(actualDuration);
            this.playNotificationSound('complete');

            // Browser notification if permission granted
            this.showBrowserNotification();
        } else {
            window.FocusFlow.showNotification('Session skipped');
        }

        // Dispatch timer state change event
        window.dispatchEvent(new CustomEvent('timerStateChanged', {
            detail: { isRunning: false, sessionType: this.sessionType }
        }));

        this.clearSavedState();
    }

    showSessionComplete(duration) {
        const modal = document.getElementById('sessionComplete');
        const summary = document.getElementById('sessionSummary');

        if (summary) {
            const sessionWord = this.sessionType === 'focus' ? 'focus' : 'break';
            summary.textContent = `You completed a ${duration}-minute ${sessionWord} session! Great job staying focused.`;
        }

        // Add celebration animation to the modal icon
        const modalIcon = modal?.querySelector('.modal-icon .icon');
        if (modalIcon) {
            modalIcon.style.animation = 'bounce 1s ease-in-out';
        }

        window.FocusFlow.showModal('sessionComplete');
    }

    startBreakSession() {
        const breakDuration = parseInt(localStorage.getItem('focusflow-break-duration') || '5');
        this.setTimerDuration(breakDuration);
        this.setSessionType('break');
        this.resetTimer();
        this.startTimer();
    }

    startNextSession() {
        this.sessionCount++;
        this.setSessionType('focus');
        const focusDuration = parseInt(localStorage.getItem('focusflow-timer-duration') || '25');
        this.setTimerDuration(focusDuration);
        this.resetTimer();
        this.startTimer();
    }

    setTimerDuration(minutes) {
        this.duration = minutes * 60;
        if (!this.isRunning && !this.isPaused) {
            this.timeLeft = this.duration;
            this.updateDisplay();
            this.updateProgressRing();
        }
    }

    setSessionType(type) {
        this.sessionType = type;
        this.updateSessionTypeDisplay();
    }

    updateDisplay() {
        if (this.elements.display) {
            this.elements.display.textContent = window.FocusFlow.formatTime(this.timeLeft);
        }

        // Update document title
        document.title = `${window.FocusFlow.formatTime(this.timeLeft)} - ${this.sessionType === 'focus' ? 'Focus' : 'Break'} - FocusFlow`;
    }

    updateStartPauseButton() {
        if (this.elements.startPauseBtn) {
            const iconElement = this.elements.startPauseBtn.querySelector('.btn-icon .icon');
            const text = this.elements.startPauseBtn.querySelector('.btn-text');

            if (this.isRunning) {
                if (iconElement) {
                    iconElement.className = 'icon icon-pause icon-md';
                }
                if (text) text.textContent = 'Pause';
            } else {
                if (iconElement) {
                    iconElement.className = 'icon icon-play icon-md';
                }
                if (text) text.textContent = this.isPaused ? 'Resume' : 'Start';
            }
        }
    }

    updateProgressRing() {
        if (this.elements.progressRing) {
            const progress = (this.duration - this.timeLeft) / this.duration;
            const circumference = 2 * Math.PI * 80; // radius = 80
            const offset = circumference - (progress * circumference);
            this.elements.progressRing.style.strokeDashoffset = offset;
        }
    }

    updateSessionTypeDisplay() {
        if (this.elements.currentType) {
            this.elements.currentType.textContent = this.sessionType === 'focus' ? 'Focus' : 'Break';
        }

        if (this.elements.timerLabel) {
            this.elements.timerLabel.textContent = this.sessionType === 'focus' ? 'Focus Time' : 'Break Time';
        }

        if (this.elements.sessionCount) {
            this.elements.sessionCount.textContent = this.sessionCount;
        }

        // Update session info in header
        const sessionInfo = document.querySelector('.session-info');
        if (sessionInfo) {
            sessionInfo.textContent = this.sessionType === 'focus' ? 'Focus Session' : 'Break Session';
        }
    }

    getCurrentEnvironment() {
        const backgroundSelect = document.getElementById('backgroundSelect');
        return backgroundSelect ? backgroundSelect.value : 'default';
    }

    playNotificationSound(type) {
        // Play notification sound if available
        const audio = new Audio();
        audio.volume = 0.3;

        switch(type) {
            case 'start':
                audio.src = '/static/audio/bell.mp3';
                break;
            case 'complete':
                audio.src = '/static/audio/bell.mp3';
                break;
        }

        audio.play().catch(e => {
            // Ignore audio play errors (autoplay restrictions)
            console.log('Could not play notification sound:', e.message);
        });
    }

    async showBrowserNotification() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification('FocusFlow', {
                    body: `${this.sessionType === 'focus' ? 'Focus' : 'Break'} session completed!`,
                    icon: '/static/images/icon.png',
                    silent: false
                });
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification('FocusFlow', {
                        body: `${this.sessionType === 'focus' ? 'Focus' : 'Break'} session completed!`,
                        icon: '/static/images/icon.png',
                        silent: false
                    });
                }
            }
        }
    }

    saveState() {
        const state = {
            duration: this.duration,
            timeLeft: this.timeLeft,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            sessionType: this.sessionType,
            sessionCount: this.sessionCount,
            currentSessionId: this.currentSessionId,
            timestamp: Date.now()
        };

        sessionStorage.setItem('focusflow-timer-state', JSON.stringify(state));
    }

    loadSavedState() {
        const savedState = sessionStorage.getItem('focusflow-timer-state');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                const timeSinceLastSave = (Date.now() - state.timestamp) / 1000;

                // Only restore if less than 5 minutes ago
                if (timeSinceLastSave < 300) {
                    this.duration = state.duration;
                    this.timeLeft = state.timeLeft;
                    this.sessionType = state.sessionType;
                    this.sessionCount = state.sessionCount;
                    this.currentSessionId = state.currentSessionId;

                    // Adjust time if timer was running
                    if (state.isRunning) {
                        this.timeLeft = Math.max(0, this.timeLeft - Math.floor(timeSinceLastSave));
                        if (this.timeLeft > 0) {
                            this.isPaused = true; // Don't auto-resume
                        }
                    }

                    this.updateDisplay();
                    this.updateProgressRing();
                    this.updateSessionTypeDisplay();
                    this.updateStartPauseButton();
                }
            } catch (error) {
                console.error('Failed to load saved timer state:', error);
            }
        }
    }

    clearSavedState() {
        sessionStorage.removeItem('focusflow-timer-state');
    }
}

// ======================
// POMODORO MANAGER
// ======================

class PomodoroManager {
    constructor(timer) {
        this.timer = timer;
        this.focusDuration = 25;
        this.shortBreak = 5;
        this.longBreak = 15;
        this.cycleCount = 0;
        this.isPomodoro = false;
    }

    startPomodoroCycle() {
        this.isPomodoro = true;
        this.cycleCount = 0;
        this.nextSession();
    }

    nextSession() {
        if (!this.isPomodoro) return;

        this.cycleCount++;

        if (this.cycleCount % 8 === 0) {
            // Long break after 4 focus sessions
            this.timer.setTimerDuration(this.longBreak);
            this.timer.setSessionType('break');
        } else if (this.cycleCount % 2 === 0) {
            // Short break after focus session
            this.timer.setTimerDuration(this.shortBreak);
            this.timer.setSessionType('break');
        } else {
            // Focus session
            this.timer.setTimerDuration(this.focusDuration);
            this.timer.setSessionType('focus');
        }

        this.timer.resetTimer();
        this.timer.startTimer();
    }

    stopPomodoro() {
        this.isPomodoro = false;
        this.cycleCount = 0;
    }
}

// ======================
// INITIALIZATION
// ======================

let focusTimer;
let pomodoroManager;

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('timerDisplay')) {
        focusTimer = new FocusTimer();
        pomodoroManager = new PomodoroManager(focusTimer);

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
});

// ======================
// GLOBAL FUNCTIONS
// ======================

function setTimerDuration(minutes) {
    if (focusTimer) {
        focusTimer.setTimerDuration(minutes);
    }
}

function setSessionType(type) {
    if (focusTimer) {
        focusTimer.setSessionType(type);
    }
}

function saveTimerState() {
    if (focusTimer) {
        focusTimer.saveState();
    }
}

function pauseTimer() {
    if (focusTimer && focusTimer.isRunning) {
        focusTimer.pauseTimer();
    }
}

// Expose functions globally
window.setTimerDuration = setTimerDuration;
window.setSessionType = setSessionType;
window.saveTimerState = saveTimerState;
window.pauseTimer = pauseTimer;