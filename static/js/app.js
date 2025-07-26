// ======================
// MAIN APP FUNCTIONALITY
// ======================

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeAnimations();
    initializeInteractiveEffects();
});

function initializeApp() {
    setupThemeToggle();
    setupNavigation();
    setupModals();
    loadUserPreferences();

    // Auto-detect system theme if no preference is set
    if (!localStorage.getItem('focusflow-theme')) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setTheme(systemTheme);
    }
}

// ======================
// MODERN ANIMATIONS & EFFECTS
// ======================

function initializeAnimations() {
    // Add page transition effect
    document.body.classList.add('page-transition');

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .stat-card, .action-card');
    animatedElements.forEach(el => {
        observer.observe(el);
    });

    // Parallax scroll effect for hero section
    initializeParallax();

    // Initialize magnetic hover effects
    initializeMagneticButtons();
}

function initializeInteractiveEffects() {
    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('.btn, .timer-btn, .preview-btn');
    buttons.forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });

    // Add hover sound effects (optional)
    const interactiveElements = document.querySelectorAll('.btn, .nav-link, .theme-toggle');
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', () => {
            playHoverSound();
        });
    });

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });

    // Add breathing effect to timer when active
    initializeTimerEffects();
}

function initializeParallax() {
    const heroSection = document.querySelector('.hero-section');
    if (!heroSection) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;

        heroSection.style.transform = `translateY(${rate}px)`;
    });
}

function initializeMagneticButtons() {
    const magneticElements = document.querySelectorAll('.btn-primary, .theme-toggle, .timer-btn-primary');

    magneticElements.forEach(element => {
        element.addEventListener('mousemove', (e) => {
            const rect = element.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            const distance = Math.sqrt(x * x + y * y);
            const maxDistance = 50;

            if (distance < maxDistance) {
                const strength = (maxDistance - distance) / maxDistance;
                const moveX = x * strength * 0.3;
                const moveY = y * strength * 0.3;

                element.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
            }
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = '';
        });
    });
}

function createRippleEffect(e) {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function smoothScroll(e) {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

function playHoverSound() {
    // Subtle hover sound effect
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQcBi2N1fPYfiQFl1Xn1vJW');
        audio.volume = 0.1;
        audio.play().catch(() => {});
    } catch (e) {
        // Ignore audio errors
    }
}

function initializeTimerEffects() {
    // Add special effects when timer is running
    window.addEventListener('timerStateChanged', (e) => {
        const timerComponent = document.querySelector('.timer-component');
        if (!timerComponent) return;

        if (e.detail.isRunning) {
            timerComponent.classList.add('timer-active');
            // Focus field effect is now handled by CSS
        } else {
            timerComponent.classList.remove('timer-active');
        }
    });
}

// Add particle animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .animate-in {
        animation-play-state: running !important;
    }
    
    .timer-active {
        position: relative;
    }
`;
document.head.appendChild(style);

// ======================
// THEME MANAGEMENT
// ======================

function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
        updateThemeButton();
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('focusflow-theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function toggleTheme() {
    const currentTheme = getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.body.className = `theme-${theme}`;
    localStorage.setItem('focusflow-theme', theme);
    updateThemeButton();

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme }
    }));
}

function getCurrentTheme() {
    return localStorage.getItem('focusflow-theme') || 'light';
}

function updateThemeButton() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = getCurrentTheme();
        const iconElement = themeToggle.querySelector('.icon');

        if (iconElement) {
            iconElement.className = currentTheme === 'light'
                ? 'icon icon-moon icon-sm'
                : 'icon icon-sun icon-sm';
        }

        themeToggle.setAttribute('aria-label', `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`);
    }
}

// ======================
// NAVIGATION
// ======================

function setupNavigation() {
    // Highlight current page in navigation
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.style.color = 'var(--accent-primary)';
            link.style.fontWeight = '600';
        }
    });

    // Exit focus mode button
    const exitFocusBtn = document.getElementById('exitFocus');
    if (exitFocusBtn) {
        exitFocusBtn.addEventListener('click', () => {
            window.location.href = '/dashboard';
        });
    }
}

// ======================
// MODAL MANAGEMENT
// ======================

function setupModals() {
    // Generic modal close functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                closeModal(openModal);
            }
        }
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        // Focus management for accessibility
        const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
}

function closeModal(modal) {
    if (typeof modal === 'string') {
        modal = document.getElementById(modal);
    }

    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// ======================
// USER PREFERENCES
// ======================

function loadUserPreferences() {
    const savedTheme = localStorage.getItem('focusflow-theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }

    // Load other preferences
    loadTimerPreferences();
    loadAudioPreferences();
}

function loadTimerPreferences() {
    const defaultDuration = localStorage.getItem('focusflow-timer-duration') || '25';
    const defaultBreak = localStorage.getItem('focusflow-break-duration') || '5';

    const timerDurationInput = document.getElementById('timerDuration');
    const breakDurationInput = document.getElementById('breakDuration');

    if (timerDurationInput) timerDurationInput.value = defaultDuration;
    if (breakDurationInput) breakDurationInput.value = defaultBreak;
}

function loadAudioPreferences() {
    const masterVolume = localStorage.getItem('focusflow-master-volume') || '50';
    const masterVolumeSlider = document.getElementById('masterVolume');

    if (masterVolumeSlider) {
        masterVolumeSlider.value = masterVolume;
        updateVolumeDisplay(masterVolumeSlider);
    }
}

function saveUserPreferences() {
    const timerDurationInput = document.getElementById('timerDuration');
    const breakDurationInput = document.getElementById('breakDuration');
    const masterVolumeSlider = document.getElementById('masterVolume');

    if (timerDurationInput) {
        localStorage.setItem('focusflow-timer-duration', timerDurationInput.value);
    }

    if (breakDurationInput) {
        localStorage.setItem('focusflow-break-duration', breakDurationInput.value);
    }

    if (masterVolumeSlider) {
        localStorage.setItem('focusflow-master-volume', masterVolumeSlider.value);
    }
}

// ======================
// UTILITY FUNCTIONS
// ======================

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function updateVolumeDisplay(slider) {
    const valueSpan = slider.parentElement.querySelector('.volume-value, .track-value');
    if (valueSpan) {
        valueSpan.textContent = slider.value + '%';
    }
}

// ======================
// API HELPERS
// ======================

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showNotification('Network error. Please try again.', 'error');
        throw error;
    }
}

// ======================
// BACKGROUND MANAGEMENT
// ======================

function loadBackgrounds() {
    return apiRequest('/api/backgrounds')
        .then(backgrounds => {
            const backgroundSelect = document.getElementById('backgroundSelect');
            if (backgroundSelect) {
                backgroundSelect.innerHTML = '<option value="">Choose background...</option>';

                // Add gradient options
                const gradients = [
                    { name: 'Ocean Gradient', value: 'gradient-1' },
                    { name: 'Sunset Gradient', value: 'gradient-2' },
                    { name: 'Sky Gradient', value: 'gradient-3' },
                    { name: 'Forest Gradient', value: 'gradient-4' },
                    { name: 'Twilight Gradient', value: 'gradient-5' }
                ];

                gradients.forEach(bg => {
                    const option = document.createElement('option');
                    option.value = `focus-bg-${bg.value}`;
                    option.textContent = bg.name;
                    backgroundSelect.appendChild(option);
                });

                // Add image backgrounds
                backgrounds.forEach(bg => {
                    const option = document.createElement('option');
                    option.value = `focus-bg-${bg.file.split('.')[0]}`;
                    option.textContent = bg.name;
                    backgroundSelect.appendChild(option);
                });
            }

            return backgrounds;
        })
        .catch(error => {
            console.error('Failed to load backgrounds:', error);
        });
}

function setBackground(backgroundClass) {
    const focusContainer = document.getElementById('focusContainer');
    if (focusContainer) {
        // Remove all existing background classes
        focusContainer.className = focusContainer.className
            .split(' ')
            .filter(cls => !cls.startsWith('focus-bg-'))
            .join(' ');

        // Add new background class
        if (backgroundClass) {
            focusContainer.classList.add(backgroundClass);
            localStorage.setItem('focusflow-background', backgroundClass);
        }
    }
}

// ======================
// FOCUS MODE INITIALIZATION
// ======================

function initializeFocusMode() {
    if (document.getElementById('focusContainer')) {
        setupFocusControls();
        loadBackgrounds();
        loadAudioTracks();

        // Load saved background
        const savedBackground = localStorage.getItem('focusflow-background');
        if (savedBackground) {
            setBackground(savedBackground);
            const backgroundSelect = document.getElementById('backgroundSelect');
            if (backgroundSelect) {
                backgroundSelect.value = savedBackground;
            }
        }

        // Check for quick session parameters
        const quickSession = sessionStorage.getItem('quickSession');
        if (quickSession) {
            const params = JSON.parse(quickSession);
            sessionStorage.removeItem('quickSession');

            // Apply quick session settings
            if (window.setTimerDuration) {
                window.setTimerDuration(params.duration);
            }
            if (window.setSessionType) {
                window.setSessionType(params.type);
            }
        }
    }
}

function setupFocusControls() {
    // Settings panel toggle
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const closeSettingsBtn = document.getElementById('closeSettings');
    const applySettingsBtn = document.getElementById('applySettings');

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });
    }

    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.add('hidden');
        });
    }

    if (applySettingsBtn) {
        applySettingsBtn.addEventListener('click', () => {
            applyFocusSettings();
            settingsPanel.classList.add('hidden');
        });
    }

    // Background selector
    const backgroundSelect = document.getElementById('backgroundSelect');
    if (backgroundSelect) {
        backgroundSelect.addEventListener('change', (e) => {
            setBackground(e.target.value);
        });
    }
}

function applyFocusSettings() {
    const timerDuration = document.getElementById('timerDuration')?.value;
    const breakDuration = document.getElementById('breakDuration')?.value;
    const sessionType = document.getElementById('sessionTypeSelect')?.value;

    if (timerDuration && window.setTimerDuration) {
        window.setTimerDuration(parseInt(timerDuration));
    }

    if (sessionType && window.setSessionType) {
        window.setSessionType(sessionType);
    }

    saveUserPreferences();
    showNotification('Settings applied successfully!');
}

// ======================
// GLOBAL EVENT LISTENERS
// ======================

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Tab is hidden
        if (window.pauseTimer) {
            // Don't auto-pause, just notify other components
            window.dispatchEvent(new CustomEvent('tabHidden'));
        }
    } else {
        // Tab is visible
        window.dispatchEvent(new CustomEvent('tabVisible'));
    }
});

// Handle page unload (save state)
window.addEventListener('beforeunload', () => {
    saveUserPreferences();

    // Save current timer state if applicable
    if (window.saveTimerState) {
        window.saveTimerState();
    }
});

// Expose global functions for other scripts
window.FocusFlow = {
    showModal,
    closeModal,
    showNotification,
    formatTime,
    formatDuration,
    setTheme,
    getCurrentTheme,
    setBackground,
    saveUserPreferences,
    apiRequest
};