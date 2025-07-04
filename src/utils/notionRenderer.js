// Notion API Integration for cheating-daddy - Renderer Process Module
// This module runs in the renderer process and communicates with the main process via IPC

/**
 * Test a Notion API connection
 * @param {string} apiKey - Notion API key
 * @returns {Promise<Object>} - Result with success status and user info or error
 */
const testNotionConnection = async (apiKey) => {
    if (!apiKey) {
        return { success: false, error: 'API key is required' };
    }
    
    try {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('notion-test-connection', apiKey);
    } catch (error) {
        console.error('Error testing Notion connection:', error);
        return { success: false, error: error.message || 'Failed to connect' };
    }
};

/**
 * Get content from a Notion page or database
 * @param {string} apiKey - Notion API key
 * @param {string} id - ID of the page or database
 * @param {string} type - Type of resource ('page' or 'database')
 * @returns {Promise<Object>} - Result with success status and content or error
 */
const getNotionContent = async (apiKey, id, type) => {
    if (!apiKey || !id || !type) {
        return { success: false, error: 'Missing required parameters' };
    }
    
    try {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('notion-get-content', { apiKey, id, type });
    } catch (error) {
        console.error('Error getting Notion content:', error);
        return { success: false, error: error.message || 'Failed to get content' };
    }
};

/**
 * Get content from multiple Notion pages/databases
 * @param {string} apiKey - Notion API key
 * @param {Array<Object>} notionResources - Array of objects with id, type, and enabled status
 * @returns {Promise<Object>} - Result with success status and combined content or error
 */
const getMultipleNotionContents = async (apiKey, notionResources) => {
    if (!apiKey || !notionResources) {
        return { success: false, error: 'Missing required parameters' };
    }
    
    try {
        const { ipcRenderer } = window.require('electron');
        return await ipcRenderer.invoke('notion-get-multiple-contents', { apiKey, notionResources });
    } catch (error) {
        console.error('Error getting multiple Notion contents:', error);
        return { success: false, error: error.message || 'Failed to get content' };
    }
};

/**
 * Utility to open the Notion integrations page
 */
const openNotionIntegrationPage = () => {
    try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.invoke('open-external', 'https://www.notion.so/my-integrations');
    } catch (error) {
        console.error('Error opening Notion integrations page:', error);
        // Fallback
        window.open('https://www.notion.so/my-integrations', '_blank');
    }
};

// Export the renderer-side Notion utilities
module.exports = {
    testNotionConnection,
    getNotionContent,
    getMultipleNotionContents,
    openNotionIntegrationPage
};
