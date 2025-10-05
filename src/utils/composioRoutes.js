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
    trello: {
        label: 'Trello',
        description: 'Manage Trello boards and cards.',
        authConfigId: 'ac_2GM6bPzBIRbg',
        provider: 'trello',
        connectionType: 'OAUTH1',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [/trello/i, /board/i, /card/i],
        defaultTools: [
            'TRELLO_CREATE_CARD',
            'TRELLO_GET_CARDS',
        ],
    },
    google_calendar: {
        label: 'Google Calendar',
        description: 'Manage Google Calendar events.',
        authConfigId: 'ac_0neXn3m3-_Dm',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: ['create', 'schedule', 'book', 'add'],
        keywords: [/google\s+calendar/i, /calendar/i, /event/i, /meeting/i],
        defaultTools: [
            'GOOGLE_CALENDAR_CREATE_EVENT',
            'GOOGLE_CALENDAR_LIST_EVENTS',
        ],
    },
    notion: {
        label: 'Notion',
        description: 'Create and manage Notion pages.',
        authConfigId: 'ac_J-3lYoXZlArF',
        provider: 'notion',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [/notion/i, /page/i, /database/i],
        defaultTools: [
            'NOTION_CREATE_PAGE',
            'NOTION_UPDATE_PAGE',
        ],
    },
    linear: {
        label: 'Linear',
        description: 'Manage Linear issues and projects.',
        authConfigId: 'ac_C5mpd5r37bH4',
        provider: 'linear',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [/linear/i, /issue/i, /project/i],
        defaultTools: [
            'LINEAR_CREATE_ISSUE',
            'LINEAR_GET_ISSUES',
        ],
    },
    twitter: {
        label: 'Twitter',
        description: 'Post and manage Twitter content.',
        authConfigId: 'ac_pTUxOmkyKFHJ',
        provider: 'twitter',
        connectionType: 'OAUTH2',
        actionVerbs: ['post', 'tweet', 'share'],
        keywords: [/twitter/i, /tweet/i, /post/i],
        defaultTools: [
            'TWITTER_CREATE_TWEET',
            'TWITTER_GET_TWEETS',
        ],
    },
    github: {
        label: 'GitHub',
        description: 'Manage GitHub repositories and issues.',
        authConfigId: 'ac_b7RFgtr7s1Uf',
        provider: 'github',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [/github/i, /repository/i, /repo/i, /issue/i],
        defaultTools: [
            'GITHUB_CREATE_ISSUE',
            'GITHUB_GET_REPOSITORIES',
        ],
    },
    google_drive: {
        label: 'Google Drive',
        description: 'Manage Google Drive files.',
        authConfigId: 'ac_0yXGuyFmAacK',
        provider: 'google',
        connectionType: 'OAUTH2',
        actionVerbs: DEFAULT_ACTION_VERBS,
        keywords: [/google\s+drive/i, /drive/i, /file/i],
        defaultTools: [
            'GOOGLE_DRIVE_CREATE_FILE',
            'GOOGLE_DRIVE_LIST_FILES',
        ],
    },
    linkedin: {
        label: 'LinkedIn',
        description: 'Manage LinkedIn content and connections.',
        authConfigId: 'ac_9NVcBfIIjuMU',
        provider: 'linkedin',
        connectionType: 'OAUTH2',
        actionVerbs: ['post', 'share', 'connect'],
        keywords: [/linkedin/i, /post/i, /connection/i],
        defaultTools: [
            'LINKEDIN_CREATE_POST',
            'LINKEDIN_GET_POSTS',
        ],
    },
    slack: {
        label: 'Slack',
        description: 'Send messages and manage Slack channels.',
        authConfigId: 'ac_ohDLI9rewHgG',
        provider: 'slack',
        connectionType: 'OAUTH2',
        actionVerbs: ['send', 'post', 'message'],
        keywords: [/slack/i, /message/i, /channel/i],
        defaultTools: [
            'SLACK_SEND_MESSAGE',
            'SLACK_GET_CHANNELS',
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
