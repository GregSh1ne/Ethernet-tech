// 1. Инициализация: получаем ID фильма из URL и подключаем сокеты
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id');
const socket = io(); // Socket.io для "Живой ленты"

document.addEventListener('DOMContentLoaded', () => {
    if (!movieId) {
        window.location.href = 'index.html'; // Если ID нет, возвращаемся на главную
        return;
    }

    loadMovieDetails();

    // 2. Обработка нажатия кнопки "В ИЗБРАННОЕ"
    const favBtn = document.querySelector('.btn-warning.w-100');
    favBtn.addEventListener('click', addToFavorites);

    // 3. Обработка отправки отзыва
    const sendReviewBtn = document.querySelector('.card .btn-warning');
    sendReviewBtn.addEventListener('click', submitReview);
});

/**
 * Загрузка подробных данных о фильме
 */
async function loadMovieDetails() {
    try {
        const res = await fetch(`/api/movies/${movieId}`);
        if (!res.ok) throw new Error('Фильм не найден');
        const movie = await res.json();

        // Заполнение основных текстовых полей
        document.querySelector('h1').textContent = movie.title;
        document.querySelector('.card-img-top').src = movie.poster_link;
        document.querySelector('.h2').textContent = movie.rating;
        document.querySelector('.lead').textContent = movie.description;
        
        // Информация под заголовком (Год, Режиссер, Длительность)
        const directorName = movie.director_id ? movie.director_id.surname_name : 'Не указан';
        document.querySelector('.fs-4.mb-4').textContent = `${movie.year} • ${directorName} • ${movie.duration} мин.`;

        // Отрисовка бейджей жанров
        const genreContainer = document.querySelector('.badge').parentElement;
        genreContainer.innerHTML = movie.genres.map(g => 
            `<span class="badge rounded-pill bg-warning px-3 py-2 me-2 shadow-sm">${g.name}</span>`
        ).join('');

        // Настройка трейлера (замена ссылки на формат embed для iframe)
        const videoId = movie.trailer_link.split('v=')[1] || movie.trailer_link.split('/').pop();
        document.querySelector('iframe').src = `https://www.youtube.com/embed/${videoId}`;

    } catch (err) {
        console.error("Ошибка загрузки данных:", err);
        alert("Не удалось загрузить данные о фильме.");
    }
}

/**
 * Отправка нового отзыва на сервер
 */
async function submitReview() {
    const text = document.querySelector('textarea').value;
    const userId = localStorage.getItem('userId'); // Берем ID вошедшего пользователя

    if (!userId) {
        alert("Пожалуйста, авторизуйтесь, чтобы оставить отзыв.");
        window.location.href = 'auth.html';
        return;
    }

    if (!text.trim()) return;

    try {
        const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movie_id: movieId,
                author_id: userId,
                review_text: text,
                user_rating: 10 // Пока ставим 10 по умолчанию
            })
        });

        if (res.ok) {
            document.querySelector('textarea').value = ''; // Очищаем поле
        }
    } catch (err) {
        console.error("Ошибка при отправке отзыва:", err);
    }
}

/**
 * Добавление в список избранного
 */
async function addToFavorites() {
    const userId = localStorage.getItem('userId');
    if (!userId) return alert("Нужна авторизация");

    try {
        const res = await fetch('/api/user/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, personId: movieId }) // Можно адаптировать под актеров
        });
        if (res.ok) alert("Добавлено в избранное!");
    } catch (err) {
        console.error(err);
    }
}

/**
 * СЛУШАТЕЛЬ SOCKET.IO: Живое обновление отзывов
 */
socket.on('display_review', (data) => {
    // Проверяем, что отзыв относится именно к этому фильму
    if (data.movie_id === movieId) {
        const reviewList = document.getElementById('review-list');
        const newReviewHtml = `
            <div class="review-item mb-3 shadow-sm">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong class="text-warning">${data.review.author_id.login}</strong>
                    <small class="opacity-50">сейчас</small>
                </div>
                <p class="mb-0 small">${data.review.review_text}</p>
            </div>
        `;
        // Добавляем новый отзыв в начало списка
        reviewList.insertAdjacentHTML('afterbegin', newReviewHtml);
    }
});