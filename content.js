// MindfulPing - Content Script for Activity Detection
// This script runs on every webpage to detect user activity

class ActivityDetector {
    constructor() {
        this.isActive = true;
        this.lastActivityTime = Date.now();
        this.inactivityThreshold = 5 * 60 * 1000; // 5 minutes default
        this.activityCheckInterval = 30 * 1000; // Check every 30 seconds
        this.activityTimer = null;

        // Events that indicate user activity
        this.activityEvents = [
            'mousedown', 'mousemove', 'mousewheel',
            'keydown', 'keypress',
            'scroll', 'click',
            'touchstart', 'touchmove',
            'focus', 'blur'
        ];

        this.init();
    }

    async init() {
        // Wait a short time to ensure background script is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Load settings from storage
        await this.loadSettings();

        // Set up activity event listeners
        this.setupActivityListeners();

        // Start monitoring activity
        this.startActivityMonitoring();

        // Listen for messages from background script
        this.setupMessageListener();

        // Listen for visibility changes
        this.setupVisibilityListener();

        console.log('MindfulPing activity detector initialized');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['inactivityThreshold', 'trackInactiveTime']);

            if (result.inactivityThreshold) {
                this.inactivityThreshold = result.inactivityThreshold * 60 * 1000; // Convert minutes to milliseconds
            }

            // If tracking inactive time is disabled, we still detect activity but don't pause
            this.trackInactiveTime = result.trackInactiveTime !== false; // Default to true

            console.log(`Activity detector settings: threshold=${this.inactivityThreshold / 1000 / 60}min, trackInactive=${this.trackInactiveTime}`);
        } catch (error) {
            console.error('Error loading activity detector settings:', error);
        }
    }

    setupActivityListeners() {
        // Add event listeners for user activity
        this.activityEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.recordActivity();
            }, { passive: true });
        });

        // Special handling for page focus/blur
        window.addEventListener('focus', () => {
            this.recordActivity();
            this.notifyBackgroundScript('page-focus');
        });

        window.addEventListener('blur', () => {
            this.notifyBackgroundScript('page-blur');
        });
    }

    setupVisibilityListener() {
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.notifyBackgroundScript('page-hidden');
            } else {
                this.recordActivity();
                this.notifyBackgroundScript('page-visible');
            }
        });
    }

    setupMessageListener() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
                if (request.action === 'getActivityStatus') {
                    sendResponse({
                        isActive: this.isActive,
                        lastActivityTime: this.lastActivityTime,
                        timeSinceLastActivity: Date.now() - this.lastActivityTime
                    });
                    return true;
                }

                if (request.action === 'updateActivitySettings') {
                    this.inactivityThreshold = request.inactivityThreshold * 60 * 1000;
                    this.trackInactiveTime = request.trackInactiveTime;
                    console.log('Activity detector settings updated:', request);
                    sendResponse({ success: true });
                    return true;
                }
            } catch (error) {
                console.error('Error handling message in content script:', error);
                sendResponse({ success: false, error: error.message });
            }
        });
    }

    recordActivity() {
        const now = Date.now();
        const wasInactive = !this.isActive;

        this.lastActivityTime = now;
        this.isActive = true;

        // If user was inactive and became active, notify background
        if (wasInactive) {
            console.log('User became active');
            this.notifyBackgroundScript('user-active');
        }
    }

    startActivityMonitoring() {
        // Check activity status periodically
        this.activityTimer = setInterval(() => {
            this.checkActivityStatus();
        }, this.activityCheckInterval);
    }

    checkActivityStatus() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.lastActivityTime;

        // Check if user has been inactive for too long
        if (timeSinceLastActivity > this.inactivityThreshold && this.isActive) {
            console.log(`User inactive for ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes`);
            this.isActive = false;
            this.notifyBackgroundScript('user-inactive', {
                inactiveDuration: timeSinceLastActivity
            });
        }

        // Send periodic activity status to background script
        this.notifyBackgroundScript('activity-status', {
            isActive: this.isActive,
            lastActivityTime: this.lastActivityTime,
            timeSinceLastActivity: timeSinceLastActivity
        });
    }

    notifyBackgroundScript(type, data = {}) {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
            return; // Extension context invalidated, don't send message
        }

        try {
            chrome.runtime.sendMessage({
                action: 'contentScript',
                type: type,
                data: data,
                url: window.location.href,
                domain: window.location.hostname,
                timestamp: Date.now()
            }).catch(error => {
                // Handle promise rejection silently - extension might be reloading
                if (error.message.includes('Receiving end does not exist')) {
                    // Background script not ready yet, this is normal during extension reload
                    return;
                }
                console.log('Message to background script failed:', error.message);
            });
        } catch (error) {
            // Extension might be reloading, ignore error
            console.log('Could not send message to background script:', error.message);
        }
    }

    destroy() {
        // Clean up event listeners and timers
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
        }

        this.activityEvents.forEach(eventType => {
            document.removeEventListener(eventType, this.recordActivity);
        });
    }
}

// Initialize activity detector when page loads
let activityDetector = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            activityDetector = new ActivityDetector();
        } catch (error) {
            console.error('Failed to initialize MindfulPing activity detector:', error);
        }
    });
} else {
    try {
        activityDetector = new ActivityDetector();
    } catch (error) {
        console.error('Failed to initialize MindfulPing activity detector:', error);
    }
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    if (activityDetector) {
        activityDetector.destroy();
    }
});
