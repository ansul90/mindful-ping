# Testing ScreenTime Tracker Extension

## Quick Installation & Testing Guide

### 1. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select this folder: `/Users/ansugupt/AMyCodingGround/erav4/week1/screentime`
5. The extension should appear with a clock icon

### 2. Test Basic Functionality

#### Test Immediate Notification
1. **Click the extension icon** in the toolbar
2. **Click "🔔 Test Notification"** - Should show a test notification immediately
3. If no notification appears, check Chrome's notification permissions

#### Test Timer Notification (30 seconds)
1. **Click the extension icon** 
2. **Click "⏰ Test Timer (30s)"** - Sets a 30-second timer
3. **Wait 30 seconds** - You should get a notification about your current site

#### Test Site Exclusion
1. **Go to any website** (e.g., google.com)
2. **Click the extension icon**
3. **Click "🚫 Exclude Current Site"**
4. **Confirm the exclusion**
5. The site should now be excluded from tracking

### 3. Test Tracking

1. **Visit different websites** for a few minutes each
2. **Click the extension icon** to see statistics
3. **Click "🔄 Refresh"** to update stats
4. You should see time tracked for each site

### 4. Test Settings

1. **Click the extension icon**
2. **Click "⚙️ Options"** to open the settings page
3. **Try changing the notification interval** (e.g., to 1 minute for testing)
4. **Add/remove excluded sites**
5. **Save settings**

### 5. Troubleshooting

#### No Notifications Appearing
1. **Check Chrome notification permissions:**
   - Go to Chrome Settings → Privacy and Security → Site Settings → Notifications
   - Ensure Chrome can show notifications
   
2. **Check system notifications:**
   - Mac: System Preferences → Notifications → Google Chrome
   - Windows: Settings → System → Notifications → Google Chrome

3. **Test with manual notification:**
   - Click "🔔 Test Notification" in the popup
   - If this works, the timer notifications should work too

#### Extension Not Tracking Time
1. **Check if extension is enabled** in `chrome://extensions/`
2. **Try refreshing the current page**
3. **Check the popup for any error messages**

#### Settings Not Saving
1. **Try disabling and re-enabling the extension**
2. **Check browser console for errors** (F12 → Console)

### 6. Feature Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup shows current statistics  
- [ ] Immediate test notification works
- [ ] 30-second timer notification works
- [ ] Site exclusion works (add/remove)
- [ ] Options page loads and saves settings
- [ ] Time tracking works (visit sites and check stats)
- [ ] Notification interval changes work
- [ ] Data persists after browser restart

### 7. Expected Behavior

- **Time tracking starts** when you visit a website
- **Notifications appear** based on your set interval
- **Excluded sites** don't get tracked or notifications
- **Statistics update** in real-time
- **Settings persist** across browser sessions

### Test Sites to Try

- Google.com (easy to exclude for testing)
- YouTube.com (good for longer tracking)
- GitHub.com (development-related)
- News sites (BBC, CNN, etc.)

---

**If everything works correctly, you should see:**
✅ Notifications every 15 minutes (or your set interval)
✅ Accurate time tracking in the popup
✅ Ability to exclude sites from tracking
✅ Persistent settings and data
