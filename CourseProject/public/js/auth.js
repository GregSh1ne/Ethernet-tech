document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.querySelector('form');
    const toggleLink = document.querySelector('.text-center a'); // Ссылка "Создать аккаунт"
    const submitBtn = authForm.querySelector('button[type="submit"]');
    const title = document.querySelector('h1');
    const subTitle = document.querySelector('p.small');

    let isLoginMode = true; // Переключатель режима

    // 1. Переключение между Входом и Регистрацией
    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        // Меняем текст в интерфейсе под выбранный режим
        if (isLoginMode) {
            title.textContent = 'MOVIEHUB';
            subTitle.textContent = 'Авторизуйтесь, чтобы продолжить';
            submitBtn.textContent = 'ВОЙТИ В СИСТЕМУ';
            toggleLink.textContent = 'Создать аккаунт';
        } else {
            title.textContent = 'РЕГИСТРАЦИЯ';
            subTitle.textContent = 'Присоединяйтесь к сообществу киноманов';
            submitBtn.textContent = 'ЗАРЕГИСТРИРОВАТЬСЯ';
            toggleLink.textContent = 'Уже есть аккаунт? Войти';
        }
    });

    // 2. Обработка отправки формы
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const login = authForm.querySelector('input[type="text"]').value;
        const password = authForm.querySelector('input[type="password"]').value;

        // Определяем эндпоинт в зависимости от режима
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Ошибка аутентификации');
            }

            if (isLoginMode) {
                // ПРИ ВХОДЕ: Сохраняем данные в localStorage
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userLogin', data.user.login);
                localStorage.setItem('userRole', data.user.role);

                alert('Вход выполнен успешно!');
                window.location.href = 'index.html'; // Редирект на главную
            } else {
                // ПРИ РЕГИСТРАЦИИ: Просто уведомляем и переключаем на вход
                alert('Регистрация прошла успешно! Теперь войдите в систему.');
                toggleLink.click(); // Имитируем клик для перехода к форме входа
            }

        } catch (err) {
            alert(err.message);
        }
    });
});