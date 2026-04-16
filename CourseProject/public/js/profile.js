// 1. Инициализация: проверяем, авторизован ли пользователь
const userId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        // Если ID пользователя нет в браузере, отправляем его на страницу входа
        window.location.href = 'auth.html';
        return;
    }

    loadUserProfile();
    loadUserReviews();

    // Обработка кнопки выхода
    const logoutBtn = document.querySelector('.btn-outline-danger');
    logoutBtn.addEventListener('click', () => {
        localStorage.clear(); // Полная очистка данных сессии
        window.location.href = 'index.html';
    });
});

/**
 * Загрузка метаданных профиля и списка избранного
 */
async function loadUserProfile() {
    try {
        const res = await fetch(`/api/user/profile/${userId}`);
        if (!res.ok) throw new Error('Ошибка при загрузке профиля');
        
        const user = await res.json();

        // Обновление интерфейса данными из базы
        document.querySelector('h3').textContent = user.login;
        document.querySelector('.avatar-circle').textContent = user.login.charAt(0).toUpperCase();
        
        // Обновление счетчиков (статистика)
        const stats = document.querySelectorAll('.fw-bold');
        stats[1].textContent = user.favorite_list.length; // Количество избранных персон

        // Отрисовка списка избранного
        const favoritesList = document.querySelector('.list-group-flush');
        favoritesList.innerHTML = ''; // Очищаем статику

        if (user.favorite_list.length === 0) {
            favoritesList.innerHTML = '<div class="p-3 opacity-50 text-center">Ваш список избранного пока пуст</div>';
        } else {
            user.favorite_list.forEach(person => {
                favoritesList.innerHTML += `
                    <div class="list-group-item bg-transparent py-3 d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0 fw-bold"><a href="person.html?id=${person._id}">${person.surname_name}</a></h6>
                            <small class="opacity-50">${person.roles.join(', ')}</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-link btn-sm p-0 text-muted" onclick="removeFromFavorites('${person._id}')">Удалить</button>
                        </div>
                    </div>
                `;
            });
        }

    } catch (err) {
        console.error(err);
    }
}

/**
 * Загрузка истории отзывов пользователя
 */
async function loadUserReviews() {
    try {
        const res = await fetch(`/api/reviews/user/${userId}`);
        const reviews = await res.json();

        const reviewsContainer = document.querySelector('.card-body .review-item').parentElement;
        const reviewCountStat = document.querySelectorAll('.fw-bold')[0];
        
        reviewCountStat.textContent = reviews.length; // Обновляем счетчик отзывов
        reviewsContainer.innerHTML = ''; // Очищаем статику

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="opacity-50 text-center">Вы еще не оставили ни одного отзыва.</p>';
        } else {
            reviews.forEach(review => {
                const date = new Date(review.published).toLocaleDateString('ru-RU');
                reviewsContainer.innerHTML += `
                    <div class="review-item mb-2 shadow-sm">
                        <div class="d-flex justify-content-between small mb-2">
                            <span>Фильм: <strong class="text-warning">${review.movie_id ? review.movie_id.title : 'Удаленный фильм'}</strong></span>
                            <span class="opacity-50">${date}</span>
                        </div>
                        <p class="mb-0 small opacity-75">«${review.review_text}»</p>
                        <div class="mt-1"><small class="text-warning">Оценка: ${review.user_rating}/10</small></div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error(err);
    }
}

/**
 * Заглушка для удаления из избранного (логика для будущей реализации)
 */
async function removeFromFavorites(personId) {
    if(confirm('Удалить эту персону из избранного?')) {
        // Здесь будет вызов API на удаление, если решишь его добавить
        alert('Функция удаления будет доступна в следующей версии');
    }
}