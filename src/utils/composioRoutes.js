'use strict';

/**
 * Central definition for routing Composio integrations/workflows.
 * Each workflow definition captures the authConfigId (used to start
 * the Composio linking flow) and lightweight matching metadata so
 * assistants can infer when to suggest a workflow.
 */

const DEFAULT_ACTION_VERBS = ['create', 'update', 'edit', 'write', 'replace', 'draft', 'make', 'modify'];

const WORKFLOW_ROUTES = {
    google_docs: {
        label: 'Google Docs',
        description: 'Create or update Google Docs documents via Composio.',
        authConfigId: 'ac_SMDf4M_jKYE1',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [
            /google\s+doc(s)?/i,
            /\bgdoc(s)?/i,
            /google\s+document/i,
            /document\s+in\s+google/i,
        ],
        defaultTools: [
            'GOOGLE_DOCS_CREATE_DOCUMENT',
            'GOOGLE_DOCS_UPDATE_DOCUMENT',
            'GOOGLE_DOCS_APPEND_PARAGRAPHS',
        ],
    },
    google_sheets: {
        label: 'Google Sheets',
        description: 'Automate Google Sheets spreadsheets.',
        authConfigId: 'ac__DPVy8XWTDGX',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [
            /google\s+sheet(s)?/i,
            /spreadsheet/i,
            /g-sheet(s)?/i,
        ],
        defaultTools: [
            'GOOGLE_SHEETS_CREATE_SPREADSHEET',
            'GOOGLE_SHEETS_UPDATE_SPREADSHEET_VALUES',
        ],
    },
    google_slides: {
        label: 'Google Slides',
        description: 'Generate or edit Google Slides presentations.',
        authConfigId: 'ac_b9UhoJR0WgT3',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [
            /google\s+slide(s)?/i,
            /presentation/i,
            /deck/i,
        ],
        defaultTools: [
            'GOOGLE_SLIDES_CREATE_PRESENTATION',
            'GOOGLE_SLIDES_BATCH_UPDATE_PRESENTATION',
        ],
    },
    gmail: {
        label: 'Gmail',
        description: 'Send and read emails with Gmail.',
        authConfigId: 'ac_AEOPhhO57Zsk',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: ['send', 'draft', 'email', 'schedule', 'reply'],
        keywords: [
            /gmail/i,
            /send\s+(an\s+)?email/i,
            /draft\s+(an\s+)?email/i,
        ],
        defaultTools: [
            'GMAIL_SEND_EMAIL',
            'GMAIL_GET_EMAILS',
        ],
    },
};

/**
 * Returns a sanitized workflow definition (without regexp internals)
 * for UI display or IPC payloads.
 */
function getWorkflowMetadata(key) {
    const workflow = WORKFLOW_ROUTES[key];
    if (!workflow) {
        return null;
    }

    const { keywords, ...rest } = workflow;
    return {
        key,
        ...rest,
    };
}

/**
 * Attempts to match a raw user utterance to a workflow definition.
 * Matching requires both a keyword hit and (optionally) an action verb
 * so that simply mentioning a product does not immediately trigger a workflow.
 */
function findWorkflowMatchFromText(inputText) {
    if (!inputText || typeof inputText !== 'string') {
        return null;
    }

    const trimmed = inputText.trim();
    if (!trimmed) {
        return null;
    }

    const lower = trimmed.toLowerCase();

    for (const [key, workflow] of Object.entries(WORKFLOW_ROUTES)) {
        const keywordHit = Array.isArray(workflow.keywords)
            ? workflow.keywords.some(regex => regex.test(trimmed))
            : false;
        if (!keywordHit) {
            continue;
        }

        const verbs = Array.isArray(workflow.actionVerbs) && workflow.actionVerbs.length > 0
            ? workflow.actionVerbs
            : DEFAULT_ACTION_VERBS;
        const verbHit = verbs.some(verb => lower.includes(verb.toLowerCase()));

        if (!verbHit) {
            continue;
        }

        return getWorkflowMetadata(key);
    }

    return null;
}

module.exports = {
    WORKFLOW_ROUTES,
    getWorkflowMetadata,
    findWorkflowMatchFromText,
};
