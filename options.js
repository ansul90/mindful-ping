// Options page script for ScreenTime extension

class OptionsPage {
    constructor() {
        this.enableToggle = document.getElementById('enableToggle');
        this.intervalSlider = document.getElementById('intervalSlider');
        this.sliderValue = document.getElementById('sliderValue');
        this.trackInactiveToggle = document.getElementById('trackInactiveToggle');
        this.inactivitySlider = document.getElementById('inactivitySlider');
        this.inactivitySliderValue = document.getElementById('inactivitySliderValue');
        this.saveBtn = document.getElementById('saveBtn');
        this.testBtn = document.getElementById('testBtn');
        this.savedMessage = document.getElementById('savedMessage');
        this.currentStatus = document.getElementById('currentStatus');
        this.activeTab = document.getElementById('activeTab');

        // Stats elements
        this.currentDateElement = document.getElementById('currentDate');
        this.totalTimeElement = document.getElementById('totalTime');
        this.topSitesElement = document.getElementById('topSites');
        this.hourlyChartElement = document.getElementById('hourlyChart');
        this.noHourlyDataElement = document.getElementById('noHourlyData');
        this.prevDayButton = document.getElementById('prevDay');
        this.nextDayButton = document.getElementById('nextDay');

        // Date handling for stats
        this.currentDate = new Date();
        this.currentDate.setHours(0, 0, 0, 0);

        this.init();
    }

    async init() {
        // Load current settings
        await this.loadSettings();

        // Set up event listeners
        this.setupEventListeners();

        // Update status periodically
        this.updateStatus();
        setInterval(() => this.updateStatus(), 2000);

        // Load and display stats
        await this.loadStats();
        this.updateDateDisplay();
    }

    async loadSettings() {
        try {
            // Get settings from background script and storage
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
            const storageResult = await chrome.storage.sync.get(['trackInactiveTime', 'inactivityThreshold']);

            if (response) {
                this.enableToggle.checked = response.enabled;
                this.intervalSlider.value = Math.round(response.interval / 60) || 10; // Convert seconds to minutes
                this.updateSliderValue();
            }

            // Load activity settings
            this.trackInactiveToggle.checked = storageResult.trackInactiveTime || false;
            this.inactivitySlider.value = storageResult.inactivityThreshold || 5;
            this.updateInactivitySliderValue();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupEventListeners() {
        // Slider value updates
        this.intervalSlider.addEventListener('input', () => {
            this.updateSliderValue();
        });

        this.inactivitySlider.addEventListener('input', () => {
            this.updateInactivitySliderValue();
        });

        // Save button
        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Test button
        this.testBtn.addEventListener('click', () => {
            this.testNotification();
        });

        // Enable toggle
        this.enableToggle.addEventListener('change', () => {
            this.saveSettings();
        });

        // Activity toggle
        this.trackInactiveToggle.addEventListener('change', () => {
            this.saveSettings();
        });

        // Stats navigation
        this.prevDayButton.addEventListener('click', () => {
            this.changeDate(-1);
        });

        this.nextDayButton.addEventListener('click', () => {
            this.changeDate(1);
        });
    }

    updateSliderValue() {
        const minutes = parseInt(this.intervalSlider.value);
        let displayText;

        if (minutes < 60) {
            displayText = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMins = minutes % 60;
            if (remainingMins === 0) {
                displayText = `${hours} hour${hours !== 1 ? 's' : ''}`;
            } else {
                displayText = `${hours}h ${remainingMins}m`;
            }
        }

        this.sliderValue.textContent = displayText;
    }

    updateInactivitySliderValue() {
        const minutes = parseInt(this.inactivitySlider.value);
        this.inactivitySliderValue.textContent = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    async saveSettings() {
        try {
            const interval = parseInt(this.intervalSlider.value);
            const enabled = this.enableToggle.checked;
            const trackInactiveTime = this.trackInactiveToggle.checked;
            const inactivityThreshold = parseInt(this.inactivitySlider.value);

            // Convert minutes to seconds for background script
            const intervalInSeconds = interval * 60;

            // Save to background script
            await chrome.runtime.sendMessage({
                action: 'setInterval',
                interval: intervalInSeconds
            });

            await chrome.runtime.sendMessage({
                action: 'toggle',
                enabled: enabled
            });

            // Save activity settings
            await chrome.runtime.sendMessage({
                action: 'updateActivitySettings',
                trackInactiveTime: trackInactiveTime,
                inactivityThreshold: inactivityThreshold
            });

            // Show success message
            this.showSavedMessage();

            console.log(`Settings saved: ${enabled ? 'enabled' : 'disabled'}, interval: ${interval} minutes, trackInactive: ${trackInactiveTime}, threshold: ${inactivityThreshold} minutes`);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async testNotification() {
        try {
            await chrome.runtime.sendMessage({ action: 'testNotification' });
            this.showTemporaryMessage('Test notification sent!');
        } catch (error) {
            console.error('Error testing notification:', error);
            this.showTemporaryMessage('Error sending test notification');
        }
    }

    async updateStatus() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

            if (response) {
                // Update status text
                const statusText = response.enabled ?
                    `Enabled (${Math.round(response.interval / 60)} min intervals)` :
                    'Disabled';
                this.currentStatus.textContent = statusText;

                // Update active tab info
                if (response.currentTab) {
                    try {
                        const tab = await chrome.tabs.get(response.currentTab);
                        const domain = this.extractDomain(tab.url);
                        this.activeTab.textContent = domain || 'Unknown';
                    } catch (error) {
                        this.activeTab.textContent = 'None';
                    }
                } else {
                    this.activeTab.textContent = 'None';
                }
            }
        } catch (error) {
            this.currentStatus.textContent = 'Error loading status';
            this.activeTab.textContent = 'Error';
        }
    }

    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (error) {
            return url;
        }
    }

    showSavedMessage() {
        this.savedMessage.style.display = 'block';
        setTimeout(() => {
            this.savedMessage.style.display = 'none';
        }, 3000);
    }

    showTemporaryMessage(text) {
        const originalText = this.savedMessage.textContent;
        this.savedMessage.textContent = text;
        this.savedMessage.style.display = 'block';

        setTimeout(() => {
            this.savedMessage.textContent = originalText;
            this.savedMessage.style.display = 'none';
        }, 2000);
    }

    // Stats functionality
    async changeDate(dayOffset) {
        this.currentDate.setDate(this.currentDate.getDate() + dayOffset);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.nextDayButton.disabled = this.currentDate >= today;

        this.updateDateDisplay();
        await this.loadStats();
    }

    updateDateDisplay() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.currentDate.getTime() === today.getTime()) {
            this.currentDateElement.textContent = 'Today';
        } else if (this.currentDate.getTime() === yesterday.getTime()) {
            this.currentDateElement.textContent = 'Yesterday';
        } else {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            this.currentDateElement.textContent = this.currentDate.toLocaleDateString(undefined, options);
        }

        const today2 = new Date();
        today2.setHours(0, 0, 0, 0);
        this.nextDayButton.disabled = this.currentDate >= today2;
    }

    async loadStats() {
        try {
            const stats = await this.getStatsForDate(this.currentDate);
            this.displayTotalTime(stats);
            this.displayTopSites(stats);
            this.displayHourlyChart(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Error loading statistics');
        }
    }

    async getStatsForDate(date) {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getStatsForDate',
                    date: date.toISOString()
                }, (response) => {
                    if (response && response.success) {
                        resolve(response.stats);
                    } else {
                        console.error('Error retrieving stats:', response?.error || 'Unknown error');
                        resolve({ daily: {}, hourly: {} });
                    }
                });
            });
        } catch (error) {
            console.error('Error retrieving stats from storage:', error);
            return { daily: {}, hourly: {} };
        }
    }

    displayTotalTime(stats) {
        const dailyStats = stats.daily || {};
        const totalSeconds = Object.values(dailyStats).reduce((sum, seconds) => sum + seconds, 0);
        this.totalTimeElement.textContent = this.formatTime(totalSeconds);

        if (totalSeconds === 0) {
            this.topSitesElement.innerHTML = '<div class="no-data">No browsing data recorded for this day</div>';
        }
    }

    displayTopSites(stats) {
        const dailyStats = stats.daily || {};

        if (Object.keys(dailyStats).length === 0) {
            this.topSitesElement.innerHTML = '<div class="no-data">No browsing data recorded for this day</div>';
            return;
        }

        const sortedDomains = Object.entries(dailyStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        const totalSeconds = sortedDomains.reduce((sum, [, seconds]) => sum + seconds, 0);

        let html = '';
        for (const [domain, seconds] of sortedDomains) {
            const percentage = Math.round((seconds / totalSeconds) * 100);
            const timeText = this.formatTime(seconds);

            html += `
                <div class="stat-item">
                    <div class="stat-domain" title="${domain}">${domain}</div>
                    <div class="stat-time">${timeText}</div>
                    <div class="stat-percentage">${percentage}%</div>
                </div>
            `;
        }

        this.topSitesElement.innerHTML = html;
    }

    displayHourlyChart(stats) {
        this.noHourlyDataElement.style.display = 'none';
        this.hourlyChartElement.innerHTML = '';

        const hourlyStats = stats.hourly || {};

        if (Object.keys(hourlyStats).length === 0) {
            this.noHourlyDataElement.style.display = 'flex';
            return;
        }

        const hourlyData = this.processHourlyData(hourlyStats);
        const maxValue = Math.max(...Object.values(hourlyData));

        for (let hour = 0; hour < 24; hour++) {
            const seconds = hourlyData[hour] || 0;
            const percentage = maxValue > 0 ? (seconds / maxValue) * 100 : 0;

            const barContainer = document.createElement('div');
            barContainer.className = 'bar-container';

            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${percentage}%`;
            bar.title = `${this.formatTime(seconds)} at ${hour}:00`;

            const label = document.createElement('div');
            label.className = 'bar-label';
            label.textContent = `${hour}:00`;

            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            this.hourlyChartElement.appendChild(barContainer);
        }
    }

    processHourlyData(hourlyStats) {
        const hourlyData = {};

        for (let hour = 0; hour < 24; hour++) {
            hourlyData[hour] = 0;
        }

        Object.values(hourlyStats).forEach(domainHours => {
            Object.entries(domainHours).forEach(([hour, seconds]) => {
                const hourNum = parseInt(hour, 10);
                if (!isNaN(hourNum) && hourNum >= 0 && hourNum < 24) {
                    hourlyData[hourNum] += seconds;
                }
            });
        });

        return hourlyData;
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
        }
    }

    showError(message) {
        this.totalTimeElement.textContent = 'Error';
        this.topSitesElement.innerHTML = `<div class="no-data">${message}</div>`;
        this.noHourlyDataElement.style.display = 'flex';
        this.noHourlyDataElement.textContent = message;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsPage();
});
