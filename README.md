# ScreenTime Tracker Chrome Extension

A Chrome extension that tracks time spent on each website and sends configurable notifications to help manage screen time and prevent excessive browsing.

## Features

- **Real-time Time Tracking**: Automatically tracks time spent on each website/tab
- **Configurable Notifications**: Set custom intervals (1-120 minutes) for reminders
- **Beautiful Popup Interface**: View today's statistics with a modern, gradient UI
- **Comprehensive Options Page**: Advanced settings for notifications, tracking, and data management
- **Activity Detection**: Intelligent tracking that pauses when user is inactive
- **Data Storage**: Local storage of browsing data with configurable retention
- **Privacy Focused**: All data stored locally, no external servers

## Installation

### From Source (Developer Mode)

1. **Download/Clone the Extension**
   ```bash
   git clone <your-repo-url>
   # or download and extract the ZIP file
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or click Menu (⋮) → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Select the `screentime` folder containing the extension files
   - The extension should now appear in your extensions list

5. **Pin the Extension (Optional)**
   - Click the puzzle piece icon (🧩) in the Chrome toolbar
   - Find "ScreenTime Tracker" and click the pin icon to keep it visible

## Usage

### Basic Tracking

The extension automatically starts tracking time when you visit websites. No setup required!

### Viewing Statistics

1. **Click the extension icon** in the toolbar to view:
   - Today's browsing statistics
   - Time spent on each website
   - Quick settings toggles

### Configuring Notifications

**Quick Setup (Popup):**
- Toggle notifications on/off
- Adjust notification interval (minutes)

**Advanced Setup (Options Page):**
1. Click the extension icon → "⚙️ Options"
2. Configure detailed settings:
   - Notification intervals and sounds
   - Activity tracking preferences
   - Website time limits
   - Data retention settings

### Key Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Notification Interval** | How often to show reminders | 15 minutes |
| **Track Inactive Time** | Include time when user is idle | Disabled |
| **Inactivity Threshold** | When to consider user inactive | 5 minutes |
| **Daily Time Limits** | Set per-website limits | Disabled |
| **Data Retention** | How long to keep data | 30 days |

## File Structure

```
screentime/
├── manifest.json           # Extension configuration
├── background.js          # Service worker for tracking
├── content.js             # Content script for page interaction
├── popup.html             # Main popup interface
├── popup.js              # Popup logic
├── options.html          # Settings page
├── options.js            # Options page logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## How It Works

### Time Tracking
- **Background Script**: Monitors tab switches and URL changes
- **Content Script**: Detects page visibility and user activity
- **Storage**: Time data stored locally using Chrome's storage API
- **Accuracy**: Only tracks active, visible tabs with user interaction

### Notifications
- **Alarms API**: Uses Chrome's alarms for reliable notifications
- **Configurable**: Set custom intervals and enable/disable easily
- **Context-Aware**: Shows current site and total time spent

### Data Management
- **Local Storage**: All data stays on your device
- **Daily Aggregation**: Data organized by date for easy analysis
- **Configurable Retention**: Automatic cleanup of old data
- **Export Option**: Backup your data as JSON

## Privacy & Security

🔒 **Your privacy is our top priority. Your data never leaves your device.**

- ✅ **100% Local Storage** - All browsing data stays on your computer only
- ✅ **Zero Data Sharing** - Nothing is ever sent to external servers or third parties
- ✅ **No User Tracking** - Extension only tracks time, not browsing content or personal data
- ✅ **Completely Offline** - No network requests or internet connectivity required
- ✅ **Open Source** - Full code visibility for complete transparency
- ✅ **Minimal Permissions** - Only requests essential permissions for functionality

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `activeTab` | Detect current active tab |
| `storage` | Store time tracking data locally |
| `notifications` | Show reminder notifications |
| `tabs` | Monitor tab switches and URLs |
| `alarms` | Schedule periodic notifications |
| `<all_urls>` | Track time on any website |

## Troubleshooting

### Extension Not Tracking Time
1. Check if extension is enabled in `chrome://extensions/`
2. Ensure notifications are enabled in popup
3. Try refreshing the page
4. Check Chrome's notification permissions

### Notifications Not Showing
1. Verify notifications are enabled in the extension popup
2. Check Chrome's notification settings:
   - Go to Chrome Settings → Privacy and Security → Site Settings → Notifications
   - Ensure Chrome can show notifications
3. Check system notification settings (Windows/Mac/Linux)

### Data Not Saving
1. Check Chrome storage permissions
2. Try disabling and re-enabling the extension
3. Clear extension data and restart

### High Memory Usage
1. Reduce data retention period in options
2. Clear old data manually
3. Disable tracking for inactive time

## Development

### Making Changes
1. Edit the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon (🔄) for the extension
4. Test your changes

### Adding Features
- **Background Script** (`background.js`): For persistent tracking logic
- **Content Script** (`content.js`): For page-specific functionality
- **Popup** (`popup.html/js`): For quick interactions
- **Options** (`options.html/js`): For detailed configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Feel free to use, modify, and distribute.

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Look for errors in Chrome's developer console
3. Create an issue with detailed steps to reproduce

---

**Happy browsing! 🚀**

*Remember: The goal is balanced screen time, not zero screen time. Use this tool to build awareness and healthy habits.*
