// Pre-flight validation for the BYOK providers.
//
// Both the Gemini Live socket and the Groq REST API fail *after* the request is
// accepted (the websocket opens and is closed again a few hundred ms later, the
// chat completion returns a 4xx body), so a session used to look like it started
// fine and then quietly died. These helpers check the credentials and the model
// id up front so the UI can show the real reason before anything else happens.

const GEMINI_MODEL_ENDPOINTS = [
    'https://generativelanguage.googleapis.com/v1alpha/models',
    'https://generativelanguage.googleapis.com/v1beta/models',
];
const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models';
const REQUEST_TIMEOUT_MS = 12000;

function parseErrorBody(bodyText) {
    try {
        const parsed = JSON.parse(bodyText);
        return parsed?.error?.message || parsed?.message || bodyText;
    } catch {
        return bodyText;
    }
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const bodyText = await response.text();

    if (!response.ok) {
        return { ok: false, status: response.status, error: parseErrorBody(bodyText) };
    }

    try {
        return { ok: true, status: response.status, data: JSON.parse(bodyText) };
    } catch {
        return { ok: false, status: response.status, error: 'Unreadable response from provider' };
    }
}

function normalizeModelId(modelId) {
    return String(modelId || '')
        .trim()
        .replace(/^models\//, '')
        .toLowerCase();
}

// ============ GEMINI ============

async function listGeminiModels(apiKey) {
    let lastError = null;

    for (const endpoint of GEMINI_MODEL_ENDPOINTS) {
        let result;
        try {
            result = await fetchJson(`${endpoint}?key=${encodeURIComponent(apiKey)}&pageSize=200`);
        } catch (error) {
            lastError = { ok: false, status: 0, error: error.message };
            continue;
        }

        if (result.ok) {
            const models = (result.data.models || []).map(model => ({
                id: normalizeModelId(model.name),
                methods: model.supportedGenerationMethods || [],
            }));
            return { ok: true, models };
        }

        // 401/403 means the key itself is bad - no point trying the other API version.
        if (result.status === 400 || result.status === 401 || result.status === 403) {
            return { ok: false, status: result.status, error: result.error };
        }

        lastError = result;
    }

    return lastError || { ok: false, status: 0, error: 'Could not reach the Gemini API' };
}

function describeGeminiKeyError(status, error) {
    if (status === 400 || status === 401 || status === 403) {
        return `Gemini rejected the API key (${status}): ${error}. Paste a fresh key from aistudio.google.com/apikey into Home → Gemini API key.`;
    }
    if (status === 429) {
        return `Gemini quota exhausted (429): ${error}`;
    }
    if (status === 0) {
        return `Could not reach the Gemini API: ${error}. Check your network or proxy.`;
    }
    return `Gemini API error (${status}): ${error}`;
}

/**
 * Verifies the Gemini key works and that the configured Live model exists.
 * Returns { ok, error, resolvedModel }.
 */
async function checkGeminiSetup(apiKey, modelId) {
    const trimmedKey = String(apiKey || '').trim();

    if (!trimmedKey) {
        return { ok: false, error: 'No Gemini API key set. Add one in Home → Gemini API key.' };
    }

    if (trimmedKey.length < 20) {
        return {
            ok: false,
            error: `The stored Gemini API key is only ${trimmedKey.length} character(s) long, so it cannot be a real key. Paste the full key from aistudio.google.com/apikey.`,
        };
    }

    const wanted = normalizeModelId(modelId);
    if (!wanted) {
        return { ok: false, error: 'No Gemini Live model configured. Set one in Home → Gemini Live model.' };
    }

    const listing = await listGeminiModels(trimmedKey);

    if (!listing.ok) {
        return { ok: false, error: describeGeminiKeyError(listing.status, listing.error) };
    }

    const match = listing.models.find(model => model.id === wanted);
    if (match) {
        return { ok: true, resolvedModel: match.id };
    }

    const liveModels = listing.models.filter(model => model.methods.includes('bidiGenerateContent')).map(model => model.id);

    // Only block when we can actually offer an alternative - if the account
    // exposes no live-capable models we may just be missing metadata.
    if (liveModels.length === 0) {
        return { ok: true, resolvedModel: wanted };
    }

    return {
        ok: false,
        error: `Gemini has no model called "${modelId}" on this key. Live-capable models available to you: ${liveModels.join(', ')}. Change it in Home → Gemini Live model.`,
    };
}

// ============ GROQ ============

async function listGroqModels(apiKey) {
    try {
        const result = await fetchJson(GROQ_MODELS_URL, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (!result.ok) {
            return result;
        }

        return { ok: true, models: (result.data.data || []).map(model => model.id) };
    } catch (error) {
        return { ok: false, status: 0, error: error.message };
    }
}

function describeGroqKeyError(status, error) {
    if (status === 401) {
        return `Groq rejected the API key: ${error}. The key was revoked or mistyped - create a new one at console.groq.com/keys and paste it into Home → Groq API key.`;
    }
    if (status === 403) {
        return `Groq denied access: ${error}`;
    }
    if (status === 429) {
        return `Groq rate limit hit: ${error}`;
    }
    if (status === 0) {
        return `Could not reach the Groq API: ${error}. Check your network or proxy.`;
    }
    return `Groq API error (${status}): ${error}`;
}

/**
 * Verifies the Groq key works and resolves the configured model to the exact id
 * Groq expects (model ids are case-sensitive; the settings field is free text).
 * Returns { ok, error, resolvedModel }.
 */
async function checkGroqSetup(apiKey, modelId) {
    const trimmedKey = String(apiKey || '').trim();

    if (!trimmedKey) {
        return { ok: false, error: 'No Groq API key set.' };
    }

    const listing = await listGroqModels(trimmedKey);

    if (!listing.ok) {
        return { ok: false, error: describeGroqKeyError(listing.status, listing.error) };
    }

    const wanted = String(modelId || '').trim();
    if (!wanted) {
        return { ok: false, error: 'No Groq model configured. Set one in Home → Groq model.' };
    }

    const exact = listing.models.find(model => model === wanted);
    if (exact) {
        return { ok: true, resolvedModel: exact };
    }

    const caseInsensitive = listing.models.find(model => model.toLowerCase() === wanted.toLowerCase());
    if (caseInsensitive) {
        return { ok: true, resolvedModel: caseInsensitive, corrected: true };
    }

    return {
        ok: false,
        error: `Groq has no model called "${wanted}". Available models: ${listing.models.sort().join(', ')}`,
        availableModels: listing.models,
    };
}

module.exports = {
    checkGeminiSetup,
    checkGroqSetup,
    listGeminiModels,
    listGroqModels,
    describeGroqKeyError,
    normalizeModelId,
    parseErrorBody,
};
