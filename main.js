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
    actionContainer: document.getElementById('action-container'),
    userInfo: document.getElementById('user-info'),
    userAvatar: document.getElementById('user-avatar'),
    userLogin: document.getElementById('user-login'),
    userName: document.getElementById('user-name'),
    accountSelectorBtn: document.getElementById('account-selector-btn'),
    accountsDropdown: document.getElementById('accounts-dropdown'),
    accountsList: document.getElementById('accounts-list'),
    addAccountBtn: document.getElementById('add-account-btn')
};

/**
 * Initialization
 */
function init() {
    setupEventListeners();
    renderAccounts();
    checkUrlHash();
}

function setupEventListeners() {
    elements.loginBtn.addEventListener('click', () => {
        if (state.token && JSON.parse(localStorage.getItem('yandex_accounts') || '[]').length > 0) {
            sendTokenToWebhook(state.token);
        } else {
            handleLogin();
        }
    });
    
    elements.retryBtn.addEventListener('click', () => {
        if (state.token) {
            sendTokenToWebhook(state.token);
        } else {
            handleLogin();
        }
    });

    if (elements.accountSelectorBtn) {
        elements.accountSelectorBtn.addEventListener('click', () => {
            elements.accountsDropdown.classList.toggle('hidden');
            elements.accountsDropdown.classList.toggle('flex');
        });
    }

    if (elements.addAccountBtn) {
        elements.addAccountBtn.addEventListener('click', () => {
            handleLogin();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (elements.userInfo && !elements.userInfo.contains(e.target)) {
            elements.accountsDropdown?.classList.add('hidden');
            elements.accountsDropdown?.classList.remove('flex');
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
            saveAccount(userData, accessToken);
            renderAccounts();
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
 * User Display & Accounts Management
 */
function saveAccount(userData, token) {
    const accounts = JSON.parse(localStorage.getItem('yandex_accounts') || '[]');
    const avatarId = userData.default_avatar_id;
    const avatarUrl = avatarId ? `https://avatars.yandex.net/get-yapic/${avatarId}/128` : '';
    const newAccount = {
        id: userData.id,
        login: userData.login,
        name: userData.real_name || userData.display_name || '',
        avatarUrl,
        token
    };
    
    const existingIndex = accounts.findIndex(a => a.id === userData.id);
    if (existingIndex >= 0) {
        accounts[existingIndex] = newAccount;
    } else {
        accounts.push(newAccount);
    }
    
    localStorage.setItem('yandex_accounts', JSON.stringify(accounts));
    localStorage.setItem('active_yandex_account', userData.id);
}

function renderAccounts() {
    const accounts = JSON.parse(localStorage.getItem('yandex_accounts') || '[]');
    const activeId = localStorage.getItem('active_yandex_account');
    
    if (accounts.length === 0) {
        elements.userInfo.classList.add('hidden');
        elements.userInfo.classList.remove('flex');
        elements.loginBtn.classList.remove('hidden');
        elements.loginBtn.textContent = 'Connect Yandex Account';
        return;
    }
    
    const activeAccount = accounts.find(a => a.id === activeId) || accounts[0];
    localStorage.setItem('active_yandex_account', activeAccount.id);
    state.token = activeAccount.token;

    // Update active account display
    if (activeAccount.avatarUrl) {
        elements.userAvatar.src = activeAccount.avatarUrl;
        elements.userAvatar.classList.remove('hidden');
    } else {
        elements.userAvatar.classList.add('hidden');
    }
    elements.userLogin.textContent = '@' + activeAccount.login;
    elements.userName.textContent = activeAccount.name;
    
    elements.userInfo.classList.remove('hidden');
    elements.userInfo.classList.add('flex');
    
    // Update dropdown list
    elements.accountsList.innerHTML = '';
    accounts.forEach(acc => {
        if (acc.id === activeAccount.id) return; // Skip active one
        
        const btn = document.createElement('button');
        btn.className = 'w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0';
        
        const imgHtml = acc.avatarUrl 
            ? `<img src="${acc.avatarUrl}" alt="Avatar" class="w-8 h-8 rounded-full border border-border object-cover bg-muted shrink-0">`
            : `<div class="w-8 h-8 rounded-full border border-border bg-muted shrink-0"></div>`;
            
        btn.innerHTML = `
            ${imgHtml}
            <div class="flex-1 min-w-0">
                <p class="font-medium text-foreground text-sm truncate">@${acc.login}</p>
                <p class="text-xs text-muted-foreground truncate">${acc.name}</p>
            </div>
        `;
        
        btn.addEventListener('click', () => {
            localStorage.setItem('active_yandex_account', acc.id);
            elements.accountsDropdown.classList.add('hidden');
            elements.accountsDropdown.classList.remove('flex');
            renderAccounts();
            sendTokenToWebhook(acc.token);
        });
        
        elements.accountsList.appendChild(btn);
    });

    elements.loginBtn.classList.remove('hidden');
    elements.loginBtn.textContent = 'Send Selected Token';
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

    const hasAccounts = JSON.parse(localStorage.getItem('yandex_accounts') || '[]').length > 0;
    
    if (hasAccounts) {
        elements.loginBtn.textContent = 'Send Selected Token';
        elements.loginBtn.classList.remove('hidden');
    } else {
        elements.loginBtn.textContent = 'Connect Yandex Account';
        elements.loginBtn.classList.remove('hidden');
    }

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
