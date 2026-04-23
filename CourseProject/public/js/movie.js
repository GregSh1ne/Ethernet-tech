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
    loadMovieReviews();

    // Обработка отправки отзыва
    const sendReviewBtn = document.getElementById('send-review');
    if (sendReviewBtn) {
        sendReviewBtn.addEventListener('click', submitReview);
    }
});

/**
 * Загрузка подробных данных о фильме
 */
async function loadMovieDetails() {
    try {
        const res = await fetch(`/api/movies/${movieId}`);
        if (!res.ok) throw new Error('Фильм не найден');
        const movie = await res.json();

        // 1. Делаем режиссера кликабельным в строке метаданных
        const directorLink = movie.director_id 
            ? `<a href="person.html?id=${movie.director_id._id}" class="text-warning text-decoration-none fw-bold">${movie.director_id.surname_name}</a>` 
            : 'Не указан';
        
        // Добавляем также страну в вывод (мы ее добавили на бэкенде ранее)
        const country = movie.country || 'Страна не указана';
        document.getElementById('movie-meta').innerHTML = `${movie.year} • ${directorLink} • ${country} • ${movie.duration} мин.`;

        // 2. Отрисовываем кликабельные бейджи актеров
        const actorsContainer = document.getElementById('movie-actors');
        if (actorsContainer && movie.actors_ids) {
            actorsContainer.innerHTML = movie.actors_ids.map(actor => 
                `<a href="person.html?id=${actor._id}" class="badge border border-warning text-warning text-decoration-none px-3 py-2 shadow-sm">
                    ${actor.surname_name}
                </a>`
            ).join('');
        }
        // Заполнение основных текстовых полей
        document.querySelector('h1').textContent = movie.title;
        document.querySelector('.card-img-top').src = movie.poster_link;
        document.querySelector('.h2').textContent = movie.rating;
        document.querySelector('.lead').textContent = movie.description;
        
        // Информация под заголовком (Год, Режиссер, Длительность)
        //const directorName = movie.director_id ? movie.director_id.surname_name : 'Не указан';
        //document.querySelector('.fs-4.mb-4').textContent = `${movie.year} • ${directorName} • ${movie.duration} мин.`;

        // Отрисовка бейджей жанров
        const genreContainer = document.querySelector('.badge').parentElement;
        genreContainer.innerHTML = movie.genres.map(g => 
            `<span class="badge rounded-pill bg-warning px-3 py-2 me-2 shadow-sm">${g.name}</span>`
        ).join('');

        // Настройка трейлера (замена ссылки на формат embed для iframe)
        const trailerContainer = document.querySelector('.ratio');
        const trailerValue = movie.trailer_link;

        // Проверяем, является ли ссылка реальным YouTube-адресом
        if (trailerValue && (trailerValue.includes('youtube.com') || trailerValue.includes('youtu.be'))) {
            const videoId = trailerValue.split('v=')[1] || trailerValue.split('/').pop();
            document.querySelector('iframe').src = `https://www.youtube.com/embed/${videoId}`;
        } else {
            // Если это заглушка, заменяем плеер на красивый блок с текстом
            trailerContainer.innerHTML = `
                <div class="d-flex align-items-center justify-content-center bg-dark h-100 border border-secondary rounded">
                    <div class="text-center">
                        <i class="bi bi-clock-history text-warning fs-1 d-block mb-2"></i>
                        <h5 class="text-warning opacity-75">${trailerValue || 'Трейлер будет позже'}</h5>
                    </div>
                </div>`;
        }

        document.getElementById('movie-rating').textContent = movie.rating.toFixed(1);
        // Подставляем IMDb рейтинг
        const imdbElem = document.getElementById('imdb-rating');
        if (imdbElem) imdbElem.textContent = movie.imdb_rating ? movie.imdb_rating.toFixed(1) : '—';

    } catch (err) {
        console.error("Ошибка загрузки данных:", err);
        alert("Не удалось загрузить данные о фильме.");
    }
}

/**
 * Отправка нового отзыва на сервер
 */
async function submitReview() {
    const text = document.getElementById('review-text').value;
    const rating = document.getElementById('user-rating-select').value; // ПОЛУЧАЕМ ОЦЕНКУ
    const userId = localStorage.getItem('userId');

    if (!userId) {
        alert("Пожалуйста, авторизуйтесь.");
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
                user_rating: Number(rating) // ОТПРАВЛЯЕМ ЧИСЛОМ
            })
        });

        if (res.ok) {
            document.getElementById('review-text').value = '';
            alert("Отзыв опубликован!");
        }
    } catch (err) { console.error(err); }
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

async function loadMovieReviews() {
    try {
        const res = await fetch(`/api/reviews/movie/${movieId}`);
        const reviews = await res.json();
        const reviewList = document.getElementById('review-list');
        reviewList.innerHTML = ''; 

        reviews.forEach(rev => {
            const html = `
                <div class="review-item mb-3 shadow-sm">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <strong class="text-warning">${rev.author_id.login}</strong>
                        <small class="opacity-50">${new Date(rev.published).toLocaleDateString('ru-RU')}</small>
                    </div>
                    <p class="mb-0 small">${rev.review_text}</p>
                    <div class="mt-1"><small class="text-warning">Оценка: ${rev.user_rating}/10</small></div>
                </div>`;
            reviewList.insertAdjacentHTML('beforeend', html);
        });
    } catch (err) { console.error(err); }
}

// Добавь живое обновление рейтинга через сокеты
socket.on('update_movie_rating', (data) => {
    if (data.movie_id === movieId) {
        const ratingLabel = document.getElementById('movie-rating');
        if (ratingLabel) {
            ratingLabel.textContent = data.new_rating;
            ratingLabel.classList.add('text-warning'); // Подсветка при обновлении
        }
    }
});

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