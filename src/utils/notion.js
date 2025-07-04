// Notion API Integration for cheating-daddy - Main Process Module
// This module runs in the main process and handles Notion API interactions via IPC
const { Client } = require('@notionhq/client');
const { ipcMain } = require('electron');

// Cache for Notion content to avoid excessive API calls
const contentCache = new Map();
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour cache expiry

/**
 * Create a Notion client with the provided API key
 * @param {string} apiKey - Notion API key
 * @returns {Object} - Notion client instance
 */
const createNotionClient = (apiKey) => {
    if (!apiKey) {
        throw new Error('Notion API key is required');
    }
    return new Client({ auth: apiKey });
};

/**
 * Test the Notion API connection
 * @param {string} apiKey - Notion API key
 * @returns {Promise<Object>} - User info object if successful
 */
const testNotionConnection = async (apiKey) => {
    const notion = createNotionClient(apiKey);
    return notion.users.me();
};

/**
 * Extract Notion block content as plain text
 * @param {Object} block - Notion block object
 * @returns {string} - Plain text content
 */
const extractBlockContent = (block) => {
    if (!block || !block.type) return '';
    
    const blockType = block.type;
    
    // Handle different block types
    if (blockType === 'paragraph' || 
        blockType === 'heading_1' || 
        blockType === 'heading_2' || 
        blockType === 'heading_3' ||
        blockType === 'quote' ||
        blockType === 'callout') {
        return block[blockType]?.rich_text?.map(text => text.plain_text || '').join('') || '';
    } 
    else if (blockType === 'bulleted_list_item' || blockType === 'numbered_list_item') {
        return block[blockType]?.rich_text?.map(text => text.plain_text || '').join('') || '';
    }
    else if (blockType === 'toggle') {
        return block.toggle?.rich_text?.map(text => text.plain_text || '').join('') || '';
    }
    else if (blockType === 'to_do') {
        const checked = block.to_do.checked ? '[x] ' : '[ ] ';
        return checked + (block.to_do?.rich_text?.map(text => text.plain_text || '').join('') || '');
    }
    else if (blockType === 'code') {
        const language = block.code.language ? `(${block.code.language}): ` : '';
        return language + (block.code?.rich_text?.map(text => text.plain_text || '').join('') || '');
    }
    else if (blockType === 'image') {
        const caption = block.image?.caption?.map(text => text.plain_text || '').join('') || '';
        return `[Image${caption ? ': ' + caption : ''}]`;
    }
    else if (blockType === 'table') {
        return '[Table]'; // Table content will be fetched separately
    }
    else {
        // For other block types, return a simple identifier
        return `[${blockType}]`;
    }
};

/**
 * Fetch all child blocks of a parent block recursively
 * @param {Object} notion - Notion client instance
 * @param {string} blockId - ID of the parent block
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} currentDepth - Current recursion depth
 * @returns {Promise<string>} - Text content of all blocks
 */
const fetchBlockChildren = async (notion, blockId, maxDepth = 3, currentDepth = 0) => {
    if (currentDepth >= maxDepth) return '';
    
    try {
        // Fetch child blocks
        let allBlocks = [];
        let cursor = undefined;
        
        // Paginate through all blocks
        do {
            const response = await notion.blocks.children.list({
                block_id: blockId,
                start_cursor: cursor || undefined,
            });
            
            allBlocks = [...allBlocks, ...response.results];
            cursor = response.next_cursor;
        } while (cursor);
        
        // Extract and combine text from all blocks
        let textContent = '';
        
        for (const block of allBlocks) {
            // Get the text content from this block
            const blockContent = extractBlockContent(block);
            textContent += blockContent + '\n';
            
            // If the block has children, fetch them recursively
            if (block.has_children) {
                const childContent = await fetchBlockChildren(notion, block.id, maxDepth, currentDepth + 1);
                // Indent child content
                const indentedChildContent = childContent
                    .split('\n')
                    .map(line => (line ? '  ' + line : line))
                    .join('\n');
                textContent += indentedChildContent + '\n';
            }
        }
        
        return textContent;
    } catch (error) {
        console.error('Error fetching block children:', error);
        return `[Error: ${error.message}]`;
    }
};

/**
 * Extract properties from a Notion database or page
 * @param {Object} obj - Notion database or page object
 * @returns {string} - Formatted properties as text
 */
const extractProperties = (obj) => {
    if (!obj || !obj.properties) return '';
    
    let result = '';
    const properties = obj.properties;
    
    for (const [key, value] of Object.entries(properties)) {
        if (!value || !value.type) continue;
        
        let propertyValue = '';
        
        switch (value.type) {
            case 'title':
            case 'rich_text':
                propertyValue = value[value.type]?.map(text => text.plain_text || '').join('') || '';
                break;
            case 'select':
                propertyValue = value.select?.name || '';
                break;
            case 'multi_select':
                propertyValue = value.multi_select?.map(item => item.name).join(', ') || '';
                break;
            case 'date':
                propertyValue = value.date?.start || '';
                if (value.date?.end) propertyValue += ` - ${value.date.end}`;
                break;
            case 'checkbox':
                propertyValue = value.checkbox ? 'Yes' : 'No';
                break;
            case 'number':
                propertyValue = value.number?.toString() || '';
                break;
            case 'url':
                propertyValue = value.url || '';
                break;
            case 'email':
                propertyValue = value.email || '';
                break;
            case 'phone_number':
                propertyValue = value.phone_number || '';
                break;
            case 'created_time':
                propertyValue = value.created_time || '';
                break;
            case 'created_by':
                propertyValue = value.created_by?.name || '';
                break;
            case 'last_edited_time':
                propertyValue = value.last_edited_time || '';
                break;
            case 'last_edited_by':
                propertyValue = value.last_edited_by?.name || '';
                break;
            case 'formula':
                propertyValue = value.formula?.string || value.formula?.number?.toString() || '';
                break;
            case 'relation':
                propertyValue = `[Related items: ${value.relation?.length || 0}]`;
                break;
            case 'files':
                propertyValue = value.files?.map(file => file.name).join(', ') || '';
                break;
            default:
                propertyValue = `[${value.type}]`;
        }
        
        if (propertyValue) {
            result += `${key}: ${propertyValue}\n`;
        }
    }
    
    return result;
};

/**
 * Fetch all rows from a Notion database
 * @param {Object} notion - Notion client instance
 * @param {string} databaseId - ID of the database
 * @returns {Promise<Array>} - Array of database rows
 */
const fetchDatabaseRows = async (notion, databaseId) => {
    let allRows = [];
    let cursor = undefined;
    
    try {
        // Get database schema first
        const databaseInfo = await notion.databases.retrieve({ database_id: databaseId });
        
        // Paginate through all rows
        do {
            const response = await notion.databases.query({
                database_id: databaseId,
                start_cursor: cursor || undefined,
                page_size: 100,
            });
            
            allRows = [...allRows, ...response.results];
            cursor = response.next_cursor;
        } while (cursor);
        
        return allRows;
    } catch (error) {
        console.error('Error fetching database rows:', error);
        return [];
    }
};

/**
 * Get content from a Notion page
 * @param {Object} notion - Notion client instance
 * @param {string} pageId - ID of the page
 * @returns {Promise<string>} - Page content as text
 */
const fetchPageContent = async (notion, pageId) => {
    try {
        // Get page information
        const pageInfo = await notion.pages.retrieve({ page_id: pageId });
        
        // Extract page properties
        let content = '--- Page Properties ---\n';
        content += extractProperties(pageInfo);
        content += '\n--- Page Content ---\n';
        
        // Fetch page content blocks
        const pageContent = await fetchBlockChildren(notion, pageId);
        content += pageContent;
        
        return content;
    } catch (error) {
        console.error('Error fetching page content:', error);
        return `Error: ${error.message}`;
    }
};

/**
 * Get content from a Notion database
 * @param {Object} notion - Notion client instance
 * @param {string} databaseId - ID of the database
 * @returns {Promise<string>} - Database content as text
 */
const fetchDatabaseContent = async (notion, databaseId) => {
    try {
        // Get database information
        const databaseInfo = await notion.databases.retrieve({ database_id: databaseId });
        
        // Extract database properties/schema
        let content = '--- Database Schema ---\n';
        content += extractProperties(databaseInfo);
        content += '\n--- Database Rows ---\n';
        
        // Fetch database rows
        const rows = await fetchDatabaseRows(notion, databaseId);
        
        // Format each row
        rows.forEach((row, index) => {
            content += `\nRow ${index + 1}:\n`;
            content += extractProperties(row);
        });
        
        return content;
    } catch (error) {
        console.error('Error fetching database content:', error);
        return `Error: ${error.message}`;
    }
};

/**
 * Get content from a Notion page or database
 * @param {string} apiKey - Notion API key
 * @param {Object} notionResource - Object with id and type (page/database)
 * @returns {Promise<string>} - Content as text
 */
const getNotionContent = async (apiKey, notionResource) => {
    const { id, type } = notionResource;
    
    // Generate cache key
    const cacheKey = `${apiKey}_${id}`;
    
    // Check if content is in cache and not expired
    if (contentCache.has(cacheKey)) {
        const cached = contentCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.content;
        }
    }
    
    try {
        const notion = createNotionClient(apiKey);
        let content = '';
        
        // Fetch content based on type
        if (type === 'page') {
            content = await fetchPageContent(notion, id);
        } else if (type === 'database') {
            content = await fetchDatabaseContent(notion, id);
        } else {
            throw new Error(`Unknown Notion resource type: ${type}`);
        }
        
        // Cache the content
        contentCache.set(cacheKey, {
            content,
            timestamp: Date.now()
        });
        
        return content;
    } catch (error) {
        console.error(`Error fetching Notion ${type} content:`, error);
        return `Error: ${error.message}`;
    }
};

/**
 * Get content from multiple Notion pages/databases
 * @param {string} apiKey - Notion API key
 * @param {Array<Object>} notionResources - Array of objects with id and type
 * @returns {Promise<string>} - Combined content as text
 */
const getMultipleNotionContents = async (apiKey, notionResources) => {
    if (!apiKey || !notionResources || notionResources.length === 0) {
        return '';
    }
    
    try {
        // Only get content for enabled resources
        const enabledResources = notionResources.filter(resource => resource.enabled);
        
        if (enabledResources.length === 0) {
            return '';
        }
        
        // Fetch content for all enabled resources in parallel
        const contentPromises = enabledResources.map(resource => 
            getNotionContent(apiKey, resource)
                .then(content => ({
                    name: resource.name || resource.id,
                    type: resource.type,
                    content
                }))
        );
        
        const results = await Promise.all(contentPromises);
        
        // Combine all content
        let combinedContent = '--- NOTION CONTEXT ---\n\n';
        
        results.forEach(result => {
            combinedContent += `### ${result.name} (${result.type})\n\n`;
            combinedContent += result.content;
            combinedContent += '\n\n';
        });
        
        return combinedContent;
    } catch (error) {
        console.error('Error getting multiple Notion contents:', error);
        return `Error: ${error.message}`;
    }
};

// Set up IPC handlers for Notion API interactions
function setupNotionIpcHandlers() {
    // Test Notion API connection
    ipcMain.handle('notion-test-connection', async (event, apiKey) => {
        try {
            if (!apiKey) {
                throw new Error('No API key provided');
            }
            
            const notion = createNotionClient(apiKey);
            const response = await notion.users.me();
            return { success: true, user: response };
        } catch (error) {
            console.error('Error testing Notion connection:', error);
            return { success: false, error: error.message || 'Failed to connect' };
        }
    });
    
    // Get content from a Notion page or database
    ipcMain.handle('notion-get-content', async (event, { apiKey, id, type }) => {
        try {
            if (!apiKey || !id || !type) {
                throw new Error('Missing required parameters');
            }
            
            const content = await getNotionContent(apiKey, { id, type });
            return { success: true, content };
        } catch (error) {
            console.error('Error getting Notion content:', error);
            return { success: false, error: error.message || 'Failed to get content' };
        }
    });
    
    // Get content from multiple Notion pages/databases
    ipcMain.handle('notion-get-multiple-contents', async (event, { apiKey, notionResources }) => {
        try {
            if (!apiKey || !notionResources) {
                throw new Error('Missing required parameters');
            }
            
            const content = await getMultipleNotionContents(apiKey, notionResources);
            return { success: true, content };
        } catch (error) {
            console.error('Error getting multiple Notion contents:', error);
            return { success: false, error: error.message || 'Failed to get content' };
        }
    });
    
    console.log('Notion IPC handlers set up');
}

// Export functions
module.exports = {
    setupNotionIpcHandlers
};
