/**
 * Composio service for Gmail integration using Google/Gemini provider
 * Handles authentication and connection management
 */

// Load environment variables
require('dotenv').config();

const { getWorkflowMetadata, findWorkflowMatchFromText } = require('./composioRoutes');

class ComposioService {
    constructor() {
        this.composio = null;
        // Keyed by `${externalUserId}:${authConfigId}` -> { request, status, connectedAccount }
        this.connectedAccounts = new Map();
        this.isInitialized = false;
        this.geminiClient = null;
    }

    _ensureInitialized() {
        if (!this.isInitialized || !this.composio || !this.geminiClient) {
            throw new Error('Composio service not initialized');
        }
    }

    /**
     * Initialize Composio with API key using Google provider
     * @param {string} apiKey - Composio API key
     * @param {string} geminiApiKey - Google Gemini API key (optional, will use process.env.GEMINI_API_KEY if not provided)
     */
    async initialize(apiKey, geminiApiKey = null) {
        // Use environment variable if geminiApiKey is not provided
        const finalGeminiApiKey = geminiApiKey || process.env.GEMINI_API_KEY;
        try {
            // Use dynamic import to handle ES modules
            const { Composio } = await import('@composio/core');
            const { GoogleProvider } = await import('@composio/google');
            const { GoogleGenAI } = await import('@google/genai');
            
            this.composio = new Composio({
                apiKey: apiKey,
                provider: new GoogleProvider(),
            });
            
            // Initialize Gemini client for function calling
            this.geminiClient = new GoogleGenAI({
                apiKey: finalGeminiApiKey,
            });
            
            this.isInitialized = true;
            console.log('Composio service initialized successfully with Google provider');
            
            // Automatically activate connections when service initializes
            await this.autoActivateConnections();
            
            return true;
        } catch (error) {
            console.error('Failed to initialize Composio service:', error);
            return false;
        }
    }

    /**
     * Automatically activate connections when service initializes
     */
    async autoActivateConnections() {
        const externalUserId = 'default-user';
        
        // Google integrations that should be auto-activated when Composio initializes
        const googleIntegrations = [
            'ac_SMDf4M_jKYE1', // Google Docs
            'ac__DPVy8XWTDGX', // Google Sheets
            'ac_b9UhoJR0WgT3', // Google Slides
            'ac_0yXGuyFmAacK', // Google Drive
            'ac_0neXn3m3-_Dm', // Google Calendar
        ];
        
        // Auto-activate Google integrations since Composio uses Google provider
        for (const authConfigId of googleIntegrations) {
            const key = `${externalUserId}:${authConfigId}`;
            const connectedAccount = { id: `google-provider-${authConfigId}`, externalUserId };
            this.connectedAccounts.set(key, { 
                request: null, 
                status: 'connected', 
                connectedAccount 
            });
        }
        
        // Check other integrations and auto-activate if tools are available
        const otherIntegrations = [
            'ac_2GM6bPzBIRbg', // Trello
            'ac_J-3lYoXZlArF', // Notion
            'ac_C5mpd5r37bH4', // Linear
            'ac_pTUxOmkyKFHJ', // Twitter
            'ac_b7RFgtr7s1Uf', // GitHub
            'ac_9NVcBfIIjuMU', // LinkedIn
            'ac_ohDLI9rewHgG', // Slack
        ];
        
        for (const authConfigId of otherIntegrations) {
            try {
                const workflow = this.getWorkflowMetadataByAuthConfigId(authConfigId);
                if (workflow && workflow.defaultTools) {
                    const tools = await this.composio.tools.get(externalUserId, { 
                        tools: workflow.defaultTools.slice(0, 1)
                    });
                    if (tools && tools.length > 0) {
                        // Auto-activate this connection
                        const key = `${externalUserId}:${authConfigId}`;
                        const connectedAccount = { id: `auto-activated-${authConfigId}`, externalUserId };
                        this.connectedAccounts.set(key, { 
                            request: null, 
                            status: 'connected', 
                            connectedAccount 
                        });
                    }
                }
            } catch (error) {
                // Integration not available, skip
            }
        }
    }

    /**
     * Start Gmail authentication flow for a user
     * @param {string} externalUserId - User identifier in your system
     * @param {string} authConfigId - Gmail auth config ID
     * @returns {Promise<{success: boolean, redirectUrl?: string, error?: string}>}
     */
    async connectGmail(externalUserId, authConfigId = 'ac_AEOPhhO57Zsk') {
        return this.connectIntegration(externalUserId, authConfigId, 'Gmail');
    }

    /**
     * Start a generic Composio auth flow for a given integration
     * @param {string} externalUserId
     * @param {string} authConfigId
     * @param {string} label - optional label for logging
     */
    async connectIntegration(externalUserId, authConfigId, label = 'Integration') {
        if (!this.isInitialized) {
            return { success: false, error: 'Composio service not initialized' };
        }
        try {
            console.log(`Starting ${label} connection for user: ${externalUserId} (${authConfigId})`);
            const connectionRequest = await this.composio.connectedAccounts.link(externalUserId, authConfigId);
            const key = `${externalUserId}:${authConfigId}`;
            this.connectedAccounts.set(key, { request: connectionRequest, status: 'pending', connectedAccount: null });
            return { success: true, redirectUrl: connectionRequest.redirectUrl };
        } catch (error) {
            console.error(`Failed to start ${label} connection:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Wait for Gmail connection to be established
     * @param {string} externalUserId - User identifier
     * @param {number} timeoutMs - Timeout in milliseconds (default: 300000 = 5 minutes)
     * @returns {Promise<{success: boolean, connectedAccount?: object, error?: string}>}
     */
    async waitForGmailConnection(externalUserId, timeoutMs = 300000) {
        // Backward compatibility not used directly; waiting is handled via status polling
        return { success: false, error: 'Use waitForIntegrationConnection with authConfigId' };
    }

    /**
     * Wait for integration connection to be established
     */
    async waitForIntegrationConnection(externalUserId, authConfigId, timeoutMs = 300000) {
        const key = `${externalUserId}:${authConfigId}`;
        const con = this.connectedAccounts.get(key);
        if (!con) return { success: false, error: 'No connection request found' };
        try {
            console.log(`Waiting for connection ${authConfigId} for user: ${externalUserId}`);
            const connectedAccount = await con.request.waitForConnection({ timeoutMs });
            con.status = 'connected';
            con.connectedAccount = connectedAccount;
            return {
                success: true,
                connectedAccount: {
                    id: connectedAccount.id,
                    externalUserId,
                    status: 'connected',
                    connectedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            console.error('Failed to establish connection:', error);
            con.status = 'failed';
            return { success: false, error: error.message };
        }
    }

    /**
     * Get connection status for a user
     * @param {string} externalUserId - User identifier
     * @returns {Promise<{success: boolean, status?: string, connectedAccount?: object, error?: string}>}
     */
    async getGmailConnectionStatus(externalUserId) {
        // Deprecated path used by MainView; attempt to infer via tools
        try {
            const tools = await this.composio.tools.get(externalUserId, { tools: ["GMAIL_SEND_EMAIL"] });
            if (tools && tools.length > 0) {
                return { success: true, status: 'connected', connectedAccount: { id: 'real-composio-connection' } };
            }
        } catch (error) {
            console.log('No real Gmail connection found:', error.message);
        }
        return { success: false, error: 'No Gmail connection found.' };
    }

    /**
     * Get connection status for a specific authConfigId with real verification
     */
    async getIntegrationConnectionStatus(externalUserId, authConfigId) {
        const key = `${externalUserId}:${authConfigId}`;
        const con = this.connectedAccounts.get(key);
        
        // If we have a local connection record, verify it's still valid
        if (con && con.status === 'connected' && con.connectedAccount) {
            try {
                // Test the connection by trying to get tools for this integration
                const workflow = this.getWorkflowMetadata(authConfigId) || this.matchWorkflowFromText(authConfigId);
                if (workflow && workflow.defaultTools) {
                    const tools = await this.composio.tools.get(externalUserId, { 
                        tools: workflow.defaultTools.slice(0, 1) // Test with just one tool
                    });
                    if (tools && tools.length > 0) {
                        return { success: true, status: 'connected', connectedAccount: con.connectedAccount };
                    }
                }
            } catch (error) {
                console.log(`Connection verification failed for ${authConfigId}:`, error.message);
                // Connection is no longer valid, update local state
                con.status = 'failed';
                con.connectedAccount = null;
            }
        }
        
        // If Composio service is initialized and working, try to verify connection via tools
        if (this.isInitialized && this.composio) {
            try {
                // Try to get any tools for this authConfigId to see if there's a real connection
                const workflow = this.getWorkflowMetadataByAuthConfigId(authConfigId);
                if (workflow && workflow.defaultTools) {
                    const tools = await this.composio.tools.get(externalUserId, { 
                        tools: workflow.defaultTools.slice(0, 1)
                    });
                    if (tools && tools.length > 0) {
                        // Found working tools, mark as connected
                        const connectedAccount = { id: `verified-${authConfigId}`, externalUserId };
                        this.connectedAccounts.set(key, { 
                            request: null, 
                            status: 'connected', 
                            connectedAccount 
                        });
                        return { success: true, status: 'connected', connectedAccount };
                    }
                }
            } catch (error) {
                // No active connection found
            }
        }
        
        // Return local state if no verification was possible
        if (con) {
            return { success: true, status: con.status, connectedAccount: con.connectedAccount };
        }
        
        return { success: true, status: 'unknown' };
    }

    /**
     * Disconnect Gmail for a user
     * @param {string} externalUserId - User identifier
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async disconnectGmail(externalUserId) {
        // Backward compatibility no-op
        return { success: true };
    }

    async disconnectIntegration(externalUserId, authConfigId) {
        const key = `${externalUserId}:${authConfigId}`;
        if (!this.connectedAccounts.has(key)) return { success: true };
        try {
            this.connectedAccounts.delete(key);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * List all connected accounts
     * @returns {Array} Array of connected account info
     */
    getConnectedAccounts() {
        const accounts = [];
        for (const [key, connection] of this.connectedAccounts.entries()) {
            const [externalUserId, authConfigId] = key.split(':');
            accounts.push({ externalUserId, authConfigId, status: connection.status, connectedAccount: connection.connectedAccount });
        }
        return accounts;
    }

    /**
     * Verify all connections and update their status
     * @param {string} externalUserId - User identifier
     * @returns {Promise<Object>} Status of all connections
     */
    async verifyAllConnections(externalUserId) {
        const results = {};
        
        // Get all known integrations from the workflow metadata
        const allIntegrations = [
            'ac_2GM6bPzBIRbg', // Trello
            'ac_0neXn3m3-_Dm', // Google Calendar
            'ac_J-3lYoXZlArF', // Notion
            'ac_C5mpd5r37bH4', // Linear
            'ac_SMDf4M_jKYE1', // Google Docs
            'ac_pTUxOmkyKFHJ', // Twitter
            'ac__DPVy8XWTDGX', // Google Sheets
            'ac_b9UhoJR0WgT3', // Google Slides
            'ac_b7RFgtr7s1Uf', // GitHub
            'ac_0yXGuyFmAacK', // Google Drive
            'ac_9NVcBfIIjuMU', // LinkedIn
            'ac_ohDLI9rewHgG', // Slack
        ];
        
        // Check each integration
        for (const authConfigId of allIntegrations) {
            const status = await this.getIntegrationConnectionStatus(externalUserId, authConfigId);
            results[authConfigId] = status;
        }
        
        return results;
    }

    /**
     * Retrieve workflow metadata for a known Composio integration key
     * @param {string} workflowKey
     * @returns {{ key: string, label: string, description: string, authConfigId: string, provider: string, connectionType: string, defaultTools?: string[] }|null}
     */
    getWorkflowMetadata(workflowKey) {
        return getWorkflowMetadata(workflowKey);
    }

    /**
     * Retrieve workflow metadata by authConfigId
     * @param {string} authConfigId
     * @returns {{ key: string, label: string, description: string, authConfigId: string, provider: string, connectionType: string, defaultTools?: string[] }|null}
     */
    getWorkflowMetadataByAuthConfigId(authConfigId) {
        const { WORKFLOW_ROUTES } = require('./composioRoutes');
        for (const [key, workflow] of Object.entries(WORKFLOW_ROUTES)) {
            if (workflow.authConfigId === authConfigId) {
                return { key, ...workflow };
            }
        }
        return null;
    }

    /**
     * Match user text to a workflow definition using keyword heuristics
     * @param {string} inputText
     * @returns {{ key: string, label: string, description: string, authConfigId: string, provider: string, connectionType: string, defaultTools?: string[] }|null}
     */
    matchWorkflowFromText(inputText) {
        return findWorkflowMatchFromText(inputText);
    }

    /**
     * Start a linking flow for a workflow key (helper around connectIntegration)
     * @param {string} externalUserId
     * @param {string} workflowKey
     * @returns {Promise<{success: boolean, redirectUrl?: string, error?: string, workflow?: object}>}
     */
    async startWorkflowLink(externalUserId, workflowKey) {
        const workflow = getWorkflowMetadata(workflowKey);
        if (!workflow) {
            return { success: false, error: `Unknown Composio workflow: ${workflowKey}` };
        }

        const result = await this.connectIntegration(externalUserId, workflow.authConfigId, workflow.label);
        if (result.success) {
            return { ...result, workflow };
        }

        return result;
    }

    /**
     * Check if Composio is initialized
     * @returns {boolean}
     */
    isServiceInitialized() {
        return this.isInitialized;
    }

    /**
     * Execute a custom email task using Google provider with Gemini function calling
     * @param {string} externalUserId - User identifier
     * @param {string} task - Natural language description of the email task
     * @param {Array} tools - Array of Gmail tools to use (e.g., ["GMAIL_SEND_EMAIL", "GMAIL_GET_EMAILS"])
     * @returns {Promise<{success: boolean, result?: object, error?: string}>}
     */
    async executeEmailTaskWithAgent(externalUserId, task, tools = ["GMAIL_SEND_EMAIL", "GMAIL_GET_EMAILS"]) {
        try {
            return await this.executeWorkflowTask(externalUserId, 'gmail', task, { tools });
        } catch (error) {
            console.error('Failed to execute email task via Google provider:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get Composio tools formatted for Gemini function calling
     * @param {string} externalUserId - User identifier
     * @param {Array} tools - Array of tool names
     * @returns {Promise<Array>} Formatted tools for Gemini
     */
    async getToolsForGemini(externalUserId, tools = ["GMAIL_SEND_EMAIL", "GMAIL_GET_EMAILS"]) {
        this._ensureInitialized();

        try {
            const availableTools = await this.composio.tools.get(externalUserId, {
                tools: tools,
            });
            // Return cleaned tool declarations compatible with Gemini
            return availableTools.map(tool => this._cleanToolForGemini(tool));
        } catch (error) {
            console.error('Failed to get tools for Gemini:', error);
            throw error;
        }
    }

    /**
     * Execute a function call using Composio provider
     * @param {string} externalUserId - User identifier
     * @param {Object} functionCall - Function call object with name and args
     * @returns {Promise<Object>} Function call result
     */
    async executeFunctionCall(externalUserId, functionCall) {
        this._ensureInitialized();

        try {
            const result = await this.composio.provider.executeToolCall(externalUserId, functionCall);
            return result;
        } catch (error) {
            console.error('Failed to execute function call:', error);
            throw error;
        }
    }

    /**
     * Retrieve tools for a workflow and clean them for Gemini usage.
     */
    async getToolsForWorkflow(externalUserId, workflowKey, explicitTools = null) {
        this._ensureInitialized();

        const workflow = getWorkflowMetadata(workflowKey);
        if (!workflow) {
            throw new Error(`Unknown Composio workflow: ${workflowKey}`);
        }

        const requestedTools = Array.isArray(explicitTools) && explicitTools.length > 0 ? explicitTools : workflow.defaultTools;

        if (!requestedTools || requestedTools.length === 0) {
            throw new Error(`Workflow ${workflowKey} does not define default tools`);
        }

        try {
            const tools = await this.composio.tools.get(externalUserId, { tools: requestedTools });
            if (!tools || tools.length === 0) {
                return { workflow, tools: [], cleanedTools: [] };
            }

            const cleanedTools = tools.map(tool => this._cleanToolForGemini(tool));
            return { workflow, tools, cleanedTools };
        } catch (error) {
            if (error?.response?.status === 404 || error?.response?.status === 401) {
                return { workflow, tools: [], cleanedTools: [], error: 'not_connected' };
            }
            throw error;
        }
    }

    /**
     * Execute a natural language task for a given workflow using Gemini function calls.
     */
    async executeWorkflowTask(externalUserId, workflowKey, taskDescription, options = {}) {
        this._ensureInitialized();

        if (!taskDescription || typeof taskDescription !== 'string') {
            throw new Error('Task description is required');
        }

        const { tools: explicitTools = null, model = 'gemini-2.0-flash-001', maxFunctionCalls = 3 } = options;
        const toolBundle = await this.getToolsForWorkflow(externalUserId, workflowKey, explicitTools);

        if (!toolBundle.cleanedTools || toolBundle.cleanedTools.length === 0) {
            return {
                success: false,
                requiresConnection: true,
                workflow: toolBundle.workflow,
                error: toolBundle.error === 'not_connected'
                    ? 'This account is not linked yet.'
                    : 'No authorized tools available for this workflow. Ask the user to link the integration.',
                toolError: toolBundle.error || null,
            };
        }

        const toolDeclarations = toolBundle.cleanedTools;

        const prompt = this._buildWorkflowPrompt(toolBundle.workflow, taskDescription);

        const executionLog = [];

        try {
            let remainingCalls = Math.max(1, Number(maxFunctionCalls) || 1);
            let accumulatedText = '';

            while (remainingCalls > 0) {
                remainingCalls -= 1;

                const response = await this.geminiClient.models.generateContent({
                    model,
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }],
                        },
                    ],
                    tools: [{ functionDeclarations: toolDeclarations }],
                });

                const { functionCalls, textOutput } = this._extractFunctionCalls(response);
                if (textOutput) {
                    accumulatedText += textOutput;
                }

                if (!functionCalls || functionCalls.length === 0) {
                    return {
                        success: false,
                        workflow: toolBundle.workflow,
                        lastModelOutput: accumulatedText.trim(),
                        error: 'Model did not emit any function calls',
                    };
                }

                const outcomes = [];
                for (const call of functionCalls) {
                    const safeCall = {
                        name: call.name || call.functionName || call.function?.name || '',
                        args: call.args || call.arguments || call.functionArguments || {},
                    };

                    if (!safeCall.name) {
                        continue;
                    }

                    executionLog.push({ type: 'call', data: safeCall });

                    const result = await this.composio.provider.executeToolCall(externalUserId, safeCall);
                    outcomes.push({ call: safeCall, result });
                    executionLog.push({ type: 'result', data: { call: safeCall, result } });
                }

                const summaryText = accumulatedText.trim() ||
                    outcomes
                        .map(({ call, result }) => {
                            const resultSummary = typeof result === 'string'
                                ? result
                                : result?.status || result?.message || 'completed';
                            return `${call.name} -> ${resultSummary}`;
                        })
                        .join('; ');

                return {
                    success: true,
                    workflow: toolBundle.workflow,
                    outcomes,
                    modelOutput: accumulatedText.trim(),
                    summary: summaryText,
                    executionLog,
                    toolError: toolBundle.error || null,
                };
            }

            return {
                success: false,
                workflow: toolBundle.workflow,
                executionLog,
                error: 'Max function call attempts exhausted without execution',
                toolError: toolBundle.error || null,
            };
        } catch (error) {
            console.error('Failed to execute workflow task:', error);
            return {
                success: false,
                workflow: toolBundle.workflow,
                executionLog,
                error: error.message,
                toolError: toolBundle.error || null,
            };
        }
    }

    /**
     * Clean a Composio tool definition to be compatible with Gemini functionDeclarations
     * - Removes unsupported fields (examples, file_uploadable, title, format, etc.)
     * - Recursively cleans parameter schemas
     */
    _cleanToolForGemini(tool) {
        const clone = JSON.parse(JSON.stringify(tool || {}));
        delete clone.security;
        delete clone.externalToolId;
        delete clone.external_provider;
        delete clone.externalProvider;
        delete clone.rateLimit;

        // Ensure required fields
        if (!clone.name) clone.name = clone.tool_name || 'composio_tool';
        if (!clone.description) clone.description = 'Composio tool';

        // Parameters cleaning
        const cleanSchema = (schema) => {
            if (!schema || typeof schema !== 'object') return undefined;
            const { type } = schema;
            const cleaned = { type: type || 'object' };

            // Preserve common fields
            if (schema.description) cleaned.description = schema.description;
            if (Array.isArray(schema.enum)) cleaned.enum = schema.enum.slice(0, 100);
            if (schema.nullable === true) cleaned.nullable = true;

            // Recurse by type
            if (cleaned.type === 'object') {
                cleaned.properties = {};
                const props = schema.properties || {};
                for (const [key, val] of Object.entries(props)) {
                    // Skip unsupported or noisy fields
                    if (key === 'file_uploadable') continue;
                    cleaned.properties[key] = cleanSchema(val) || { type: 'string' };
                }
                if (Array.isArray(schema.required)) cleaned.required = schema.required;
            } else if (cleaned.type === 'array') {
                cleaned.items = cleanSchema(schema.items) || { type: 'string' };
            } else if (['string', 'number', 'integer', 'boolean'].includes(cleaned.type)) {
                // primitives already handled above
            } else {
                // Fallback to string if unknown
                cleaned.type = 'string';
            }

            // Strip fields Gemini rejects
            const stripKeys = [
                'examples', 'file_uploadable', 'format', 'minLength', 'maxLength', 'pattern',
                'default', 'title', 'deprecated', 'readOnly', 'writeOnly', '$schema', '$id',
            ];
            for (const k of stripKeys) delete cleaned[k];
            return cleaned;
        };

        if (clone.parameters) {
            clone.parameters = cleanSchema(clone.parameters);
        } else {
            clone.parameters = { type: 'object', properties: {} };
        }

        return clone;
    }

    _buildWorkflowPrompt(workflow, taskDescription) {
        const label = workflow?.label || 'the selected integration';
        const description = workflow?.description ? `${workflow.description}` : 'Complete the requested work using the available tools.';
        return `You are an automation agent that can call Composio functions to work with ${label}.
${description}

Task: ${taskDescription}

Use the provided function declarations to perform the task. If you need more information from the user, call a function that helps gather it.`;
    }

    _extractFunctionCalls(response) {
        const functionCalls = [];
        let textOutput = '';

        if (!response) {
            return { functionCalls, textOutput };
        }

        const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
        for (const candidate of candidates) {
            const parts = candidate?.content?.parts || [];
            for (const part of parts) {
                if (part?.functionCall) {
                    functionCalls.push({
                        name: part.functionCall.name,
                        args: part.functionCall.args,
                    });
                }
                if (part?.text) {
                    textOutput += `${part.text}\n`;
                }
            }
        }

        // Backwards compatibility for legacy SDK response shape
        if (response.functionCalls && response.functionCalls.length > 0 && functionCalls.length === 0) {
            functionCalls.push(...response.functionCalls);
        }
        if (!textOutput && typeof response.text === 'string') {
            textOutput = response.text;
        }

        return { functionCalls, textOutput };
    }
}

// Create singleton instance
const composioService = new ComposioService();

module.exports = {
    ComposioService,
    composioService,
    getWorkflowMetadata,
    findWorkflowMatchFromText,
};
