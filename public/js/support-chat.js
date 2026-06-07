document.addEventListener('DOMContentLoaded', () => {
    const widget = document.getElementById('support-chat-widget');
    if (!widget) return;

    const toggle = widget.querySelector('.support-chat-toggle');
    const close = widget.querySelector('.support-chat-close');
    const form = widget.querySelector('.support-chat-form');
    const input = widget.querySelector('.support-chat-input');
    const messages = widget.querySelector('.support-chat-messages');
    const sendButton = widget.querySelector('.support-chat-send');

    const storageKey = 'support_chat_history';
    let history = [];

    function escapeHtml(value) {
        const div = document.createElement('div');
        div.textContent = value;
        return div.innerHTML;
    }

    function addMessage(role, text) {
        const item = document.createElement('div');
        item.className = `support-chat-message ${role === 'user' ? 'is-user' : 'is-bot'}`;
        item.innerHTML = `<div class="support-chat-bubble">${escapeHtml(text)}</div>`;
        messages.appendChild(item);
        messages.scrollTop = messages.scrollHeight;
    }

    function saveHistory() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(history.slice(-8)));
        } catch (error) {
            console.warn('Не удалось сохранить историю чата:', error);
        }
    }

    function loadHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (Array.isArray(saved) && saved.length > 0) {
                history = saved.filter((item) => item && typeof item.content === 'string').slice(-8);
                messages.innerHTML = '';
                history.forEach((item) => addMessage(item.role, item.content));
            }
        } catch (error) {
            localStorage.removeItem(storageKey);
        }
    }

    function setOpen(isOpen) {
        widget.classList.toggle('is-open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) {
            setTimeout(() => input.focus(), 120);
        }
    }

    toggle.addEventListener('click', () => setOpen(!widget.classList.contains('is-open')));
    close.addEventListener('click', () => setOpen(false));

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.disabled = true;
        sendButton.disabled = true;

        history.push({ role: 'user', content: text });
        addMessage('user', text);
        saveHistory();

        const typing = document.createElement('div');
        typing.className = 'support-chat-message is-bot support-chat-typing';
        typing.innerHTML = '<div class="support-chat-bubble">Печатает...</div>';
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch('/api/support-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: history.slice(-8) })
            });
            const data = await response.json();
            typing.remove();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Не удалось получить ответ');
            }

            history.push({ role: 'assistant', content: data.answer });
            addMessage('assistant', data.answer);
            saveHistory();
        } catch (error) {
            typing.remove();
            addMessage('assistant', error.message || 'Сейчас не получилось ответить. Попробуйте ещё раз чуть позже.');
        } finally {
            input.disabled = false;
            sendButton.disabled = false;
            input.focus();
        }
    });

    loadHistory();
});
