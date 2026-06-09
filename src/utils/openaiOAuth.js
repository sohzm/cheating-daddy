const http = require('http');
const crypto = require('crypto');
const { shell } = require('electron');
const storage = require('../storage');

const CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const ISSUER = 'https://auth.openai.com';
const AUTH_URL = `${ISSUER}/oauth/authorize`;
const TOKEN_URL = `${ISSUER}/oauth/token`;
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'api.connectors.read', 'api.connectors.invoke'];
const ORIGINATOR = 'codex_cli_rs';
const REDIRECT_PORT = 1455;
const REDIRECT_PATH = '/auth/callback';
const ACCOUNT_ID_CLAIM = 'https://api.openai.com/auth';

// Must use "localhost" (not 127.0.0.1) — the Codex public client's redirect URI is registered
// in OpenAI's Hydra allow-list as http://localhost:1455/auth/callback. An exact-string mismatch
// (e.g. 127.0.0.1) makes the authorize request fail with authorize_hydra_invalid_request.
function getRedirectUri() {
    return `http://localhost:${REDIRECT_PORT}${REDIRECT_PATH}`;
}

function base64UrlEncode(buffer) {
    return buffer.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createPkcePair() {
    const verifier = base64UrlEncode(crypto.randomBytes(32));
    const challenge = base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
    return { verifier, challenge };
}

function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') {
        return {};
    }

    const parts = token.split('.');
    if (parts.length < 2) {
        return {};
    }

    try {
        const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        return JSON.parse(payload);
    } catch (error) {
        console.warn('Failed to decode JWT payload:', error.message);
        return {};
    }
}

function buildAuthUrl({ redirectUri, state, codeChallenge }) {
    const url = new URL(AUTH_URL);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('id_token_add_organizations', 'true');
    url.searchParams.set('codex_cli_simplified_flow', 'true');
    url.searchParams.set('originator', ORIGINATOR);
    url.searchParams.set('state', state);
    return url.toString();
}

function resolveAccountId(idToken) {
    const payload = decodeJwtPayload(idToken);
    const claim = payload && payload[ACCOUNT_ID_CLAIM];
    const accountId = claim && claim.chatgpt_account_id;
    return typeof accountId === 'string' && accountId.length > 0 ? accountId : '';
}

function waitForOAuthCallback(port, expectedState) {
    let server = null;
    let settled = false;

    const promise = new Promise((resolve, reject) => {
        let timer;

        const cleanup = () => {
            clearTimeout(timer);
            if (server) {
                server.close(() => {});
            }
        };

        const settleResolve = value => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        const settleReject = error => {
            if (settled) return;
            settled = true;
            reject(error);
        };

        server = http.createServer((req, res) => {
            const requestUrl = new URL(req.url, `http://127.0.0.1:${port}`);

            if (requestUrl.pathname !== REDIRECT_PATH) {
                res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('Not found');
                return;
            }

            const error = requestUrl.searchParams.get('error');
            const code = requestUrl.searchParams.get('code');
            const state = requestUrl.searchParams.get('state');

            if (state !== expectedState) {
                res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('Invalid OAuth state');
                cleanup();
                settleReject(new Error('OAuth state mismatch'));
                return;
            }

            if (error) {
                res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
                res.end(`OAuth error: ${error}`);
                cleanup();
                settleReject(new Error(`OAuth error: ${error}`));
                return;
            }

            if (!code) {
                res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
                res.end('Missing authorization code');
                cleanup();
                settleReject(new Error('Missing authorization code'));
                return;
            }

            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                    <body style="font-family: sans-serif; padding: 24px;">
                        <h3>OpenAI account connected</h3>
                        <p>You can return to the desktop app now.</p>
                    </body>
                </html>
            `);

            cleanup();
            settleResolve({ code });
        });

        server.on('error', error => {
            cleanup();
            settleReject(error);
        });

        timer = setTimeout(
            () => {
                cleanup();
                settleReject(new Error('OAuth login timed out'));
            },
            5 * 60 * 1000
        );

        server.listen(port, '127.0.0.1');
    });

    return {
        promise,
        close: () => {
            if (server) {
                server.close(() => {});
            }
        },
    };
}

async function exchangeToken({ code = '', codeVerifier = '', redirectUri = '', grantType = 'authorization_code', refreshToken = '' }) {
    const body = new URLSearchParams();
    body.set('client_id', CLIENT_ID);
    body.set('grant_type', grantType);
    if (grantType === 'authorization_code') {
        body.set('code', code);
        body.set('redirect_uri', redirectUri);
        body.set('code_verifier', codeVerifier);
    } else {
        body.set('refresh_token', refreshToken);
        body.set('scope', 'openid profile email offline_access');
    }
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = data.error_description || data.error || `OAuth token request failed (${response.status})`;
        throw new Error(message);
    }
    return data;
}

function normalizeTokenResponse(tokenResponse, existingAuth = null) {
    const idToken = tokenResponse.id_token || existingAuth?.idToken || '';
    const payload = decodeJwtPayload(idToken);
    const now = Date.now();
    const expiresIn = Number.parseInt(tokenResponse.expires_in, 10);
    const expiresAt = Number.isFinite(expiresIn) ? now + expiresIn * 1000 : existingAuth?.expiresAt || 0;
    const accountId = resolveAccountId(idToken) || existingAuth?.accountId || '';
    const accountEmail = payload.email || existingAuth?.accountEmail || '';

    return {
        provider: 'openai',
        accountId,
        accountEmail,
        displayName: accountEmail || accountId || 'ChatGPT account',
        tokenType: tokenResponse.token_type || 'Bearer',
        accessToken: tokenResponse.access_token || existingAuth?.accessToken || '',
        refreshToken: tokenResponse.refresh_token || existingAuth?.refreshToken || '',
        apiKey: existingAuth?.apiKey || '',
        idToken,
        expiresAt,
        createdAt: existingAuth?.createdAt || now,
        updatedAt: now,
    };
}

async function connectOpenAI({ existingAuth = null } = {}) {
    const redirectUri = getRedirectUri();
    const state = base64UrlEncode(crypto.randomBytes(24));
    const { verifier, challenge } = createPkcePair();
    const authUrl = buildAuthUrl({ redirectUri, state, codeChallenge: challenge });

    const callback = waitForOAuthCallback(REDIRECT_PORT, state);
    try {
        await shell.openExternal(authUrl);
    } catch (error) {
        callback.close();
        throw error;
    }

    const { code } = await callback.promise;
    const tokenResponse = await exchangeToken({ code, codeVerifier: verifier, redirectUri });
    const auth = normalizeTokenResponse(tokenResponse, existingAuth);
    // Mint the OpenAI API key now, while the fresh id_token still carries organizations
    // (required by the exchange; refreshed id_tokens drop them). Realtime needs this key.
    try {
        auth.apiKey = await exchangeIdTokenForApiKey(auth.idToken);
    } catch (error) {
        console.warn('[OAuth] api-key mint at connect failed:', error.message);
        auth.apiKey = '';
    }
    storage.setOpenaiOAuth(auth);
    return auth;
}

async function refreshOpenAIAuth(existingAuth) {
    if (!existingAuth?.refreshToken) {
        throw new Error('No refresh token stored');
    }
    const tokenResponse = await exchangeToken({ grantType: 'refresh_token', refreshToken: existingAuth.refreshToken });
    const auth = normalizeTokenResponse(tokenResponse, existingAuth);
    storage.setOpenaiOAuth(auth);
    return auth;
}

// Raw token-exchange: id_token -> OpenAI API key (codex obtain_api_key). The id_token MUST still
// contain organizations, which only the authorize-time id_token has (id_token_add_organizations=true);
// a refreshed id_token drops orgs. So this is minted at connect time, not from a refreshed token.
async function exchangeIdTokenForApiKey(idToken) {
    if (!idToken) {
        throw new Error('No id_token available — reconnect the ChatGPT account');
    }
    const body = new URLSearchParams();
    body.set('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
    body.set('client_id', CLIENT_ID);
    body.set('requested_token', 'openai-api-key');
    body.set('subject_token', idToken);
    body.set('subject_token_type', 'urn:ietf:params:oauth:token-type:id_token');

    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
    });
    const rawBody = await response.text().catch(() => '');
    let data = {};
    try {
        data = JSON.parse(rawBody);
    } catch {
        // non-JSON body
    }
    if (!response.ok || !data.access_token) {
        console.error(`[OAuth] api-key exchange failed HTTP ${response.status}:`, rawBody.slice(0, 800));
        const errStr = typeof data.error === 'string' ? data.error : data.error ? JSON.stringify(data.error) : '';
        const message = data.error_description || errStr || `API key exchange failed (${response.status})`;
        throw new Error(message);
    }
    return data.access_token;
}

// Returns the OpenAI API key for api.openai.com (realtime). Prefers the one minted+stored at connect
// time; only mints on demand if missing (which needs an org-bearing id_token, i.e. a fresh connect).
async function obtainApiKey() {
    const auth = storage.getOpenaiOAuth();
    if (!auth) {
        throw new Error('ChatGPT account not connected');
    }
    if (auth.apiKey) {
        return auth.apiKey;
    }
    const apiKey = await exchangeIdTokenForApiKey(auth.idToken);
    storage.setOpenaiOAuth({ ...auth, apiKey });
    return apiKey;
}

function getOpenAIAuthStatus() {
    const auth = storage.getOpenaiOAuth();
    if (!auth) {
        return {
            connected: false,
            expired: false,
            accountLabel: '',
            accountEmail: '',
            expiresAt: 0,
        };
    }

    const expired = auth.expiresAt ? auth.expiresAt <= Date.now() : false;
    return {
        connected: true,
        expired,
        accountLabel: auth.displayName || auth.accountEmail || auth.accountId || 'Connected account',
        accountEmail: auth.accountEmail || '',
        expiresAt: auth.expiresAt || 0,
    };
}

async function ensureValidOpenAIAuth() {
    const auth = storage.getOpenaiOAuth();
    if (!auth) return null;
    if (auth.expiresAt && auth.expiresAt > Date.now() + 60_000) return auth;
    if (!auth.refreshToken) return auth;
    return refreshOpenAIAuth(auth);
}

async function disconnectOpenAI() {
    return storage.clearOpenaiOAuth();
}

module.exports = {
    connectOpenAI,
    disconnectOpenAI,
    ensureValidOpenAIAuth,
    obtainApiKey,
    getOpenAIAuthStatus,
    refreshOpenAIAuth,
    // pure helpers (exported for tests)
    buildAuthUrl,
    getRedirectUri,
    decodeJwtPayload,
    resolveAccountId,
    normalizeTokenResponse,
    CLIENT_ID,
    SCOPES,
    REDIRECT_PORT,
    REDIRECT_PATH,
};
