// popup.js - Main popup logic for the Chrome extension
let currentScenes = [];

document.addEventListener('DOMContentLoaded', async function() {
    await checkCurrentUrl();
    setupEventListeners();
});

async function checkCurrentUrl() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (!currentTab.url.startsWith('https://labs.google/fx/vi/tools/flow')) {
            document.getElementById('url-error').style.display = 'block';
            document.getElementById('main-form').style.display = 'none';
        } else {
            document.getElementById('url-error').style.display = 'none';
            document.getElementById('main-form').style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking URL:', error);
        showError('Unable to verify current page URL');
    }
}

function setupEventListeners() {
    document.getElementById('generate-scenes').addEventListener('click', generateScenes);
    document.getElementById('start-automation').addEventListener('click', startAutomation);
    document.getElementById('back-to-form').addEventListener('click', backToForm);
    document.getElementById('close-extension').addEventListener('click', closeExtension);
    
    // Input validation
    document.getElementById('scene-count').addEventListener('input', function(e) {
        const value = parseInt(e.target.value);
        if (value < 1) e.target.value = 1;
        if (value > 10) e.target.value = 10;
    });
}

async function generateScenes() {
    const story = document.getElementById('story').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    const sceneCount = parseInt(document.getElementById('scene-count').value);

    // Validation
    if (!story) {
        showError('Please enter a story script');
        return;
    }
    if (!apiKey) {
        showError('Please enter your Gemini API key');
        return;
    }
    if (sceneCount < 1 || sceneCount > 10) {
        showError('Scene count must be between 1 and 10');
        return;
    }

    showLoading('Generating scenes with Gemini AI...');

    try {
        const scenes = await callGeminiAPI(story, sceneCount, apiKey);
        currentScenes = scenes;
        displayScenes(scenes);
        hideLoading();
        
        // Switch to scenes display
        document.getElementById('main-form').style.display = 'none';
        document.getElementById('scenes-display').style.display = 'block';
        
    } catch (error) {
        hideLoading();
        showError('Failed to generate scenes: ' + error.message);
    }
}

async function callGeminiAPI(story, sceneCount, apiKey) {
    const prompt = `Divide this story into exactly ${sceneCount} scenes. For each scene, create a detailed English prompt for video generation that describes:
- Visual elements and setting
- Character actions and movements  
- Dialogue or narration (if any)
- Camera angles and cinematography
- Duration: 10-15 seconds per scene
- Mood and atmosphere

Make each prompt concise but descriptive (under 200 words). Output format should be:
Scene 1: [detailed prompt]
Scene 2: [detailed prompt]
...

Story: ${story}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    return parseScenes(generatedText, sceneCount);
}

function parseScenes(generatedText, expectedCount) {
    const scenes = [];
    const lines = generatedText.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        const sceneMatch = line.match(/^Scene\s*(\d+):\s*(.+)$/i);
        if (sceneMatch) {
            scenes.push({
                number: parseInt(sceneMatch[1]),
                prompt: sceneMatch[2].trim()
            });
        }
    }
    
    // If parsing failed, try to split by expected count
    if (scenes.length === 0) {
        const paragraphs = generatedText.split(/\n\s*\n/).filter(p => p.trim());
        for (let i = 0; i < Math.min(paragraphs.length, expectedCount); i++) {
            scenes.push({
                number: i + 1,
                prompt: paragraphs[i].replace(/^Scene\s*\d+:?\s*/i, '').trim()
            });
        }
    }
    
    // Ensure we have the expected number of scenes
    if (scenes.length !== expectedCount) {
        throw new Error(`Expected ${expectedCount} scenes but got ${scenes.length}. Please try again.`);
    }
    
    return scenes;
}

function displayScenes(scenes) {
    const scenesList = document.getElementById('scenes-list');
    scenesList.innerHTML = '';
    
    scenes.forEach(scene => {
        const sceneElement = document.createElement('div');
        sceneElement.className = 'scene-item';
        sceneElement.innerHTML = `
            <div class="scene-number">Scene ${scene.number}</div>
            <div>${scene.prompt}</div>
        `;
        scenesList.appendChild(sceneElement);
    });
}

async function startAutomation() {
    if (currentScenes.length === 0) {
        showError('No scenes to process');
        return;
    }

    // Switch to progress view
    document.getElementById('scenes-display').style.display = 'none';
    document.getElementById('progress').style.display = 'block';
    updateProgress(0, currentScenes.length, 'Initializing automation...');

    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tabs || tabs.length === 0) {
            throw new Error('No active tab found. Please make sure you are on the Google Labs FX page.');
        }
        
        const tab = tabs[0];
        const tabId = tab.id;
        
        // Verify we're on the correct URL with proper validation
        if (!tab.url) {
            throw new Error('Cannot determine current page URL.');
        }
        
        try {
            const url = new URL(tab.url);
            if (url.hostname !== 'labs.google' || !url.pathname.startsWith('/fx/vi/tools/flow')) {
                throw new Error('Please navigate to https://labs.google/fx/vi/tools/flow before starting automation.');
            }
        } catch (urlError) {
            throw new Error('Please navigate to https://labs.google/fx/vi/tools/flow before starting automation.');
        }

        updateProgress(0, currentScenes.length, 'Injecting automation script...');

        // Inject the automation script
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });

        updateProgress(0, currentScenes.length, 'Starting video generation process...');

        // Start the automation process
        await chrome.tabs.sendMessage(tabId, {
            action: 'START_AUTOMATION',
            scenes: currentScenes
        });

        // Listen for progress updates
        chrome.runtime.onMessage.addListener(handleAutomationMessage);

        console.log(`Automation started successfully for ${currentScenes.length} scenes`);

    } catch (error) {
        console.error('Failed to start automation:', error);
        
        let errorMessage = 'Failed to start automation: ' + error.message;
        
        // Provide more specific error messages
        if (error.message.includes('Cannot access')) {
            errorMessage = 'Cannot access the page. Please make sure you are on https://labs.google/fx/vi/tools/flow and refresh the page.';
        } else if (error.message.includes('No active tab')) {
            errorMessage = 'No active tab found. Please make sure the Google Labs FX tab is active.';
        } else if (error.message.includes('Receiving end does not exist')) {
            errorMessage = 'Communication error. Please refresh the Google Labs FX page and try again.';
        }
        
        showError(errorMessage);
        backToScenes();
    }
}

function handleAutomationMessage(message, sender, sendResponse) {
    switch (message.action) {
        case 'PROGRESS_UPDATE':
            updateProgress(message.current, message.total, message.status);
            break;
        case 'AUTOMATION_COMPLETE':
            showCompletion();
            break;
        case 'AUTOMATION_ERROR':
            showError('Automation failed: ' + message.error);
            backToScenes();
            break;
    }
}

function updateProgress(current, total, status) {
    const percentage = Math.min(100, (current / total) * 100);
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    
    if (progressText) {
        if (current === 0) {
            progressText.textContent = status;
        } else {
            progressText.textContent = `Processing scene ${current}/${total}: ${status}`;
        }
    }
    
    // Log progress to console for debugging
    console.log(`Progress: ${Math.round(percentage)}% - Scene ${current}/${total}: ${status}`);
}

function showCompletion() {
    document.getElementById('progress').style.display = 'none';
    document.getElementById('completion').style.display = 'block';
}

function backToForm() {
    document.getElementById('scenes-display').style.display = 'none';
    document.getElementById('main-form').style.display = 'block';
    currentScenes = [];
}

function backToScenes() {
    document.getElementById('progress').style.display = 'none';
    document.getElementById('completion').style.display = 'none';
    document.getElementById('scenes-display').style.display = 'block';
}

function closeExtension() {
    window.close();
}

function showError(message) {
    const errorElement = document.getElementById('error');
    
    if (errorElement) {
        // Clean up the error message for better display
        let displayMessage = message;
        
        // Make URLs clickable if they appear in error messages (secure approach)
        const labsUrl = 'https://labs.google/fx/vi/tools/flow';
        if (displayMessage === `Please navigate to ${labsUrl} before starting automation.`) {
            displayMessage = `Please navigate to <a href="${labsUrl}" target="_blank">${labsUrl}</a> before starting automation.`;
        }
        
        errorElement.innerHTML = displayMessage;
        errorElement.style.display = 'block';
        
        // Auto-hide after 10 seconds for longer error messages, 5 seconds for short ones
        const hideDelay = displayMessage.length > 100 ? 10000 : 5000;
        
        setTimeout(() => {
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, hideDelay);
    }
    
    // Also log the error to console for debugging
    console.error('Extension Error:', message);
}

function showLoading(message) {
    const loadingElement = document.getElementById('loading');
    loadingElement.textContent = message;
    loadingElement.style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}