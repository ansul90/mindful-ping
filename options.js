// Options page script for ScreenTime extension

class OptionsPage {
    constructor() {
        this.enableToggle = document.getElementById('enableToggle');
        this.intervalSlider = document.getElementById('intervalSlider');
        this.sliderValue = document.getElementById('sliderValue');
        this.trackInactiveToggle = document.getElementById('trackInactiveToggle');
        this.inactivitySlider = document.getElementById('inactivitySlider');
        this.inactivitySliderValue = document.getElementById('inactivitySliderValue');

        // Time limits elements
        this.timeLimitToggle = document.getElementById('timeLimitToggle');
        this.timeLimitsContainer = document.getElementById('timeLimitsContainer');
        this.limitDomainInput = document.getElementById('limitDomainInput');
        this.limitMinutesInput = document.getElementById('limitMinutesInput');
        this.addLimitBtn = document.getElementById('addLimitBtn');
        this.limitsList = document.getElementById('limitsList');
        this.noLimitsMessage = document.getElementById('noLimitsMessage');

        // Data management elements
        this.retentionSlider = document.getElementById('retentionSlider');
        this.retentionSliderValue = document.getElementById('retentionSliderValue');
        this.exportStartDate = document.getElementById('exportStartDate');
        this.exportEndDate = document.getElementById('exportEndDate');
        this.exportDataBtn = document.getElementById('exportDataBtn');
        this.cleanupDataBtn = document.getElementById('cleanupDataBtn');
        this.clearAllDataBtn = document.getElementById('clearAllDataBtn');

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

        // Time limits data
        this.dailyTimeLimits = {};

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
            const storageResult = await chrome.storage.sync.get([
                'trackInactiveTime', 'inactivityThreshold', 'dailyTimeLimits',
                'timeLimitEnabled', 'dataRetentionDays'
            ]);

            if (response) {
                this.enableToggle.checked = response.enabled;
                this.intervalSlider.value = Math.round(response.interval / 60) || 10; // Convert seconds to minutes
                this.updateSliderValue();
            }

            // Load activity settings
            this.trackInactiveToggle.checked = storageResult.trackInactiveTime || false;
            this.inactivitySlider.value = storageResult.inactivityThreshold || 5;
            this.updateInactivitySliderValue();

            // Load time limits settings
            this.timeLimitToggle.checked = storageResult.timeLimitEnabled || false;
            this.dailyTimeLimits = storageResult.dailyTimeLimits || {};
            this.updateTimeLimitsDisplay();
            this.toggleTimeLimitsContainer();

            // Load data management settings
            this.retentionSlider.value = storageResult.dataRetentionDays || 30;
            this.updateRetentionSliderValue();

            // Set default export dates (last 30 days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            this.exportEndDate.value = endDate.toISOString().split('T')[0];
            this.exportStartDate.value = startDate.toISOString().split('T')[0];

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

        // Time limits
        this.timeLimitToggle.addEventListener('change', () => {
            this.toggleTimeLimitsContainer();
            this.saveSettings();
        });

        this.addLimitBtn.addEventListener('click', () => {
            this.addTimeLimit();
        });

        this.limitDomainInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTimeLimit();
            }
        });

        this.limitMinutesInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTimeLimit();
            }
        });

        // Data management
        this.retentionSlider.addEventListener('input', () => {
            this.updateRetentionSliderValue();
        });

        this.exportDataBtn.addEventListener('click', () => {
            this.exportData();
        });

        this.cleanupDataBtn.addEventListener('click', () => {
            this.cleanupOldData();
        });

        this.clearAllDataBtn.addEventListener('click', () => {
            this.clearAllData();
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
            const timeLimitEnabled = this.timeLimitToggle.checked;
            const dataRetentionDays = parseInt(this.retentionSlider.value);

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

            // Save time limits settings
            await chrome.runtime.sendMessage({
                action: 'updateTimeLimits',
                dailyTimeLimits: this.dailyTimeLimits,
                timeLimitEnabled: timeLimitEnabled
            });

            // Save data management settings
            await chrome.runtime.sendMessage({
                action: 'updateDataSettings',
                dataRetentionDays: dataRetentionDays
            });

            // Show success message
            this.showSavedMessage();

            console.log(`Settings saved: ${enabled ? 'enabled' : 'disabled'}, interval: ${interval} minutes, trackInactive: ${trackInactiveTime}, threshold: ${inactivityThreshold} minutes, timeLimits: ${timeLimitEnabled}, retention: ${dataRetentionDays} days`);
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

    // Time limits methods
    updateRetentionSliderValue() {
        const days = parseInt(this.retentionSlider.value);
        this.retentionSliderValue.textContent = `${days} day${days !== 1 ? 's' : ''}`;
    }

    toggleTimeLimitsContainer() {
        if (this.timeLimitToggle.checked) {
            this.timeLimitsContainer.style.display = 'block';
        } else {
            this.timeLimitsContainer.style.display = 'none';
        }
    }

    addTimeLimit() {
        const domain = this.limitDomainInput.value.trim().toLowerCase();
        const minutes = parseInt(this.limitMinutesInput.value);

        if (!domain || !minutes || minutes < 1) {
            this.showTemporaryMessage('Please enter a valid domain and time limit');
            return;
        }

        // Clean domain (remove protocol, www, etc.)
        const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');

        this.dailyTimeLimits[cleanDomain] = minutes;
        this.updateTimeLimitsDisplay();
        this.saveSettings();

        // Clear inputs
        this.limitDomainInput.value = '';
        this.limitMinutesInput.value = '';

        this.showTemporaryMessage(`Time limit set for ${cleanDomain}: ${minutes} minutes/day`);
    }

    removeTimeLimit(domain) {
        delete this.dailyTimeLimits[domain];
        this.updateTimeLimitsDisplay();
        this.saveSettings();
        this.showTemporaryMessage(`Time limit removed for ${domain}`);
    }

    updateTimeLimitsDisplay() {
        const domains = Object.keys(this.dailyTimeLimits);

        if (domains.length === 0) {
            this.noLimitsMessage.style.display = 'block';
            this.limitsList.innerHTML = '';
            return;
        }

        this.noLimitsMessage.style.display = 'none';

        let html = '';
        domains.sort().forEach(domain => {
            const minutes = this.dailyTimeLimits[domain];
            html += `
                <div class="limit-item">
                    <div class="limit-info">
                        <div class="limit-domain">${domain}</div>
                        <div class="limit-time">${minutes} minute${minutes !== 1 ? 's' : ''} per day</div>
                    </div>
                    <button class="limit-remove" onclick="optionsPage.removeTimeLimit('${domain}')">Remove</button>
                </div>
            `;
        });

        this.limitsList.innerHTML = html;
    }

    // Data management methods
    async exportData() {
        try {
            const startDate = this.exportStartDate.value;
            const endDate = this.exportEndDate.value;

            if (!startDate || !endDate) {
                this.showTemporaryMessage('Please select both start and end dates');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                this.showTemporaryMessage('Start date cannot be after end date');
                return;
            }

            this.exportDataBtn.disabled = true;
            this.exportDataBtn.textContent = '⏳ Exporting...';

            const response = await chrome.runtime.sendMessage({
                action: 'exportData',
                startDate: startDate,
                endDate: endDate
            });

            if (response.success) {
                // Create and download CSV file
                const blob = new Blob([response.data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `mindfulping-data-${startDate}-to-${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                this.showTemporaryMessage('Data exported successfully!');
            } else {
                this.showTemporaryMessage('Error exporting data: ' + response.error);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showTemporaryMessage('Error exporting data');
        } finally {
            this.exportDataBtn.disabled = false;
            this.exportDataBtn.textContent = '📊 Export CSV';
        }
    }

    async cleanupOldData() {
        try {
            this.cleanupDataBtn.disabled = true;
            this.cleanupDataBtn.textContent = '⏳ Cleaning...';

            const response = await chrome.runtime.sendMessage({
                action: 'updateDataSettings',
                dataRetentionDays: parseInt(this.retentionSlider.value),
                cleanupOldData: true
            });

            if (response.success) {
                this.showTemporaryMessage('Old data cleaned up successfully!');
                // Refresh stats display
                await this.loadStats();
            } else {
                this.showTemporaryMessage('Error cleaning up data');
            }
        } catch (error) {
            console.error('Error cleaning up data:', error);
            this.showTemporaryMessage('Error cleaning up data');
        } finally {
            this.cleanupDataBtn.disabled = false;
            this.cleanupDataBtn.textContent = '🧹 Clean Old Data';
        }
    }

    async clearAllData() {
        if (!confirm('Are you sure you want to clear ALL browsing data? This action cannot be undone.')) {
            return;
        }

        try {
            this.clearAllDataBtn.disabled = true;
            this.clearAllDataBtn.textContent = '⏳ Clearing...';

            const response = await chrome.runtime.sendMessage({
                action: 'clearAllData'
            });

            if (response.success) {
                this.showTemporaryMessage('All data cleared successfully!');
                // Refresh stats display
                await this.loadStats();
            } else {
                this.showTemporaryMessage('Error clearing data');
            }
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showTemporaryMessage('Error clearing data');
        } finally {
            this.clearAllDataBtn.disabled = false;
            this.clearAllDataBtn.textContent = '🗑️ Clear All Data';
        }
    }
}

// Make optionsPage globally accessible for onclick handlers
let optionsPage;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    optionsPage = new OptionsPage();
});
