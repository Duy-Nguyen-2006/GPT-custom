# Story to Video Automator - Chrome Extension

A Chrome extension that automates the process of converting story scripts into multiple video scenes using Google Labs FX and Gemini AI.

## Features

- **AI-Powered Story Splitting**: Uses Google Gemini AI to intelligently divide stories into scenes
- **Automated Video Generation**: Automatically generates videos for each scene on Google Labs FX
- **Smart Scene Creation**: Creates detailed English prompts optimized for video generation
- **Secure Operation**: No permanent storage of API keys, works only on authorized pages
- **Progress Tracking**: Real-time progress updates during automation

## Installation

1. **Download Extension Files**:
   ```
   manifest.json
   popup.html
   popup.js
   content.js
   styles.css
   icon16.png (placeholder)
   icon48.png (placeholder) 
   icon128.png (placeholder)
   ```

2. **Install in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the folder containing all extension files
   - The extension icon will appear in your Chrome toolbar

## Usage

### Prerequisites
- Google Gemini API key (get from [Google AI Studio](https://makersuite.google.com/app/apikey))
- Access to [Google Labs FX](https://labs.google/fx/vi/tools/flow)

### Step-by-Step Guide

1. **Navigate to Google Labs FX**:
   - Open https://labs.google/fx/vi/tools/flow in Chrome
   - The extension only works on this specific URL

2. **Open the Extension**:
   - Click the extension icon in your toolbar
   - The popup interface will appear

3. **Enter Your Content**:
   - **Story Script**: Enter your story in Vietnamese or English
   - **API Key**: Enter your Gemini API key (not stored permanently)
   - **Scene Count**: Choose 1-10 scenes (default: 3)

4. **Generate Scenes**:
   - Click "Create Scenes"
   - Wait for Gemini AI to process your story
   - Review the generated English prompts for each scene

5. **Start Automation**:
   - Click "Start Video Generation" 
   - The extension will automatically:
     - Enter each prompt into Google Labs FX
     - Submit video generation requests
     - Wait for videos to complete
     - Download each video as `scene_1.mp4`, `scene_2.mp4`, etc.

6. **Monitor Progress**:
   - Watch the progress bar and status updates
   - Videos will be saved to your default downloads folder

## Technical Details

### Permissions Required
- `activeTab`: Access current tab for automation
- `scripting`: Inject content scripts for DOM manipulation
- `storage`: Temporary data storage during processing
- `host_permissions`: Access to Google APIs and Labs

### Security Features
- API keys are never stored permanently
- Extension only activates on approved URLs
- No external data collection or transmission
- Secure communication between popup and content scripts

### Error Handling
- Automatic retries for failed operations (3 attempts per scene)
- Timeout protection (5 minutes per video)
- Graceful handling of page structure changes
- Detailed error messages for troubleshooting

## Limitations

1. **URL Restriction**: Only works on https://labs.google/fx/vi/tools/flow
2. **Scene Limit**: Maximum 10 scenes to prevent API abuse
3. **API Dependency**: Requires valid Gemini API key
4. **Page Structure**: May need updates if Google Labs changes their interface
5. **Rate Limiting**: Subject to Google Labs and Gemini API rate limits

## Troubleshooting

### Extension Not Working
- Verify you're on the correct URL: https://labs.google/fx/vi/tools/flow
- Check that all extension files are in the same folder
- Reload the extension in `chrome://extensions/`

### API Errors
- Verify your Gemini API key is valid
- Check your API quotas and usage limits
- Ensure stable internet connection

### Automation Failures
- Google Labs may have updated their page structure
- Check browser console for detailed error messages
- Try refreshing the page and restarting the process

### Download Issues
- Check your browser's download settings
- Ensure downloads aren't being blocked
- Verify sufficient storage space

## Development Notes

The extension uses Chrome Extension Manifest V3 and includes:

- **popup.js**: Main UI logic and Gemini API integration
- **content.js**: DOM automation for Google Labs FX
- **manifest.json**: Extension configuration and permissions
- **styles.css**: Clean, modern UI styling

## Privacy & Security

- No user data is collected or transmitted to third parties
- API keys are only used for direct communication with Google Gemini
- All processing happens locally in your browser
- Extension source code is fully visible and auditable

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all prerequisites are met
3. Check browser console for error messages
4. Ensure you're using the latest version of Chrome

---

**Note**: This extension is designed for educational and creative purposes. Please respect Google Labs' terms of service and use responsibly.