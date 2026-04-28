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
 * User Info
 */
async function fetchUserInfo(token) {
    try {
        const response = await fetch('https://login.yandex.ru/info?format=json', {
            headers: {
                'Authorization': `OAuth ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('User info fetch error:', error);
        return null;
    }
}
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
    actionContainer: document.getElementById('action-container')
};

/**
 * Initialization
 */
function init() {
    setupEventListeners();
    checkUrlHash();
}

function setupEventListeners() {
    elements.loginBtn.addEventListener('click', () => {
        handleLogin();
    });
    
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
        redirect_uri: CONFIG.REDIRECT_URI,
        force_confirm: 'yes' // Forces account selection/confirmation in Yandex
    });
    
    window.location.href = `${CONFIG.AUTH_URL}?${params.toString()}`;
}

async function checkUrlHash() {
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
        showLoading('Fetching user info...');
        const userData = await fetchUserInfo(accessToken);
        
        if (userData) {
            sendTokenToWebhook(accessToken);
        } else {
            showError('User Info Failed', 'Could not fetch user information from Yandex.');
        }
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
        const text = await response.text(); 
        console.log('Webhook response:', text);

        let successMessage = 'Token has been securely delivered to the system.';
        try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object') {
                successMessage = data.message || data.msg || JSON.stringify(data);
            } else if (text && text.trim()) {
                successMessage = text;
            }
        } catch (e) {
            if (text && text.trim()) {
                successMessage = text;
            }
        }

        showSuccess(`Integration Successful (${response.status})`, successMessage);

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
    elements.retryBtn.classList.add('hidden');

    // Show login button again so they can auth another account
    elements.loginBtn.textContent = 'Connect Another Account';
    elements.loginBtn.classList.remove('hidden');

    showNotification('success', title, message);
}

function showError(title, message) {
    state.status = 'error';

    // Hide spinner
    elements.loadingState.classList.add('hidden');

    // Show appropriate buttons
    if (state.token) {
        elements.retryBtn.classList.remove('hidden');
        elements.loginBtn.textContent = 'Connect Another Account';
        elements.loginBtn.classList.remove('hidden');
    } else {
        elements.loginBtn.textContent = 'Connect Yandex Account';
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