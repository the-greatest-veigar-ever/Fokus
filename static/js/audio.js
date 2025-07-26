// ======================
// AUDIO MANAGEMENT
// ======================

class AudioManager {
    constructor() {
        this.tracks = new Map();
        this.masterVolume = 50;
        this.isMuted = false;
        this.audioContext = null;
        this.trackIcons = {
            'rain': 'icon-rain',
            'forest': 'icon-forest',
            'ocean': 'icon-ocean',
            'coffee-shop': 'icon-coffee',
            'lofi': 'icon-music',
            'white-noise': 'icon-radio',
            'fire': 'icon-fire',
            'birds': 'icon-bird',
            'stream': 'icon-droplet',
            'thunder': 'icon-zap'
        };

        this.elements = {
            tracksContainer: document.getElementById('audioTracks'),
            masterVolumeSlider: document.getElementById('masterVolume'),
            muteAllBtn: document.getElementById('muteAllBtn'),
            audioContainer: document.getElementById('audioContainer')
        };

        this.init();
    }

    async init() {
        this.setupMasterControls();
        await this.loadAudioTracks();
        this.loadAudioPreferences();

        // Create audio context on first user interaction
        document.addEventListener('click', () => this.initAudioContext(), { once: true });
    }

    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (error) {
                console.log('Web Audio API not supported:', error);
            }
        }
    }

    setupMasterControls() {
        // Master volume slider
        if (this.elements.masterVolumeSlider) {
            this.elements.masterVolumeSlider.addEventListener('input', (e) => {
                this.setMasterVolume(parseInt(e.target.value));
                window.FocusFlow.updateVolumeDisplay(e.target);
            });
        }

        // Mute all button
        if (this.elements.muteAllBtn) {
            this.elements.muteAllBtn.addEventListener('click', () => {
                this.toggleMuteAll();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
                switch(e.key) {
                    case 'm':
                    case 'M':
                        this.toggleMuteAll();
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.adjustMasterVolume(5);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.adjustMasterVolume(-5);
                        break;
                }
            }
        });
    }

    async loadAudioTracks() {
        try {
            const audioFiles = await window.FocusFlow.apiRequest('/api/audio-files');
            this.createTrackElements(audioFiles);
        } catch (error) {
            console.error('Failed to load audio files:', error);
            // Create some default tracks for testing
            this.createDefaultTracks();
        }
    }

    createTrackElements(audioFiles) {
        if (!this.elements.tracksContainer) return;

        this.elements.tracksContainer.innerHTML = '';

        audioFiles.forEach(audio => {
            this.createTrackElement(audio.file, audio.name);
        });
    }

    createDefaultTracks() {
        if (!this.elements.tracksContainer) return;

        const defaultTracks = [
            { file: 'rain.mp3', name: 'Rain' },
            { file: 'forest.mp3', name: 'Forest' },
            { file: 'ocean.mp3', name: 'Ocean' },
            { file: 'coffee-shop.mp3', name: 'Coffee Shop' },
            { file: 'lofi.mp3', name: 'Lo-Fi Music' }
        ];

        defaultTracks.forEach(track => {
            this.createTrackElement(track.file, track.name);
        });
    }

    createTrackElement(filename, displayName) {
        const template = document.getElementById('audioTrackTemplate');
        if (!template) return;

        const trackElement = template.content.cloneNode(true);
        const trackDiv = trackElement.querySelector('.audio-track');

        // Set track info
        const icon = trackElement.querySelector('.track-icon');
        const name = trackElement.querySelector('.track-name');
        const toggle = trackElement.querySelector('.track-toggle');
        const slider = trackElement.querySelector('.track-slider');
        const value = trackElement.querySelector('.track-value');

        const trackKey = filename.split('.')[0].toLowerCase();
        const iconClass = this.trackIcons[trackKey] || 'icon-music';

        // Create icon element
        const iconElement = document.createElement('span');
        iconElement.className = `icon ${iconClass} icon-md`;
        icon.innerHTML = '';
        icon.appendChild(iconElement);
        name.textContent = displayName;

        // Create audio element
        const audio = this.createAudioElement(filename, trackKey);

        // Setup track controls
        const playIcon = document.createElement('span');
        playIcon.className = 'icon icon-play icon-sm';
        toggle.innerHTML = '';
        toggle.appendChild(playIcon);

        toggle.addEventListener('click', () => {
            this.toggleTrack(trackKey, toggle);
        });

        slider.addEventListener('input', (e) => {
            this.setTrackVolume(trackKey, parseInt(e.target.value));
            window.FocusFlow.updateVolumeDisplay(e.target);
        });

        // Store track data
        this.tracks.set(trackKey, {
            audio: audio,
            element: trackDiv,
            toggle: toggle,
            slider: slider,
            value: value,
            volume: 0,
            isPlaying: false,
            filename: filename
        });

        this.elements.tracksContainer.appendChild(trackElement);
    }

    createAudioElement(filename, trackKey) {
        const audio = new Audio(`/static/audio/${filename}`);
        audio.loop = true;
        audio.volume = 0;
        audio.preload = 'none';

        // Error handling
        audio.addEventListener('error', (e) => {
            console.warn(`Could not load audio file: ${filename}`);
            const track = this.tracks.get(trackKey);
            if (track) {
                track.toggle.disabled = true;
                const iconElement = track.toggle.querySelector('.icon');
                if (iconElement) {
                    iconElement.className = 'icon icon-x icon-sm';
                }
                track.toggle.title = 'Audio file not found';
            }
        });

        // Loaded successfully
        audio.addEventListener('canplaythrough', () => {
            const track = this.tracks.get(trackKey);
            if (track) {
                track.toggle.disabled = false;
            }
        });

        if (this.elements.audioContainer) {
            this.elements.audioContainer.appendChild(audio);
        }

        return audio;
    }

    toggleTrack(trackKey, toggleButton) {
        const track = this.tracks.get(trackKey);
        if (!track) return;

        if (track.isPlaying) {
            this.pauseTrack(trackKey);
        } else {
            this.playTrack(trackKey);
        }
    }

    async playTrack(trackKey) {
        const track = this.tracks.get(trackKey);
        if (!track) return;

        try {
            // Set initial volume if not set
            if (track.volume === 0) {
                this.setTrackVolume(trackKey, 30);
                track.slider.value = 30;
                window.FocusFlow.updateVolumeDisplay(track.slider);
            }

            await track.audio.play();
            track.isPlaying = true;

            // Update toggle button icon
            const iconElement = track.toggle.querySelector('.icon');
            if (iconElement) {
                iconElement.className = 'icon icon-pause icon-sm';
            }
            track.toggle.title = 'Pause';

            // Save preference
            this.saveTrackPreference(trackKey, track.volume);

        } catch (error) {
            console.error(`Failed to play track ${trackKey}:`, error);
            window.FocusFlow.showNotification('Could not play audio. Check if file exists.', 'error');
        }
    }

    pauseTrack(trackKey) {
        const track = this.tracks.get(trackKey);
        if (!track) return;

        track.audio.pause();
        track.isPlaying = false;

        // Update toggle button icon
        const iconElement = track.toggle.querySelector('.icon');
        if (iconElement) {
            iconElement.className = 'icon icon-play icon-sm';
        }
        track.toggle.title = 'Play';

        // Save preference
        this.saveTrackPreference(trackKey, 0);
    }

    setTrackVolume(trackKey, volume) {
        const track = this.tracks.get(trackKey);
        if (!track) return;

        track.volume = volume;

        // Calculate final volume with master volume
        const finalVolume = this.isMuted ? 0 : (volume / 100) * (this.masterVolume / 100);
        track.audio.volume = Math.max(0, Math.min(1, finalVolume));

        // Update slider if needed
        if (track.slider.value !== volume.toString()) {
            track.slider.value = volume;
            window.FocusFlow.updateVolumeDisplay(track.slider);
        }

        // Auto-play if volume is set above 0
        if (volume > 0 && !track.isPlaying) {
            this.playTrack(trackKey);
        } else if (volume === 0 && track.isPlaying) {
            this.pauseTrack(trackKey);
        }

        this.saveTrackPreference(trackKey, volume);
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(100, volume));

        // Update all track volumes
        this.tracks.forEach((track, trackKey) => {
            const finalVolume = this.isMuted ? 0 : (track.volume / 100) * (this.masterVolume / 100);
            track.audio.volume = Math.max(0, Math.min(1, finalVolume));
        });

        // Update master volume slider
        if (this.elements.masterVolumeSlider) {
            this.elements.masterVolumeSlider.value = this.masterVolume;
            window.FocusFlow.updateVolumeDisplay(this.elements.masterVolumeSlider);
        }

        // Save preference
        localStorage.setItem('focusflow-master-volume', this.masterVolume.toString());
    }

    adjustMasterVolume(delta) {
        this.setMasterVolume(this.masterVolume + delta);
    }

    toggleMuteAll() {
        this.isMuted = !this.isMuted;

        // Update all track volumes
        this.tracks.forEach((track, trackKey) => {
            const finalVolume = this.isMuted ? 0 : (track.volume / 100) * (this.masterVolume / 100);
            track.audio.volume = Math.max(0, Math.min(1, finalVolume));
        });

        // Update mute button
        if (this.elements.muteAllBtn) {
            const iconElement = this.elements.muteAllBtn.querySelector('.icon');
            if (iconElement) {
                iconElement.className = this.isMuted
                    ? 'icon icon-volume-x icon-sm'
                    : 'icon icon-volume icon-sm';
            }
            this.elements.muteAllBtn.title = this.isMuted ? 'Unmute all' : 'Mute all';
        }

        // Show notification
        window.FocusFlow.showNotification(this.isMuted ? 'All audio muted' : 'Audio unmuted');

        // Save preference
        localStorage.setItem('focusflow-muted', this.isMuted.toString());
    }

    stopAllTracks() {
        this.tracks.forEach((track, trackKey) => {
            if (track.isPlaying) {
                this.pauseTrack(trackKey);
            }
        });
    }

    loadAudioPreferences() {
        // Load master volume
        const savedMasterVolume = localStorage.getItem('focusflow-master-volume');
        if (savedMasterVolume) {
            this.setMasterVolume(parseInt(savedMasterVolume));
        }

        // Load mute state
        const savedMuted = localStorage.getItem('focusflow-muted');
        if (savedMuted === 'true') {
            this.toggleMuteAll();
        }

        // Load individual track preferences
        this.tracks.forEach((track, trackKey) => {
            const savedVolume = localStorage.getItem(`focusflow-track-${trackKey}`);
            if (savedVolume) {
                const volume = parseInt(savedVolume);
                if (volume > 0) {
                    this.setTrackVolume(trackKey, volume);
                }
            }
        });
    }

    saveTrackPreference(trackKey, volume) {
        localStorage.setItem(`focusflow-track-${trackKey}`, volume.toString());
    }

    // Preset environments
    loadEnvironmentPreset(presetName) {
        // Stop all current tracks
        this.stopAllTracks();

        const presets = {
            'rain': { 'rain': 60 },
            'forest': { 'forest': 50, 'birds': 30 },
            'ocean': { 'ocean': 70 },
            'cafe': { 'coffee-shop': 50 },
            'study': { 'lofi': 40, 'rain': 20 },
            'deep-focus': { 'white-noise': 35 },
            'nature': { 'forest': 40, 'birds': 30, 'stream': 20 },
            'stormy': { 'rain': 60, 'thunder': 20 }
        };

        const preset = presets[presetName];
        if (preset) {
            setTimeout(() => {
                Object.entries(preset).forEach(([trackKey, volume]) => {
                    if (this.tracks.has(trackKey)) {
                        this.setTrackVolume(trackKey, volume);
                    }
                });
            }, 100);

            window.FocusFlow.showNotification(`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} environment loaded`);
        }
    }

    // Fade effects
    fadeIn(trackKey, duration = 2000) {
        const track = this.tracks.get(trackKey);
        if (!track || !track.isPlaying) return;

        const targetVolume = track.volume / 100 * this.masterVolume / 100;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = targetVolume / steps;

        let currentStep = 0;
        track.audio.volume = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            track.audio.volume = Math.min(targetVolume, volumeStep * currentStep);

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
            }
        }, stepDuration);
    }

    fadeOut(trackKey, duration = 2000) {
        const track = this.tracks.get(trackKey);
        if (!track || !track.isPlaying) return;

        const initialVolume = track.audio.volume;
        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = initialVolume / steps;

        let currentStep = 0;

        const fadeInterval = setInterval(() => {
            currentStep++;
            track.audio.volume = Math.max(0, initialVolume - (volumeStep * currentStep));

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.pauseTrack(trackKey);
            }
        }, stepDuration);
    }
}

// ======================
// AUDIO VISUALIZATION
// ======================

class AudioVisualizer {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.canvas = null;
        this.canvasContext = null;
        this.animationId = null;
        this.isActive = false;
    }

    createVisualizer(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.canvas = document.createElement('canvas');
        this.canvas.width = 300;
        this.canvas.height = 100;
        this.canvas.style.cssText = `
            width: 100%;
            height: 60px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            margin-top: 1rem;
        `;

        this.canvasContext = this.canvas.getContext('2d');
        container.appendChild(this.canvas);

        this.startVisualization();
    }

    startVisualization() {
        if (this.isActive) return;
        this.isActive = true;
        this.animate();
    }

    stopVisualization() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }

    animate() {
        if (!this.isActive) return;

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        if (!this.canvasContext) return;

        const ctx = this.canvasContext;
        const canvas = this.canvas;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Simple wave visualization
        const centerY = canvas.height / 2;
        const amplitude = 20;
        const frequency = 0.02;
        const time = Date.now() * 0.001;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
            const y = centerY + Math.sin(x * frequency + time) * amplitude;
            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }
}

// ======================
// INITIALIZATION
// ======================

let audioManager;
let audioVisualizer;

function loadAudioTracks() {
    if (!audioManager && document.getElementById('audioTracks')) {
        audioManager = new AudioManager();
        audioVisualizer = new AudioVisualizer(audioManager);

        // Create visualizer if we're in focus mode
        if (document.getElementById('focusContainer')) {
            setTimeout(() => {
                audioVisualizer.createVisualizer('audioContainer');
            }, 1000);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadAudioTracks);

// Handle tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (audioManager) {
        if (document.hidden) {
            // Tab is hidden - continue playing audio
            console.log('Tab hidden, audio continues');
        } else {
            // Tab is visible
            console.log('Tab visible');
        }
    }
});

// ======================
// GLOBAL FUNCTIONS
// ======================

function setEnvironmentPreset(presetName) {
    if (audioManager) {
        audioManager.loadEnvironmentPreset(presetName);
    }
}

function stopAllAudio() {
    if (audioManager) {
        audioManager.stopAllTracks();
    }
}

function setMasterAudioVolume(volume) {
    if (audioManager) {
        audioManager.setMasterVolume(volume);
    }
}

// Expose functions globally
window.setEnvironmentPreset = setEnvironmentPreset;
window.stopAllAudio = stopAllAudio;
window.setMasterAudioVolume = setMasterAudioVolume;
window.loadAudioTracks = loadAudioTracks;