// content.js - Content script for automating Google Labs FX
(function() {
    'use strict';

    let isAutomating = false;
    let currentScenes = [];
    let currentSceneIndex = 0;

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.action === 'START_AUTOMATION') {
            startAutomation(message.scenes);
            sendResponse({ success: true });
        }
        return true;
    });

    async function startAutomation(scenes) {
        if (isAutomating) {
            console.log('Automation already in progress');
            return;
        }

        isAutomating = true;
        currentScenes = scenes;
        currentSceneIndex = 0;

        try {
            console.log('Starting automation for', scenes.length, 'scenes');
            
            for (let i = 0; i < scenes.length; i++) {
                currentSceneIndex = i;
                const scene = scenes[i];
                
                sendProgressUpdate(i + 1, scenes.length, 'Starting scene generation...');
                
                await processScene(scene, i + 1);
                
                // Add delay between scenes to avoid overwhelming the service
                if (i < scenes.length - 1) {
                    await sleep(2000);
                }
            }

            sendMessage({ action: 'AUTOMATION_COMPLETE' });
            console.log('All scenes processed successfully');

        } catch (error) {
            console.error('Automation error:', error);
            sendMessage({ 
                action: 'AUTOMATION_ERROR', 
                error: error.message 
            });
        } finally {
            isAutomating = false;
        }
    }

    async function processScene(scene, sceneNumber) {
        const maxRetries = 3;
        const maxWaitTime = 300000; // 5 minutes
        
        console.log(`\n=== Processing Scene ${sceneNumber}/${currentScenes.length} ===`);
        console.log(`Scene title: ${scene.title || 'Untitled'}`);
        console.log(`Scene prompt: ${scene.prompt.substring(0, 200)}...`);
        
        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                console.log(`\n--- Attempt ${retry + 1}/${maxRetries} for Scene ${sceneNumber} ---`);
                sendProgressUpdate(sceneNumber, currentScenes.length, `Attempt ${retry + 1}: Entering prompt...`);
                
                // Wait for page to be ready
                console.log('Waiting for input elements to be ready...');
                await waitForElement('textarea, input[type="text"], [contenteditable="true"]', 15000);
                
                // Clear and enter prompt
                console.log('Entering prompt into input field...');
                await enterPrompt(scene.prompt);
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Submitting request...');
                
                // Submit the request
                console.log('Submitting video generation request...');
                await submitRequest();
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Waiting for video generation...');
                
                // Wait for video to be generated
                console.log('Waiting for video generation to complete...');
                await waitForVideoCompletion(maxWaitTime);
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Downloading video...');
                
                // Download the video
                console.log('Starting video download...');
                await downloadVideo(sceneNumber);
                
                console.log(`✅ Scene ${sceneNumber} completed successfully`);
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Scene completed successfully!');
                return; // Success, exit retry loop
                
            } catch (error) {
                console.error(`❌ Scene ${sceneNumber}, attempt ${retry + 1} failed:`, error.message);
                
                if (retry === maxRetries - 1) {
                    console.error(`💀 Scene ${sceneNumber} failed after ${maxRetries} attempts`);
                    throw new Error(`Scene ${sceneNumber} failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry with exponential backoff
                const waitTime = 3000 * (retry + 1);
                console.log(`⏳ Waiting ${waitTime}ms before retry ${retry + 2}...`);
                sendProgressUpdate(sceneNumber, currentScenes.length, `Retry ${retry + 1} failed, waiting before retry ${retry + 2}...`);
                await sleep(waitTime);
                
                // Try to refresh the page state if needed
                if (retry > 0) {
                    console.log('Attempting to refresh page state...');
                    try {
                        // Scroll to top to reset view
                        window.scrollTo(0, 0);
                        await sleep(1000);
                    } catch (refreshError) {
                        console.warn('Failed to refresh page state:', refreshError.message);
                    }
                }
            }
        }
    }

    async function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element '${selector}' not found within ${timeout}ms`));
                    return;
                }
                
                setTimeout(checkElement, 500);
            };
            
            checkElement();
        });
    }

    async function enterPrompt(prompt) {
        console.log('Entering prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
        
        // More comprehensive input field selectors
        const possibleSelectors = [
            // Specific prompt input fields
            'textarea[placeholder*="prompt" i]',
            'textarea[placeholder*="describe" i]',
            'textarea[placeholder*="text" i]',
            'textarea[name="prompt"]',
            'textarea[id*="prompt"]',
            'textarea[class*="prompt"]',
            
            // Input fields
            'input[placeholder*="prompt" i]',
            'input[placeholder*="describe" i]',
            'input[type="text"][placeholder*="text" i]',
            'input[name="prompt"]',
            'input[id*="prompt"]',
            
            // Contenteditable elements
            '[contenteditable="true"]',
            '.contenteditable',
            
            // Generic text inputs (fallback)
            'textarea:not([readonly]):not([disabled])',
            'input[type="text"]:not([readonly]):not([disabled])',
            'textarea',
            'input[type="text"]'
        ];

        let inputElement = null;
        
        console.log('Looking for input field...');
        
        for (const selector of possibleSelectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`Found ${elements.length} elements with selector: ${selector}`);
            
            for (const element of elements) {
                if (isVisible(element) && !element.disabled && !element.readOnly) {
                    console.log(`Found input element using selector: ${selector}`, element);
                    inputElement = element;
                    break;
                }
            }
            
            if (inputElement) break;
        }

        if (!inputElement) {
            // Log all available input elements for debugging
            const allTextareas = document.querySelectorAll('textarea');
            const allInputs = document.querySelectorAll('input[type="text"]');
            const allContentEditable = document.querySelectorAll('[contenteditable="true"]');
            
            console.log('Available textarea elements:');
            allTextareas.forEach((el, index) => {
                console.log(`Textarea ${index}: placeholder="${el.placeholder}" name="${el.name}" disabled=${el.disabled} visible=${isVisible(el)}`);
            });
            
            console.log('Available text input elements:');
            allInputs.forEach((el, index) => {
                console.log(`Input ${index}: placeholder="${el.placeholder}" name="${el.name}" disabled=${el.disabled} visible=${isVisible(el)}`);
            });
            
            console.log('Available contenteditable elements:');
            allContentEditable.forEach((el, index) => {
                console.log(`ContentEditable ${index}: visible=${isVisible(el)}`);
            });
            
            throw new Error('Could not find text input field. The page structure may have changed.');
        }

        // Ensure the input is focused and visible
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        inputElement.focus();
        await sleep(1000);

        // Clear existing content with multiple methods
        if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
            // Method 1: Set value directly
            inputElement.value = '';
            
            // Method 2: Select all and delete
            inputElement.select();
            inputElement.setSelectionRange(0, inputElement.value.length);
            
            // Method 3: Send key events to clear
            inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true, bubbles: true }));
            inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }));
            inputElement.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control', ctrlKey: true, bubbles: true }));
            inputElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
            
            inputElement.focus();
            
            // Simulate typing for more natural interaction
            await simulateTyping(inputElement, prompt);
            
        } else if (inputElement.contentEditable === 'true') {
            // For contenteditable elements
            inputElement.textContent = '';
            inputElement.innerHTML = '';
            inputElement.focus();
            
            // Use execCommand for contenteditable
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
            document.execCommand('insertText', false, prompt);
        }

        // Trigger multiple events to ensure the input is registered
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        inputElement.dispatchEvent(new Event('keyup', { bubbles: true }));
        inputElement.dispatchEvent(new Event('blur', { bubbles: true }));
        inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
        
        console.log('Prompt entered successfully');
        await sleep(1500); // Increased wait time
    }

    async function simulateTyping(element, text) {
        for (let i = 0; i < text.length; i++) {
            element.value += text[i];
            element.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Small delay to simulate human typing
            if (i % 10 === 0) {
                await sleep(50);
            }
        }
    }

    async function submitRequest() {
        // Try different possible submit button selectors with more comprehensive patterns
        const possibleSelectors = [
            // Direct submit buttons
            'button[type="submit"]',
            'input[type="submit"]',
            
            // Text-based button detection
            'button:contains("Generate")',
            'button:contains("Create")',
            'button:contains("Send")',
            'button:contains("Submit")',
            'button:contains("Start")',
            'button:contains("Run")',
            'button:contains("Go")',
            'button:contains("Make")',
            'button:contains("Tạo")', // Vietnamese for "Create"
            'button:contains("Gửi")', // Vietnamese for "Send"
            
            // Aria-label based detection
            'button[aria-label*="generate" i]',
            'button[aria-label*="create" i]',
            'button[aria-label*="send" i]',
            'button[aria-label*="submit" i]',
            'button[aria-label*="start" i]',
            
            // CSS class based detection
            '.submit-btn',
            '.generate-btn',
            '.send-btn',
            '.create-btn',
            '.primary-btn',
            '.action-btn',
            
            // General button patterns
            'button[data-action="submit"]',
            'button[data-action="generate"]',
            'button[data-action="create"]',
            
            // Fallback to any non-disabled button
            'button:not([disabled]):not([aria-disabled="true"])'
        ];

        let submitButton = null;
        let buttonFound = false;
        
        console.log('Looking for submit button...');
        
        for (const selector of possibleSelectors) {
            // Handle pseudo-selectors manually
            if (selector.includes(':contains(')) {
                const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                const buttons = document.querySelectorAll('button');
                console.log(`Checking ${buttons.length} buttons for text containing: "${searchText}"`);
                
                for (const button of buttons) {
                    const buttonText = button.textContent.toLowerCase().trim();
                    if (buttonText.includes(searchText) && isVisible(button) && !button.disabled) {
                        console.log(`Found submit button with text: "${button.textContent.trim()}" using selector: ${selector}`);
                        submitButton = button;
                        buttonFound = true;
                        break;
                    }
                }
            } else {
                const elements = document.querySelectorAll(selector);
                console.log(`Found ${elements.length} elements with selector: ${selector}`);
                
                for (const element of elements) {
                    if (isVisible(element) && !element.disabled && !element.getAttribute('aria-disabled')) {
                        console.log(`Found submit button using selector: ${selector}`, element);
                        submitButton = element;
                        buttonFound = true;
                        break;
                    }
                }
            }
            
            if (buttonFound) break;
        }

        // If still no button found, try to find any clickable element near the input
        if (!submitButton) {
            console.log('No submit button found with standard selectors, trying contextual search...');
            
            // Look for buttons that are siblings or nearby the input field
            const inputElement = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
            if (inputElement) {
                const parent = inputElement.parentElement;
                const nearbyButtons = parent.querySelectorAll('button:not([disabled])');
                
                if (nearbyButtons.length > 0) {
                    console.log(`Found ${nearbyButtons.length} nearby buttons, using the first one`);
                    submitButton = nearbyButtons[0];
                }
            }
        }

        if (!submitButton) {
            // Log all available buttons for debugging
            const allButtons = document.querySelectorAll('button');
            console.log('Available buttons on page:');
            allButtons.forEach((btn, index) => {
                console.log(`${index}: "${btn.textContent.trim()}" - disabled: ${btn.disabled} - visible: ${isVisible(btn)}`);
            });
            
            throw new Error('Could not find submit button. The page structure may have changed.');
        }

        console.log('Clicking submit button:', submitButton.textContent.trim());
        
        // Ensure the button is focused and scroll into view if needed
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        submitButton.focus();
        await sleep(500);
        
        // Click the submit button
        submitButton.click();
        
        // Also trigger additional events that might be required
        submitButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        submitButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        console.log('Submit button clicked successfully');
        await sleep(3000); // Increased wait time to ensure submission is processed
    }

    async function waitForVideoCompletion(maxWaitTime) {
        const startTime = Date.now();
        const checkInterval = 3000; // Check every 3 seconds for faster detection

        console.log('Waiting for video generation to complete...');

        return new Promise((resolve, reject) => {
            let checkCount = 0;
            
            const checkStatus = () => {
                checkCount++;
                const elapsedTime = Date.now() - startTime;
                
                console.log(`Check ${checkCount}: Elapsed time ${Math.round(elapsedTime/1000)}s / ${Math.round(maxWaitTime/1000)}s`);
                
                if (elapsedTime > maxWaitTime) {
                    reject(new Error(`Video generation timed out after ${maxWaitTime / 1000} seconds`));
                    return;
                }

                // Look for completion indicators with more comprehensive selectors
                const completionSelectors = [
                    // Download buttons and links
                    '[aria-label*="download" i]',
                    'button:contains("Download")',
                    'button:contains("Tải")', // Vietnamese for "Download"
                    'a:contains("Download")',
                    '.download-btn',
                    '.btn-download',
                    'a[download]',
                    'a[href*=".mp4"]',
                    'a[href*="blob:"]',
                    
                    // Video elements
                    'video[src]',
                    'video source',
                    '.video-player video',
                    
                    // Status indicators
                    '.video-ready',
                    '.generation-complete',
                    '.completed',
                    '.ready',
                    '[data-status="complete"]',
                    '[data-status="ready"]',
                    '[data-status="done"]',
                    
                    // Success messages
                    '.success',
                    '.complete-message',
                    ':contains("completed")',
                    ':contains("ready")',
                    ':contains("finished")',
                    ':contains("done")',
                    ':contains("hoàn thành")', // Vietnamese for "completed"
                ];

                let isComplete = false;
                let foundElement = null;
                
                for (const selector of completionSelectors) {
                    if (selector.includes(':contains(')) {
                        const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                        const elements = document.querySelectorAll('*');
                        for (const element of elements) {
                            if (element.textContent.toLowerCase().includes(searchText) && isVisible(element)) {
                                console.log(`Found completion indicator with text: "${element.textContent.trim()}" using selector: ${selector}`);
                                isComplete = true;
                                foundElement = element;
                                break;
                            }
                        }
                    } else {
                        const element = document.querySelector(selector);
                        if (element && isVisible(element)) {
                            console.log(`Found completion indicator using selector: ${selector}`, element);
                            isComplete = true;
                            foundElement = element;
                            break;
                        }
                    }
                    
                    if (isComplete) break;
                }

                if (isComplete) {
                    console.log('Video generation completed successfully!');
                    resolve();
                    return;
                }

                // Look for error indicators
                const errorSelectors = [
                    '.error',
                    '.failed',
                    '.error-message',
                    '[data-status="error"]',
                    '[data-status="failed"]',
                    ':contains("error")',
                    ':contains("failed")',
                    ':contains("lỗi")', // Vietnamese for "error"
                ];

                for (const selector of errorSelectors) {
                    if (selector.includes(':contains(')) {
                        const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                        const elements = document.querySelectorAll('*');
                        for (const element of elements) {
                            if (element.textContent.toLowerCase().includes(searchText) && isVisible(element)) {
                                console.log(`Found error indicator: "${element.textContent.trim()}"`);
                                reject(new Error(`Video generation failed: ${element.textContent.trim()}`));
                                return;
                            }
                        }
                    } else {
                        const element = document.querySelector(selector);
                        if (element && isVisible(element)) {
                            console.log('Found error indicator:', element);
                            reject(new Error(`Video generation failed: ${element.textContent || 'Unknown error'}`));
                            return;
                        }
                    }
                }

                // Log current page state for debugging
                if (checkCount % 5 === 0) { // Every 15 seconds
                    console.log('Current page state - looking for completion indicators...');
                    const buttons = document.querySelectorAll('button');
                    console.log(`Found ${buttons.length} buttons on page`);
                    const links = document.querySelectorAll('a');
                    console.log(`Found ${links.length} links on page`);
                    const videos = document.querySelectorAll('video');
                    console.log(`Found ${videos.length} video elements on page`);
                }

                setTimeout(checkStatus, checkInterval);
            };

            // Start checking immediately
            checkStatus();
        });
    }

    async function downloadVideo(sceneNumber) {
        console.log(`Starting download for scene ${sceneNumber}...`);
        
        // Try different download selectors with more comprehensive patterns
        const possibleSelectors = [
            // Aria-label based
            'button[aria-label*="download" i]',
            'a[aria-label*="download" i]',
            
            // Download attribute
            'a[download]',
            'a[download=""]',
            
            // Text-based detection
            'button:contains("Download")',
            'a:contains("Download")',
            'button:contains("Tải")', // Vietnamese
            'a:contains("Tải")', // Vietnamese
            'button:contains("Save")',
            'a:contains("Save")',
            
            // CSS classes
            '.download-btn',
            '.btn-download',
            '.download-link',
            '.save-btn',
            
            // File links
            'a[href*=".mp4"]',
            'a[href*="blob:"]',
            'a[href*="download"]',
            
            // Data attributes
            '[data-action="download"]',
            '[data-download]',
            
            // Generic patterns
            'button[title*="download" i]',
            'a[title*="download" i]'
        ];

        let downloadElement = null;
        
        console.log('Searching for download button/link...');
        
        for (const selector of possibleSelectors) {
            if (selector.includes(':contains(')) {
                const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                const elements = document.querySelectorAll('button, a');
                console.log(`Checking ${elements.length} elements for text containing: "${searchText}"`);
                
                for (const element of elements) {
                    const elementText = element.textContent.toLowerCase().trim();
                    if (elementText.includes(searchText) && isVisible(element)) {
                        console.log(`Found download element with text: "${element.textContent.trim()}" using selector: ${selector}`);
                        downloadElement = element;
                        break;
                    }
                }
            } else {
                const element = document.querySelector(selector);
                if (element && isVisible(element)) {
                    console.log(`Found download element using selector: ${selector}`, element);
                    downloadElement = element;
                    break;
                }
            }
            
            if (downloadElement) break;
        }

        // If no download element found, try to find it in context of video elements
        if (!downloadElement) {
            console.log('No download element found with standard selectors, trying contextual search...');
            
            const videoElements = document.querySelectorAll('video, .video-player, .video-container');
            for (const videoEl of videoElements) {
                const parent = videoEl.parentElement || videoEl.closest('.video-container, .player-container');
                if (parent) {
                    const downloadBtn = parent.querySelector('button, a');
                    if (downloadBtn && isVisible(downloadBtn)) {
                        console.log('Found download button near video element');
                        downloadElement = downloadBtn;
                        break;
                    }
                }
            }
        }

        if (!downloadElement) {
            // Log all available buttons and links for debugging
            const allButtons = document.querySelectorAll('button');
            const allLinks = document.querySelectorAll('a');
            
            console.log('Available buttons on page:');
            allButtons.forEach((btn, index) => {
                console.log(`Button ${index}: "${btn.textContent.trim()}" - href: ${btn.href || 'none'} - visible: ${isVisible(btn)}`);
            });
            
            console.log('Available links on page:');
            allLinks.forEach((link, index) => {
                console.log(`Link ${index}: "${link.textContent.trim()}" - href: ${link.href || 'none'} - download: ${link.download || 'none'} - visible: ${isVisible(link)}`);
            });
            
            console.warn(`Could not find download button for scene ${sceneNumber}. Video may need manual download.`);
            
            // Don't throw error, just warn and continue
            return;
        }

        // Modify download filename if possible
        if (downloadElement.tagName === 'A' && downloadElement.hasAttribute('download')) {
            const originalFilename = downloadElement.getAttribute('download');
            const newFilename = `scene_${sceneNumber}.mp4`;
            downloadElement.setAttribute('download', newFilename);
            console.log(`Modified download filename from "${originalFilename}" to "${newFilename}"`);
        }

        console.log('Clicking download element:', downloadElement.textContent.trim());
        
        // Ensure the element is in view and focused
        downloadElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        downloadElement.focus();
        await sleep(500);

        // Click to download with multiple event types
        downloadElement.click();
        downloadElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        downloadElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        downloadElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        console.log(`Download initiated for scene ${sceneNumber}`);
        await sleep(3000); // Wait for download to start
    }

    function isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function sendProgressUpdate(current, total, status) {
        sendMessage({
            action: 'PROGRESS_UPDATE',
            current: current,
            total: total,
            status: status
        });
    }

    function sendMessage(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    console.log('Story to Video Automator content script loaded');
})();