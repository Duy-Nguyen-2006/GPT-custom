# Excel File Upload Extension - Installation & Usage Guide

## 🎉 Enhancement Summary
The Chrome extension has been successfully enhanced with Excel file upload functionality, eliminating the need for `open_chrome.bat`. Users can now upload files directly through the browser interface.

## 📦 Installation Steps

1. **Ensure you have all required files:**
   - `manifest.json` ✅
   - `popup.html` ✅ (Updated with file upload UI)
   - `popup.js` ✅ (Enhanced with file parsing)
   - `content.js` ✅ (Existing automation logic)
   - `styles.css` ✅ (Updated with new styling)
   - `icon.svg` ✅
   - `sample_story.txt` ✅ (For testing)

2. **Install in Chrome:**
   ```
   1. Open Chrome and navigate to chrome://extensions/
   2. Enable "Developer mode" (toggle in top right)
   3. Click "Load unpacked"
   4. Select the folder containing all extension files
   5. Extension will appear in Chrome toolbar
   ```

## 🚀 New Usage Workflow

### Option 1: File Upload (NEW!)
1. Navigate to `https://labs.google/fx/vi/tools/flow`
2. Click the extension icon
3. Select "Excel File Upload" radio button
4. Click "Choose File" and upload:
   - `.txt` files (plain text)
   - `.csv` files (comma-separated values)
   - `.xlsx/.xls` files (save as CSV first for best compatibility)
5. Review the file content preview
6. Enter your Gemini API key
7. Set number of scenes (1-10)
8. Click "Create Scenes" → Review → "Start Video Generation"

### Option 2: Manual Input (Existing)
1. Navigate to `https://labs.google/fx/vi/tools/flow`
2. Click the extension icon
3. Keep "Manual Text Input" selected
4. Type or paste your story in the text area
5. Enter API key and scene count
6. Continue with scene generation

## 🧪 Testing the Extension

Use the included `sample_story.txt` file to test the upload functionality:
- File contains a complete story about Oliver the owl
- Perfect for testing the file upload and parsing features
- Should generate 3-5 scenes when processed

## 🔧 Technical Features Implemented

- **Dual Input Methods**: Radio button selection between text input and file upload
- **File Format Support**: .txt, .csv, .xlsx, .xls files
- **Smart Parsing**: Extracts text content from various file formats
- **Real-time Preview**: Shows extracted content before processing
- **Error Handling**: Validates file types and provides helpful error messages
- **Seamless Integration**: Works with existing Gemini AI and automation workflow

## 🎯 Problem Solved

✅ **No more batch file dependency** - Everything works within the browser
✅ **Excel file support** - Direct upload of spreadsheet content
✅ **Streamlined workflow** - File upload → Process → Generate videos
✅ **Maintained functionality** - All existing features preserved

The extension now provides a complete, self-contained solution for automating video generation from both manual input and file-based story content!