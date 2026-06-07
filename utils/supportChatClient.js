const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const SUPPORT_SYSTEM_PROMPT = process.env.SUPPORT_BOT_SYSTEM_PROMPT || `Ты чат-бот службы поддержки платформы «Вакация».
Отвечай дружелюбно, кратко и по делу на русском языке.
Помогай пользователям разобраться с мероприятиями, регистрацией, личным кабинетом, отзывами, предложениями, избранным и контактами организаторов.
Не обещай действий от имени администрации, не принимай оплаты и не запрашивай пароли, паспортные данные, коды из SMS или банковские данные.
Если вопрос требует участия человека, предложи оставить заявку через форму обратной связи на сайте.`;

let gigachatToken = null;
let gigachatTokenExpiresAt = 0;

function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];

    return history
        .filter((item) => item && typeof item.content === 'string')
        .slice(-8)
        .map((item) => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            content: item.content.trim().slice(0, 1500)
        }))
        .filter((item) => item.content.length > 0);
}

function getProvider() {
    const explicitProvider = (process.env.AI_PROVIDER || process.env.SUPPORT_AI_PROVIDER || '').trim().toLowerCase();
    if (explicitProvider) return explicitProvider;
    if (process.env.YANDEX_API_KEY && process.env.YANDEX_FOLDER_ID) return 'yandex';
    if (process.env.GIGACHAT_AUTH_KEY) return 'gigachat';
    return 'none';
}

function buildSupportMessages(message, history) {
    return [
        { role: 'system', content: SUPPORT_SYSTEM_PROMPT },
        ...normalizeHistory(history),
        { role: 'user', content: message }
    ];
}

function toYandexMessages(messages) {
    return messages.map((message) => ({
        role: message.role,
        text: message.content
    }));
}

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        return { raw: text };
    }
}

function parseJsonText(text) {
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch (error) {
        return { raw: text };
    }
}

function getHttpErrorMessage(providerName, response, payload) {
    const providerError = payload?.error?.message || payload?.message || payload?.error_description || payload?.raw || response.statusText;
    return `${providerName}: ошибка API ${response.status} — ${providerError}`;
}

function getNetworkErrorMessage(providerName, error) {
    const code = error?.code || error?.cause?.code || '';
    const reason = error?.message || 'неизвестная ошибка сети';

    if (code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'SELF_SIGNED_CERT_IN_CHAIN' || code === 'CERT_HAS_EXPIRED') {
        return `${providerName}: не удалось проверить SSL-сертификат (${code}). Установите сертификаты Минцифры/Сбера или запустите Node.js с NODE_EXTRA_CA_CERTS. Для локальной учебной проверки можно временно поставить GIGACHAT_ALLOW_INSECURE_TLS=true в .env.`;
    }

    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        return `${providerName}: не удалось найти адрес сервера (${code}). Проверьте интернет, DNS и доступность доменов ngw.devices.sberbank.ru и gigachat.devices.sberbank.ru.`;
    }

    if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ECONNREFUSED') {
        return `${providerName}: соединение с API не установлено (${code}). Проверьте интернет, VPN/прокси, firewall и доступ к порту 9443 для ngw.devices.sberbank.ru.`;
    }

    return `${providerName}: fetch failed / ошибка подключения — ${reason}${code ? ` (${code})` : ''}`;
}

function normalizeAuthKey(value) {
    return String(value || '')
        .trim()
        .replace(/^Basic\s+/i, '')
        .replace(/^Bearer\s+/i, '')
        .trim();
}

function requestJson(urlString, options = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlString);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        const body = options.body || '';
        const allowInsecureTls = String(process.env.GIGACHAT_ALLOW_INSECURE_TLS || '').toLowerCase() === 'true';

        const requestOptions = {
            method: options.method || 'GET',
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: `${url.pathname}${url.search}`,
            headers: {
                ...(options.headers || {}),
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
            },
            timeout: Number(process.env.GIGACHAT_REQUEST_TIMEOUT_MS || 30000)
        };

        if (isHttps && allowInsecureTls) {
            requestOptions.rejectUnauthorized = false;
        }

        const req = client.request(requestOptions, (res) => {
            let text = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { text += chunk; });
            res.on('end', () => {
                const data = parseJsonText(text);
                resolve({
                    ok: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    data
                });
            });
        });

        req.on('timeout', () => {
            req.destroy(Object.assign(new Error('Превышено время ожидания ответа от API'), { code: 'ETIMEDOUT' }));
        });

        req.on('error', reject);

        if (body) req.write(body);
        req.end();
    });
}

async function askYandex(message, history) {
    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;
    const model = process.env.YANDEX_MODEL || 'yandexgpt-lite';

    if (!apiKey || !folderId) {
        throw new Error('Не настроены YANDEX_API_KEY и/или YANDEX_FOLDER_ID');
    }

    const modelUri = model.startsWith('gpt://') ? model : `gpt://${folderId}/${model}`;
    let response;
    try {
        response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Api-Key ${apiKey}`,
                'x-folder-id': folderId
            },
            body: JSON.stringify({
                modelUri,
                completionOptions: {
                    stream: false,
                    temperature: Number(process.env.SUPPORT_BOT_TEMPERATURE || 0.3),
                    maxTokens: String(process.env.SUPPORT_BOT_MAX_TOKENS || 600)
                },
                messages: toYandexMessages(buildSupportMessages(message, history))
            })
        });
    } catch (error) {
        throw new Error(getNetworkErrorMessage('YandexGPT', error));
    }

    const data = await readJsonResponse(response);
    if (!response.ok) {
        throw new Error(getHttpErrorMessage('YandexGPT', response, data));
    }

    const answer = data?.alternatives?.[0]?.message?.text;
    if (!answer) {
        throw new Error('YandexGPT вернул пустой ответ');
    }

    return answer.trim();
}

async function getGigaChatToken() {
    const authKey = normalizeAuthKey(process.env.GIGACHAT_AUTH_KEY);
    const scope = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
    const oauthUrl = process.env.GIGACHAT_OAUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';

    if (!authKey) {
        throw new Error('Не настроен GIGACHAT_AUTH_KEY');
    }

    const now = Date.now();
    if (gigachatToken && gigachatTokenExpiresAt - 60_000 > now) {
        return gigachatToken;
    }

    let response;
    try {
        response = await requestJson(oauthUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'RqUID': crypto.randomUUID(),
                'Authorization': `Basic ${authKey}`
            },
            body: new URLSearchParams({ scope }).toString()
        });
    } catch (error) {
        throw new Error(getNetworkErrorMessage('GigaChat OAuth', error));
    }

    const data = response.data;
    if (!response.ok) {
        throw new Error(getHttpErrorMessage('GigaChat OAuth', response, data));
    }

    if (!data.access_token) {
        throw new Error('GigaChat OAuth не вернул access_token');
    }

    gigachatToken = data.access_token;
    // expires_at в документации приходит как timestamp; иногда интеграции возвращают миллисекунды.
    gigachatTokenExpiresAt = Number(data.expires_at || 0);
    if (gigachatTokenExpiresAt < 10_000_000_000) {
        gigachatTokenExpiresAt *= 1000;
    }
    if (!gigachatTokenExpiresAt) {
        gigachatTokenExpiresAt = Date.now() + 25 * 60 * 1000;
    }

    return gigachatToken;
}

async function askGigaChat(message, history) {
    const token = await getGigaChatToken();
    const baseUrl = (process.env.GIGACHAT_API_BASE_URL || 'https://gigachat.devices.sberbank.ru/api').replace(/\/$/, '');
    const model = process.env.GIGACHAT_MODEL || 'GigaChat';

    let response;
    try {
        response = await requestJson(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model,
                messages: buildSupportMessages(message, history),
                temperature: Number(process.env.SUPPORT_BOT_TEMPERATURE || 0.3),
                max_tokens: Number(process.env.SUPPORT_BOT_MAX_TOKENS || 600)
            })
        });
    } catch (error) {
        throw new Error(getNetworkErrorMessage('GigaChat', error));
    }

    const data = response.data;
    if (!response.ok) {
        throw new Error(getHttpErrorMessage('GigaChat', response, data));
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) {
        throw new Error('GigaChat вернул пустой ответ');
    }

    return answer.trim();
}

async function askSupportBot(message, history = []) {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) {
        throw new Error('Сообщение не может быть пустым');
    }
    if (text.length > 2000) {
        throw new Error('Сообщение слишком длинное. Максимум 2000 символов');
    }

    const provider = getProvider();
    if (provider === 'yandex' || provider === 'yandexgpt') {
        return askYandex(text, history);
    }
    if (provider === 'gigachat' || provider === 'sber') {
        return askGigaChat(text, history);
    }

    throw new Error('AI-провайдер не настроен. Укажите AI_PROVIDER=yandex или AI_PROVIDER=gigachat и добавьте ключи в .env');
}

module.exports = {
    askSupportBot,
    getProvider
};
