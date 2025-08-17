// Mindful Ping - Simplified popup for tab-based mindful browsing notifications

class TabPopup {
  constructor() {
    this.toggleBtn = document.getElementById('toggleBtn');
    this.testBtn = document.getElementById('testBtn');
    this.optionsBtn = document.getElementById('optionsBtn');
    this.statusText = document.getElementById('statusText');
    this.intervalText = document.getElementById('intervalText');
    this.currentDomain = document.getElementById('currentDomain');
    this.todayStats = document.getElementById('todayStats');
    this.messageDiv = document.getElementById('message');

    this.init();
  }

  async init() {
    // Get current status
    await this.updateStatus();

    // Set up event listeners
    this.setupEventListeners();

    // Load today's statistics
    await this.updateTodayStats();

    // Update status every 2 seconds
    setInterval(() => {
      this.updateStatus();
      this.updateTodayStats();
    }, 2000);
  }

  setupEventListeners() {
    // Toggle enable/disable
    this.toggleBtn.addEventListener('click', () => {
      this.toggleNotifications();
    });

    // Test notification button
    this.testBtn.addEventListener('click', () => {
      this.testNotification();
    });

    // Options button
    this.optionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  async updateStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getStatus' });

      if (response) {
        // Update UI elements
        this.updateToggleButton(response.enabled);

        // Update interval display
        const minutes = Math.round(response.interval / 60);
        this.intervalText.textContent = `${minutes} min`;

        // Update status text
        this.statusText.textContent = response.enabled ? 'Enabled' : 'Disabled';

        // Update current tab info
        if (response.currentTab && response.windowFocused) {
          try {
            const tab = await chrome.tabs.get(response.currentTab);
            const domain = this.extractDomain(tab.url);
            this.currentDomain.textContent = domain || 'Unknown site';
          } catch (error) {
            this.currentDomain.textContent = 'No active tab';
          }
        } else if (!response.windowFocused) {
          this.currentDomain.textContent = 'Browser inactive';
        } else {
          this.currentDomain.textContent = 'No active tab';
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      this.statusText.textContent = 'Error';
      this.currentDomain.textContent = 'Error loading';
    }
  }

  updateToggleButton(enabled) {
    this.toggleBtn.classList.remove('enabled', 'disabled');

    if (enabled) {
      this.toggleBtn.classList.add('enabled');
      this.toggleBtn.textContent = '✅ Notifications ON';
    } else {
      this.toggleBtn.classList.add('disabled');
      this.toggleBtn.textContent = '❌ Notifications OFF';
    }
  }

  async toggleNotifications() {
    try {
      // Get current status first
      const statusResponse = await chrome.runtime.sendMessage({ action: 'getStatus' });
      const newState = !statusResponse.enabled;

      const response = await chrome.runtime.sendMessage({
        action: 'toggle',
        enabled: newState
      });

      if (response.success) {
        this.updateToggleButton(newState);
        this.showMessage(`Notifications ${newState ? 'enabled' : 'disabled'}!`);
        this.statusText.textContent = newState ? 'Enabled' : 'Disabled';
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      this.showMessage('Error updating settings');
    }
  }

  async testNotification() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'testNotification' });
      if (response.success) {
        this.showMessage('Test notification sent!');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      this.showMessage('Error sending test notification');
    }
  }

  async updateTodayStats() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getTodayStats' });

      if (response.success) {
        this.displayStats(response.stats);
      } else {
        this.todayStats.innerHTML = '<div class="no-stats">Error loading statistics</div>';
      }
    } catch (error) {
      console.error('Error updating today\'s stats:', error);
      this.todayStats.innerHTML = '<div class="no-stats">Error loading statistics</div>';
    }
  }

  displayStats(stats) {
    // Handle new data structure
    const dailyStats = stats.daily || stats; // Support both new and old format

    if (!dailyStats || Object.keys(dailyStats).length === 0) {
      this.todayStats.innerHTML = '<div class="no-stats">No browsing time recorded today</div>';
      return;
    }

    // Sort domains by time spent (descending)
    const sortedDomains = Object.entries(dailyStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8); // Show top 8 sites

    let html = '';
    for (const [domain, seconds] of sortedDomains) {
      const timeText = this.formatTime(seconds);
      html += `
        <div class="stat-item">
          <div class="stat-domain" title="${domain}">${domain}</div>
          <div class="stat-time">${timeText}</div>
        </div>
      `;
    }

    this.todayStats.innerHTML = html;
  }

  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
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

  showMessage(text) {
    this.messageDiv.textContent = text;
    this.messageDiv.style.display = 'block';

    // Hide message after 3 seconds
    setTimeout(() => {
      this.messageDiv.style.display = 'none';
    }, 3000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TabPopup();
});