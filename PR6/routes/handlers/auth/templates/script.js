// src/main/pr6/routes/handlers/auth/templates/script.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('message');

    function showMessage(text, isError) {
        message.textContent = text;
        message.className = 'message show' + (isError ? ' error' : ' success');
    }

    function hideMessage() {
        message.className = 'message';
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        hideMessage();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Блокируем кнопку на время запроса
        const btn = form.querySelector('button');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Проверка...';

        const xhr = new XMLHttpRequest();
        const params = 'username=' + encodeURIComponent(username) + 
                     '&password=' + encodeURIComponent(password);

        xhr.open('GET', '/api/login?' + params, true);
        xhr.timeout = 10000;

        xhr.onload = function() {
            btn.disabled = false;
            btn.textContent = originalText;

            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.success) {
                        showMessage('✓ ' + res.message, false);
                        // Опционально: перенаправление после успешного входа
                        // setTimeout(() => window.location.href = '/', 1500);
                    } else {
                        showMessage('✗ ' + res.message, true);
                    }
                } catch (err) {
                    showMessage('Ошибка обработки ответа', true);
                }
            } else if (xhr.status === 401) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    showMessage('✗ ' + res.message, true);
                } catch {
                    showMessage('✗ Неверные учётные данные', true);
                }
            } else {
                showMessage('Ошибка сервера (' + xhr.status + ')', true);
            }
        };

        xhr.onerror = function() {
            btn.disabled = false;
            btn.textContent = originalText;
            showMessage('Ошибка сети. Проверьте подключение.', true);
        };

        xhr.ontimeout = function() {
            btn.disabled = false;
            btn.textContent = originalText;
            showMessage('Превышено время ожидания ответа', true);
        };

        xhr.send();
    });

    // Очистка сообщения при вводе
    document.getElementById('username').addEventListener('input', hideMessage);
    document.getElementById('password').addEventListener('input', hideMessage);
});