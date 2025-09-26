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
        
        for (let retry = 0; retry < maxRetries; retry++) {
            try {
                sendProgressUpdate(sceneNumber, currentScenes.length, `Attempt ${retry + 1}: Entering prompt...`);
                
                // Wait for page to be ready
                await waitForElement('textarea, input[type="text"], [contenteditable="true"]', 10000);
                
                // Clear and enter prompt
                await enterPrompt(scene.prompt);
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Submitting request...');
                
                // Submit the request
                await submitRequest();
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Waiting for video generation...');
                
                // Wait for video to be generated
                await waitForVideoCompletion(maxWaitTime);
                
                sendProgressUpdate(sceneNumber, currentScenes.length, 'Downloading video...');
                
                // Download the video
                await downloadVideo(sceneNumber);
                
                console.log(`Scene ${sceneNumber} completed successfully`);
                return; // Success, exit retry loop
                
            } catch (error) {
                console.error(`Scene ${sceneNumber}, attempt ${retry + 1} failed:`, error);
                
                if (retry === maxRetries - 1) {
                    throw new Error(`Scene ${sceneNumber} failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retry
                await sleep(3000);
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
        // Try different possible input selectors for Google Labs FX
        const possibleSelectors = [
            'textarea[placeholder*="prompt" i]',
            'textarea[placeholder*="describe" i]',
            'textarea[name="prompt"]',
            'input[placeholder*="prompt" i]',
            'textarea:not([readonly]):not([disabled])',
            '[contenteditable="true"]',
            'textarea',
            'input[type="text"]'
        ];

        let inputElement = null;
        
        for (const selector of possibleSelectors) {
            inputElement = document.querySelector(selector);
            if (inputElement && isVisible(inputElement)) {
                break;
            }
        }

        if (!inputElement) {
            throw new Error('Could not find text input field. The page structure may have changed.');
        }

        // Clear existing content
        if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
            inputElement.value = '';
            inputElement.focus();
            
            // Simulate typing for more natural interaction
            await simulateTyping(inputElement, prompt);
        } else if (inputElement.contentEditable === 'true') {
            inputElement.textContent = '';
            inputElement.focus();
            inputElement.textContent = prompt;
        }

        // Trigger input event
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        await sleep(1000);
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
        // Try different possible submit button selectors
        const possibleSelectors = [
            'button[type="submit"]',
            'button:contains("Generate")',
            'button:contains("Create")',
            'button:contains("Send")',
            'button[aria-label*="generate" i]',
            'button[aria-label*="create" i]',
            'button[aria-label*="send" i]',
            '.submit-btn',
            '.generate-btn',
            '.send-btn',
            'button:not([disabled]):not([aria-disabled="true"])'
        ];

        let submitButton = null;
        
        for (const selector of possibleSelectors) {
            // Handle pseudo-selectors manually
            if (selector.includes(':contains(')) {
                const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                const buttons = document.querySelectorAll('button');
                for (const button of buttons) {
                    if (button.textContent.toLowerCase().includes(searchText) && isVisible(button) && !button.disabled) {
                        submitButton = button;
                        break;
                    }
                }
            } else {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    if (isVisible(element) && !element.disabled && !element.getAttribute('aria-disabled')) {
                        submitButton = element;
                        break;
                    }
                }
            }
            
            if (submitButton) break;
        }

        if (!submitButton) {
            throw new Error('Could not find submit button. The page structure may have changed.');
        }

        // Click the submit button
        submitButton.click();
        await sleep(2000);
    }

    async function waitForVideoCompletion(maxWaitTime) {
        const startTime = Date.now();
        const checkInterval = 5000; // Check every 5 seconds

        return new Promise((resolve, reject) => {
            const checkStatus = () => {
                if (Date.now() - startTime > maxWaitTime) {
                    reject(new Error(`Video generation timed out after ${maxWaitTime / 1000} seconds`));
                    return;
                }

                // Look for completion indicators
                const completionSelectors = [
                    '[aria-label*="download" i]',
                    'button:contains("Download")',
                    '.download-btn',
                    'a[href*=".mp4"]',
                    'video',
                    '.video-ready',
                    '.generation-complete',
                    '[data-status="complete"]',
                    '[data-status="ready"]'
                ];

                let isComplete = false;
                
                for (const selector of completionSelectors) {
                    if (selector.includes(':contains(')) {
                        const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                        const elements = document.querySelectorAll('*');
                        for (const element of elements) {
                            if (element.textContent.toLowerCase().includes(searchText) && isVisible(element)) {
                                isComplete = true;
                                break;
                            }
                        }
                    } else {
                        const element = document.querySelector(selector);
                        if (element && isVisible(element)) {
                            isComplete = true;
                            break;
                        }
                    }
                    
                    if (isComplete) break;
                }

                if (isComplete) {
                    resolve();
                } else {
                    // Look for error indicators
                    const errorSelectors = [
                        '.error',
                        '.failed',
                        '[data-status="error"]',
                        '[data-status="failed"]'
                    ];

                    for (const selector of errorSelectors) {
                        const element = document.querySelector(selector);
                        if (element && isVisible(element)) {
                            reject(new Error('Video generation failed'));
                            return;
                        }
                    }

                    setTimeout(checkStatus, checkInterval);
                }
            };

            checkStatus();
        });
    }

    async function downloadVideo(sceneNumber) {
        // Try different download selectors
        const possibleSelectors = [
            'button[aria-label*="download" i]',
            'a[download]',
            'button:contains("Download")',
            '.download-btn',
            'a[href*=".mp4"]',
            'a[href*="blob:"]',
            '[data-action="download"]'
        ];

        let downloadElement = null;
        
        for (const selector of possibleSelectors) {
            if (selector.includes(':contains(')) {
                const searchText = selector.match(/:contains\("([^"]+)"\)/)[1].toLowerCase();
                const buttons = document.querySelectorAll('button, a');
                for (const button of buttons) {
                    if (button.textContent.toLowerCase().includes(searchText) && isVisible(button)) {
                        downloadElement = button;
                        break;
                    }
                }
            } else {
                downloadElement = document.querySelector(selector);
                if (downloadElement && isVisible(downloadElement)) {
                    break;
                }
            }
        }

        if (!downloadElement) {
            console.warn(`Could not find download button for scene ${sceneNumber}. Video may need manual download.`);
            return;
        }

        // Modify download filename if possible
        if (downloadElement.tagName === 'A' && downloadElement.hasAttribute('download')) {
            downloadElement.setAttribute('download', `scene_${sceneNumber}.mp4`);
        }

        // Click to download
        downloadElement.click();
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