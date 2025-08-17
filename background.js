// Mindful Ping - Tab-specific notification service for mindful browsing

let isEnabled = true;
let notificationInterval = 600; // Default 600 seconds (10 minutes)
let isWindowFocused = true;
let currentTabId = null;
let tabStartTime = null;
let tabTimers = new Map(); // Store timers for each tab

// Activity detection settings
let trackInactiveTime = false; // Default: don't track when user is inactive
let inactivityThreshold = 5; // Default: 5 minutes
let tabActivityStatus = new Map(); // Store activity status for each tab
let pausedTabs = new Set(); // Track which tabs are paused due to inactivity

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Mindful Ping extension installed');

  // Load saved settings or set defaults
  const result = await chrome.storage.sync.get(['notificationInterval', 'trackInactiveTime', 'inactivityThreshold']);

  if (result.notificationInterval) {
    notificationInterval = result.notificationInterval;
  } else {
    // Set default interval (10 minutes)
    await chrome.storage.sync.set({ notificationInterval: 600 });
  }

  if (result.trackInactiveTime !== undefined) {
    trackInactiveTime = result.trackInactiveTime;
  } else {
    await chrome.storage.sync.set({ trackInactiveTime: false });
  }

  if (result.inactivityThreshold) {
    inactivityThreshold = result.inactivityThreshold;
  } else {
    await chrome.storage.sync.set({ inactivityThreshold: 5 });
  }

  // Check notification permission
  const permission = await chrome.notifications.getPermissionLevel();
  console.log('Notification permission level:', permission);

  if (permission === 'granted') {
    initializeTabTracking();
  } else {
    console.log('Notification permission not granted');
  }
});

// Start tab tracking when extension starts
chrome.runtime.onStartup.addListener(() => {
  console.log('Mindful Ping extension started');
  initializeTabTracking();
});

// Track tab activation (switching between tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabSwitch(activeInfo.tabId);
});

// Track tab updates (URL changes in current tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    handleTabSwitch(tabId);
  }
});

// Track window focus to pause notifications when browser is inactive
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus - stop timing current tab
    isWindowFocused = false;
    stopTimingCurrentTab();
    console.log('Browser window lost focus - pausing tab timing');
  } else {
    // Browser gained focus - resume timing current tab
    isWindowFocused = true;
    console.log('Browser window gained focus - resuming tab timing');
    // Get current active tab and resume timing
    chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
      if (tabs.length > 0) {
        handleTabSwitch(tabs[0].id);
      }
    });
  }
});

// Initialize tab tracking
function initializeTabTracking() {
  if (!isEnabled) return;

  // Get currently active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      handleTabSwitch(tabs[0].id);
    }
  });
}

// Handle tab switch - stop timing previous tab, start timing new tab
function handleTabSwitch(tabId) {
  if (!isEnabled || !isWindowFocused) return;

  // Stop timing the previous tab
  stopTimingCurrentTab();

  // Start timing the new tab
  startTimingTab(tabId);

  // Update activity settings for the new tab's content script (with delay to allow content script to load)
  setTimeout(() => {
    updateTabActivitySettings(tabId);
  }, 500);
}

// Start timing a specific tab
function startTimingTab(tabId) {
  currentTabId = tabId;
  tabStartTime = Date.now();

  // Clear any existing timer for this tab
  if (tabTimers.has(tabId)) {
    clearTimeout(tabTimers.get(tabId));
  }

  // Get tab URL for logging
  chrome.tabs.get(tabId, (tab) => {
    const domain = tab.url ? extractDomain(tab.url) : 'unknown';
    console.log(`Started timing tab ${tabId} (${domain})`);

    // Set timer for this tab
    const timerId = setTimeout(() => {
      showNotificationForTab(tabId, domain);
    }, notificationInterval * 1000);

    tabTimers.set(tabId, timerId);
  });
}

// Stop timing the current tab
function stopTimingCurrentTab() {
  if (currentTabId && tabTimers.has(currentTabId)) {
    clearTimeout(tabTimers.get(currentTabId));
    tabTimers.delete(currentTabId);

    chrome.tabs.get(currentTabId, async (tab) => {
      if (chrome.runtime.lastError) {
        console.log(`Stopped timing tab ${currentTabId} (tab closed)`);
      } else {
        const domain = tab.url ? extractDomain(tab.url) : 'unknown';
        const timeSpent = tabStartTime ? Math.round((Date.now() - tabStartTime) / 1000) : 0;
        console.log(`Stopped timing tab ${currentTabId} (${domain}) after ${timeSpent}s`);

        // Save the time spent to storage
        if (timeSpent > 5) { // Only save if spent more than 5 seconds
          await saveTimeToStorage(domain, timeSpent);
        }
      }
    });
  }

  currentTabId = null;
  tabStartTime = null;
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url;
  }
}

// Save time spent to storage
async function saveTimeToStorage(domain, timeSpent) {
  try {
    const now = new Date();
    const today = now.toDateString(); // e.g., "Mon Jan 01 2024"
    const currentHour = now.getHours();

    // Keys for different storage types
    const dailyKey = `daily_${today}`;
    const hourlyKey = `hourly_${today}`;

    // Get existing data
    const result = await chrome.storage.local.get([dailyKey, hourlyKey]);
    const todayData = result[dailyKey] || {};
    const hourlyData = result[hourlyKey] || {};

    // Initialize if needed
    if (!hourlyData[domain]) {
      hourlyData[domain] = {};
    }

    // Add time to domain total
    if (!todayData[domain]) {
      todayData[domain] = 0;
    }
    todayData[domain] += timeSpent;

    // Add time to hourly breakdown
    if (!hourlyData[domain][currentHour]) {
      hourlyData[domain][currentHour] = 0;
    }
    hourlyData[domain][currentHour] += timeSpent;

    // Save back to storage
    await chrome.storage.local.set({
      [dailyKey]: todayData,
      [hourlyKey]: hourlyData
    });

    console.log(`Saved ${timeSpent}s for ${domain} (total today: ${todayData[domain]}s)`);
  } catch (error) {
    console.error('Error saving time to storage:', error);
  }
}

// Get today's statistics
async function getTodayStatistics() {
  try {
    const today = new Date().toDateString();
    const dailyKey = `daily_${today}`;
    const hourlyKey = `hourly_${today}`;

    const result = await chrome.storage.local.get([dailyKey, hourlyKey]);
    return {
      daily: result[dailyKey] || {},
      hourly: result[hourlyKey] || {}
    };
  } catch (error) {
    console.error('Error getting today\'s statistics:', error);
    return { daily: {}, hourly: {} };
  }
}

// Show notification for a specific tab
function showNotificationForTab(tabId, domain) {
  const notificationId = `tab-${tabId}-${Date.now()}`;
  const minutes = Math.round(notificationInterval / 60 * 10) / 10; // Round to 1 decimal

  chrome.notifications.create(notificationId, {
    type: 'basic',
    iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    title: `Mindful Ping 🧠`,
    message: `You've been browsing ${domain} for ${minutes} minute${minutes !== 1 ? 's' : ''}. Time for a mindful break? ✨`
  });

  console.log(`Notification shown for tab ${tabId} (${domain})`);

  // Auto-clear notification after 5 seconds
  setTimeout(() => {
    chrome.notifications.clear(notificationId);
  }, 5000);

  // Save the full session time to storage
  saveTimeToStorage(domain, notificationInterval);

  // Remove this tab's timer since notification was shown
  tabTimers.delete(tabId);

  // If this is still the current tab, restart the timer
  if (tabId === currentTabId && isEnabled && isWindowFocused) {
    console.log(`Restarting timer for tab ${tabId} (${domain})`);
    startTimingTab(tabId);
  }
}

// Handle messages from popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    isEnabled = request.enabled;

    if (isEnabled) {
      initializeTabTracking();
      sendResponse({ success: true, status: 'enabled' });
    } else {
      stopTimingCurrentTab();
      // Clear all timers
      tabTimers.forEach((timerId) => clearTimeout(timerId));
      tabTimers.clear();
      sendResponse({ success: true, status: 'disabled' });
    }
    return true;
  }

  if (request.action === 'getStatus') {
    const activityStatus = currentTabId ? tabActivityStatus.get(currentTabId) : null;
    sendResponse({
      enabled: isEnabled,
      interval: notificationInterval,
      currentTab: currentTabId,
      windowFocused: isWindowFocused,
      trackInactiveTime: trackInactiveTime,
      inactivityThreshold: inactivityThreshold,
      activityStatus: activityStatus,
      isPaused: currentTabId ? pausedTabs.has(currentTabId) : false
    });
    return true;
  }

  if (request.action === 'setInterval') {
    notificationInterval = request.interval;
    chrome.storage.sync.set({ notificationInterval: notificationInterval });

    // Restart timing for current tab with new interval
    if (isEnabled && currentTabId) {
      stopTimingCurrentTab();
      startTimingTab(currentTabId);
    }

    sendResponse({ success: true, interval: notificationInterval });
    return true;
  }

  if (request.action === 'testNotification') {
    if (currentTabId) {
      chrome.tabs.get(currentTabId, (tab) => {
        const domain = tab.url ? extractDomain(tab.url) : 'current tab';
        showNotificationForTab(currentTabId, domain);
      });
    } else {
      // Show generic test notification
      chrome.notifications.create('test-notification', {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        title: 'Mindful Ping Test 🧪',
        message: 'Test successful! Mindful browsing reminders are working. ✨'
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getTodayStats') {
    getTodayStatistics().then((stats) => {
      sendResponse({ success: true, stats: stats });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.action === 'getStatsForDate') {
    try {
      const date = new Date(request.date);
      const dateString = date.toDateString();
      const dailyKey = `daily_${dateString}`;
      const hourlyKey = `hourly_${dateString}`;

      chrome.storage.local.get([dailyKey, hourlyKey], (result) => {
        sendResponse({
          success: true,
          stats: {
            daily: result[dailyKey] || {},
            hourly: result[hourlyKey] || {}
          }
        });
      });
      return true;
    } catch (error) {
      sendResponse({ success: false, error: error.message });
      return true;
    }
  }

  if (request.action === 'contentScript') {
    handleContentScriptMessage(request, sender);
    return true;
  }

  if (request.action === 'updateActivitySettings') {
    trackInactiveTime = request.trackInactiveTime;
    inactivityThreshold = request.inactivityThreshold;

    chrome.storage.sync.set({
      trackInactiveTime: trackInactiveTime,
      inactivityThreshold: inactivityThreshold
    });

    // Update all tabs with new settings
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        // Only update tabs that can run content scripts (skip chrome://, moz-extension://, etc.)
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') && !tab.url.startsWith('moz-extension://')) {
          updateTabActivitySettings(tab.id);
        }
      });
    });

    sendResponse({ success: true });
    return true;
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  chrome.notifications.clear(notificationId);
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabTimers.has(tabId)) {
    clearTimeout(tabTimers.get(tabId));
    tabTimers.delete(tabId);
    console.log(`Cleaned up timer for closed tab ${tabId}`);
  }

  if (currentTabId === tabId) {
    currentTabId = null;
    tabStartTime = null;
  }
});

// Activity detection functions
function handleContentScriptMessage(request, sender) {
  try {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    const { type, data } = request;

    switch (type) {
      case 'user-active':
        handleUserActive(tabId);
        break;

      case 'user-inactive':
        handleUserInactive(tabId, data?.inactiveDuration);
        break;

      case 'activity-status':
        updateTabActivityStatus(tabId, data);
        break;

      case 'page-focus':
      case 'page-visible':
        handleTabActive(tabId);
        break;

      case 'page-blur':
      case 'page-hidden':
        if (!trackInactiveTime) {
          handleTabInactive(tabId);
        }
        break;
    }
  } catch (error) {
    console.error('Error handling content script message:', error);
  }
}

function handleUserActive(tabId) {
  try {
    if (pausedTabs.has(tabId) && tabId === currentTabId) {
      console.log(`User became active on tab ${tabId}, resuming timing`);
      pausedTabs.delete(tabId);

      // Resume timing if this is the current tab
      if (!trackInactiveTime && isEnabled && isWindowFocused) {
        startTimingTab(tabId);
      }
    }
  } catch (error) {
    console.error('Error handling user active event:', error);
  }
}

function handleUserInactive(tabId, inactiveDuration) {
  try {
    if (!trackInactiveTime && tabId === currentTabId && inactiveDuration) {
      console.log(`User inactive on tab ${tabId} for ${Math.round(inactiveDuration / 1000 / 60)} minutes, pausing timing`);
      pausedTabs.add(tabId);

      // Pause timing for this tab
      stopTimingCurrentTab();
    }
  } catch (error) {
    console.error('Error handling user inactive event:', error);
  }
}

function handleTabActive(tabId) {
  if (pausedTabs.has(tabId)) {
    pausedTabs.delete(tabId);
  }
}

function handleTabInactive(tabId) {
  if (!trackInactiveTime) {
    pausedTabs.add(tabId);
    if (tabId === currentTabId) {
      stopTimingCurrentTab();
    }
  }
}

function updateTabActivityStatus(tabId, status) {
  tabActivityStatus.set(tabId, {
    isActive: status.isActive,
    lastActivityTime: status.lastActivityTime,
    timeSinceLastActivity: status.timeSinceLastActivity,
    timestamp: Date.now()
  });
}

function updateTabActivitySettings(tabId) {
  try {
    chrome.tabs.sendMessage(tabId, {
      action: 'updateActivitySettings',
      trackInactiveTime: trackInactiveTime,
      inactivityThreshold: inactivityThreshold
    }).catch(error => {
      // Tab might not have content script loaded yet, or might be a special page
      if (!error.message.includes('Receiving end does not exist')) {
        console.log(`Could not update activity settings for tab ${tabId}:`, error.message);
      }
    });
  } catch (error) {
    // Tab might not have content script loaded yet, ignore
    console.log(`Failed to send activity settings to tab ${tabId}:`, error.message);
  }
}

// Clean up activity data when tabs are removed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabActivityStatus.delete(tabId);
  pausedTabs.delete(tabId);
});

console.log('Mindful Ping background script loaded');