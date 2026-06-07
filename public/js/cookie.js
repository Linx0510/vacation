document.addEventListener('DOMContentLoaded', () => {
    const banner = document.getElementById('cookie-banner');
    const settingsModal = document.getElementById('cookie-settings-modal');
    
    const btnAcceptFast = document.getElementById('accept-cookies-fast');
    const btnOpenSettings = document.getElementById('open-cookie-settings');
    const btnCloseSettings = document.querySelector('.close-settings');
    
    const btnSaveSettings = document.getElementById('cookie-save-settings');
    const btnAcceptAll = document.getElementById('cookie-accept-all');
    const btnRejectAll = document.getElementById('cookie-reject-all');

    const checkFunctional = document.getElementById('cookie-functional');
    const checkAnalytics = document.getElementById('cookie-analytics');
    const checkMarketing = document.getElementById('cookie-marketing');

    // Функции для работы с Cookie
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "; expires=" + date.toUTCString();
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for(let i=0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Показываем баннер всегда (для отображения)
    setTimeout(() => {
        if (banner) {
            banner.style.display = 'block';
            setTimeout(() => banner.classList.add('show'), 10);
        }
    }, 1000);

    // Функция для сброса куки (для тестирования)
    window.resetCookieConsent = () => {
        setCookie('cookie_consent', '', -1);
        location.reload();
    };

    // Быстрое принятие всего
    if (btnAcceptFast) {
        btnAcceptFast.onclick = () => {
            saveConsent({ functional: true, analytics: true, marketing: true });
        };
    }

    // Открытие настроек
    if (btnOpenSettings) {
        btnOpenSettings.onclick = () => {
            settingsModal.style.display = 'flex';
            setTimeout(() => settingsModal.classList.add('active'), 10);
        };
    }

    // Закрытие настроек
    if (btnCloseSettings) {
        btnCloseSettings.onclick = () => {
            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.style.display = 'none', 300);
        };
    }

    // Глобальная функция для открытия настроек из футера
    window.openCookieSettings = () => {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            setTimeout(() => settingsModal.classList.add('active'), 10);
        }
    };

    // Сохранение настроек
    if (btnSaveSettings) {
        btnSaveSettings.onclick = () => {
            saveConsent({
                functional: checkFunctional.checked,
                analytics: checkAnalytics.checked,
                marketing: checkMarketing.checked
            });
        };
    }

    // Принять всё в модалке
    if (btnAcceptAll) {
        btnAcceptAll.onclick = () => {
            saveConsent({ functional: true, analytics: true, marketing: true });
        };
    }

    // Отклонить всё (кроме необходимых)
    if (btnRejectAll) {
        btnRejectAll.onclick = () => {
            saveConsent({ functional: false, analytics: false, marketing: false });
        };
    }

    function saveConsent(settings) {
        setCookie('cookie_consent', JSON.stringify(settings), 365);
        if (banner) banner.classList.remove('show');
        if (settingsModal) settingsModal.classList.remove('active');
        setTimeout(() => {
            if (banner) banner.style.display = 'none';
            if (settingsModal) settingsModal.style.display = 'none';
        }, 300);
    }
});
