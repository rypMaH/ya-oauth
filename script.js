// КОНФИГУРАЦИЯ
const CONFIG = {
    clientId: '513f041567bc4b46a9780a675bb88d5e',
    webhookUrl: 'https://n8n.riddler.digital/webhook-test1/yandex-oauth'
};

const app = {
    // Динамически определяем текущий URL (Redirect URI)
    // Это позволяет работать и локально, и на GitHub Pages без смены кода
    currentUri: window.location.href.split('#')[0],

    init() {
        // Проверяем, вернулся ли пользователь с токеном
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            this.handleCallback(hash);
        }
    },

    login() {
        // Формируем URL для авторизации (Implicit Flow)
        const authUrl = `https://oauth.yandex.ru/authorize?` + 
            `response_type=token` + 
            `&client_id=${CONFIG.clientId}` + 
            `&redirect_uri=${encodeURIComponent(this.currentUri)}`;

        window.location.href = authUrl;
    },

    async handleCallback(hash) {
        this.showStep('loading');
        
        // 1. Извлекаем токен из URL
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        
        // Очищаем адресную строку
        window.history.replaceState(null, null, this.currentUri);

        if (!accessToken) {
            this.showError('Токен авторизации не найден.');
            return;
        }

        try {
            // 2. Получаем данные профиля от Яндекса
            this.setLoadingStatus('Профиль...', 'Получаем данные пользователя');
            
            const userRes = await fetch('https://login.yandex.ru/info?format=json', {
                headers: { 'Authorization': `OAuth ${accessToken}` }
            });

            if (!userRes.ok) throw new Error('Ошибка получения профиля (API Яндекса)');
            const userInfo = await userRes.json();

            // 3. Отправляем всё на Webhook
            this.setLoadingStatus('Отправка...', 'Передаем данные в n8n');
            await this.sendToWebhook(accessToken, userInfo);

        } catch (error) {
            this.showError(error.message);
        }
    },

    async sendToWebhook(token, userInfo) {
        const payload = {
            source: 'yandex_oauth_app',
            timestamp: new Date().toISOString(),
            auth: { access_token: token },
            user: userInfo
        };

        try {
            // Пытаемся отправить данные
            // Используем no-cors как fallback, чтобы не пугать пользователя ошибками консоли,
            // если n8n не настроен на отправку CORS заголовков.
            try {
                await fetch(CONFIG.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (corsError) {
                console.warn('Стандартный fetch не прошел, пробуем no-cors mode', corsError);
                await fetch(CONFIG.webhookUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            // Успех
            document.getElementById('res-login').textContent = userInfo.login;
            document.getElementById('res-token').textContent = token;
            this.showStep('success');

        } catch (e) {
            console.error(e);
            this.showError('Не удалось отправить данные на Webhook.');
        }
    },

    setLoadingStatus(title, text) {
        document.getElementById('loading-title').textContent = title;
        document.getElementById('loading-text').textContent = text;
    },

    showStep(stepName) {
        ['start', 'loading', 'success', 'error'].forEach(step => {
            document.getElementById(`step-${step}`).classList.add('hidden');
        });
        document.getElementById(`step-${stepName}`).classList.remove('hidden');
    },

    showError(msg) {
        document.getElementById('error-msg').textContent = msg;
        this.showStep('error');
    },

    reset() {
        this.showStep('start');
    }
};

// Запуск
document.addEventListener('DOMContentLoaded', () => app.init());
