document.addEventListener('DOMContentLoaded', () => {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            let isValid = true;
            const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

            inputs.forEach(input => {
                if (!validateInput(input)) {
                    isValid = false;
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('Пожалуйста, исправьте ошибки в форме перед отправкой.');
            }
        });

        // Валидация при потере фокуса
        form.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('blur', () => validateInput(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    validateInput(input);
                }
            });
        });
    });

    function validateInput(input) {
        const value = input.value.trim();
        let error = '';

        // Базовая проверка на пустоту
        if (input.hasAttribute('required') && !value) {
            error = 'Это поле обязательно для заполнения';
        } 
        // Проверка Email
        else if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                error = 'Введите корректный адрес электронной почты';
            }
        }
        // Проверка пароля (минимум 6 символов)
        else if (input.type === 'password' && value && value.length < 6) {
            error = 'Пароль должен содержать не менее 6 символов';
        }
        // Проверка телефона
        else if (input.type === 'tel' && value) {
            const phoneRegex = /^\+?[0-9]{10,12}$/;
            if (!phoneRegex.test(value.replace(/[-() ]/g, ''))) {
                error = 'Введите корректный номер телефона';
            }
        }

        showError(input, error);
        return !error;
    }

    function showError(input, message) {
        let errorElement = input.parentElement.querySelector('.error-message');
        
        if (message) {
            input.classList.add('invalid');
            if (!errorElement) {
                errorElement = document.createElement('span');
                errorElement.className = 'error-message';
                input.parentElement.appendChild(errorElement);
            }
            errorElement.textContent = message;
        } else {
            input.classList.remove('invalid');
            input.classList.add('valid');
            if (errorElement) {
                errorElement.remove();
            }
        }
    }
});