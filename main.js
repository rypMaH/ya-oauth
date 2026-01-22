/**
 * Configuration
 */
const CONFIG = {
    CLIENT_ID: '513f041567bc4b46a9780a675bb88d5e',
    WEBHOOK_URL: 'https://n8n.riddler.digital/webhook/yandex-oauth',
    REDIRECT_URI: window.location.href.split('#')[0], // Current URL without hash
    AUTH_URL: 'https://oauth.yandex.com/authorize'
};

/**
 * State Management
 */
const state = {
    token: null,
    status: 'idle', // idle, loading, success, error
    errorMessage: ''
};

/**
 * DOM Elements
 */
const elements = {
    loginBtn: document.getElementById('login-btn'),
    retryBtn: document.getElementById('retry-btn'),
    loadingState: document.getElementById('loading-state'),
    statusContainer: document.getElementById('status-container'),
    statusIcon: document.getElementById('status-icon'),
    statusTitle: document.getElementById('status-title'),
    statusMessage: document.getElementById('status-message'),
    actionContainer: document.getElementById('action-container') // Parent of buttons
};

/**
 * Initialization
 */
function init() {
    setupEventListeners();
    checkUrlHash();
}

function setupEventListeners() {
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.retryBtn.addEventListener('click', () => {
        if (state.token) {
            sendTokenToWebhook(state.token);
        } else {
            handleLogin();
        }
    });
}

/**
 * Authentication Flow
 */
function handleLogin() {
    const params = new URLSearchParams({
        response_type: 'token',
        client_id: CONFIG.CLIENT_ID,
        redirect_uri: CONFIG.REDIRECT_URI
    });
    
    window.location.href = `${CONFIG.AUTH_URL}?${params.toString()}`;
}

function checkUrlHash() {
    const hash = window.location.hash.substring(1); // Remove #
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    // Clear hash to clean up URL
    history.replaceState(null, null, ' ');

    if (error) {
        showError('Authentication Failed', `Yandex returned an error: ${error}`);
        return;
    }

    if (accessToken) {
        state.token = accessToken;
        sendTokenToWebhook(accessToken);
    }
}

/**
 * Webhook Integration
 */
async function sendTokenToWebhook(token) {
    showLoading('Sending token to secure webhook...');

    try {
        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token,
                timestamp: new Date().toISOString(),
                source: 'ya-oauth-spa'
            })
        });

        if (!response.ok) {
            let errorMessage = `Webhook returned status: ${response.status}`;
            try {
                const text = await response.text();
                try {
                    const errorData = JSON.parse(text);
                    if (errorData && typeof errorData === 'object') {
                        const code = errorData.code || errorData.statusCode || response.status;
                        const msg = errorData.message || errorData.error || 'Unknown error';
                        errorMessage = `Error ${code}: ${msg}`;
                    }
                } catch (jsonError) {
                    // Not JSON, use text content if available and not empty
                    if (text && text.trim()) {
                        errorMessage = `Error ${response.status}: ${text.substring(0, 100)}`;
                    }
                }
            } catch (readError) {
                console.warn('Could not read webhook error response:', readError);
            }
            throw new Error(errorMessage);
        }

        // Try to parse response if JSON, otherwise assume text ok
        const data = await response.text(); 
        console.log('Webhook response:', data);

        showSuccess('Integration Successful', 'Token has been securely delivered to the system.');

    } catch (error) {
        console.error('Webhook error:', error);
        showError('Webhook Delivery Failed', error.message || 'Could not connect to the webhook endpoint.');
        elements.retryBtn.classList.remove('hidden');
    }
}

/**
 * UI Updates
 */
const NOTIFICATION_STYLES = {
    success: {
        classes: 'bg-green-50 text-green-900 border-green-200',
        icon: '✅'
    },
    error: {
        classes: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: '⚠️'
    }
};

function showNotification(type, title, message) {
    const style = NOTIFICATION_STYLES[type];
    if (!style) return;

    elements.statusContainer.className = `rounded-lg p-4 text-sm border ${style.classes}`;
    elements.statusIcon.innerHTML = style.icon;
    elements.statusTitle.textContent = title;
    elements.statusMessage.textContent = message;
    elements.statusContainer.classList.remove('hidden');
}

function showLoading(message) {
    state.status = 'loading';
    
    // Hide buttons, show spinner
    elements.loginBtn.classList.add('hidden');
    elements.retryBtn.classList.add('hidden');
    elements.loadingState.classList.remove('hidden');
    
    // Update status area (optional, usually spinner is enough, but we can show status too)
    hideStatus();
}

function showSuccess(title, message) {
    state.status = 'success';
    
    // Hide spinner
    elements.loadingState.classList.add('hidden');
    elements.loginBtn.classList.add('hidden'); // Stay hidden on success? Or allow re-login?
    // Let's allow re-login if they want, but maybe minimal
    elements.loginBtn.textContent = 'Reconnect / New Token';
    elements.loginBtn.classList.remove('hidden');
    elements.retryBtn.classList.add('hidden');

    showNotification('success', title, message);
}

function showError(title, message) {
    state.status = 'error';
    
    // Hide spinner
    elements.loadingState.classList.add('hidden');
    
    // Show appropriate buttons
    if (state.token) {
        elements.retryBtn.classList.remove('hidden');
        elements.loginBtn.classList.add('hidden');
    } else {
        elements.loginBtn.classList.remove('hidden');
        elements.retryBtn.classList.add('hidden');
    }

    showNotification('error', title, message);
}

function hideStatus() {
    elements.statusContainer.classList.add('hidden');
}

// Start
init();
