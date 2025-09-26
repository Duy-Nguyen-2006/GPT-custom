# Chrome Extension Installation Guide

## Quick Start

1. **Download all extension files** from this repository:
   - `manifest.json`
   - `popup.html` 
   - `popup.js`
   - `content.js`
   - `styles.css`
   - `icon.svg`

2. **Install in Chrome**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select folder containing all extension files
   - Extension appears in Chrome toolbar

3. **Get Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create new API key
   - Copy for use in extension

4. **Usage**:
   - Go to https://labs.google/fx/vi/tools/flow
   - Click extension icon
   - Enter story, API key, scene count (1-10)
   - Click "Create Scenes"
   - Review generated prompts
   - Click "Start Video Generation"
   - Videos auto-download as scene_1.mp4, scene_2.mp4, etc.

## Features

✅ **AI-Powered Scene Generation** - Uses Gemini to split stories into detailed video prompts  
✅ **Automated Video Creation** - Handles entire Google Labs FX workflow  
✅ **Security Focused** - No permanent storage, URL restrictions  
✅ **Progress Tracking** - Real-time status updates  
✅ **Error Handling** - Comprehensive retry logic  
✅ **User-Friendly Interface** - Clean, intuitive design

## Technical Specifications

- **Chrome Extension Manifest V3**
- **Minimal Permissions**: activeTab, scripting, storage
- **Secure API Integration**: Direct Gemini communication
- **Robust DOM Automation**: Multiple selector fallbacks
- **Modern JavaScript**: Async/await, proper error handling

## File Structure

```
extension/
├── manifest.json     # Extension configuration
├── popup.html        # User interface
├── popup.js          # Main logic & Gemini integration
├── content.js        # Google Labs automation
├── styles.css        # UI styling
└── icon.svg          # Extension icon
```

For detailed documentation, see EXTENSION_README.md