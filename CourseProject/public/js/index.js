let currentPage = 1;
let currentFilters = {};
document.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    loadMovies(); // Начальная загрузка всех фильмов
    checkNotifications();

    document.getElementById('load-more-btn').addEventListener('click', () => {
        currentPage++;
        loadMovies(currentFilters, true); // true означает "добавить к списку"
    });

    // 1. ЛОГИКА ПОИСКА (СВЕРХУ)
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const searchTerm = document.getElementById('search-input').value;
            loadMovies({ search: searchTerm });
        });
    }



    // 2. ОБРАБОТКА ФИЛЬТРОВ (БОКОВАЯ ПАНЕЛЬ)
    document.getElementById('apply-filters').addEventListener('click', () => {
        currentPage = 1;
        currentFilters = {
            genre: document.getElementById('genre-filter').value,
            yearFrom: document.getElementById('year-from').value,
            yearTo: document.getElementById('year-to').value,
            ratingFrom: document.getElementById('rating-from').value,
            imdbRatingFrom: document.getElementById('imdb-rating-from').value
        };
        loadMovies(currentFilters, false); 
    });

    // 3. ЛОГИКА КНОПКИ "МНЕ ПОВЕЗЕТ"
    const luckyBtn = document.getElementById('lucky-btn');
    if (luckyBtn) {
        luckyBtn.addEventListener('click', async () => {
            try {
                const res = await fetch('/api/movies/random');
                const movie = await res.json();
                
                if (movie && movie._id) {
                    window.location.href = `movie.html?id=${movie._id}`;
                } else {
                    // Если база пуста или пришла ошибка
                    alert("Похоже, в каталоге пока нет фильмов. Добавь их в админке!");
                }
            } catch (err) { 
                console.error("Ошибка рандома:", err); 
            }
        });
    }
});

async function loadGenres() {
    try {
        const res = await fetch('/api/genres');
        const genres = await res.json();
        const select = document.getElementById('genre-filter');
        genres.forEach(genre => {
            const option = new Option(genre.name, genre._id);
            select.add(option);
        });
    } catch (err) { console.error("Ошибка жанров:", err); }
}

/**
 * Загрузка и отрисовка карточек фильмов с поддержкой пагинации
 * @param {Object} filters - Объект с фильтрами (genre, yearFrom, yearTo, search)
 * @param {Boolean} append - Если true, новые фильмы добавятся в конец, иначе сетка очистится
 */

async function loadMovies(filters = {}, append = false) {
    try {
        const grid = document.getElementById('movie-grid');
        const loadMoreContainer = document.getElementById('load-more-container');
        
        // Формируем параметры запроса, включая текущую страницу и лимит
        const params = new URLSearchParams({
            ...filters,
            page: currentPage, // Глобальная переменная текущей страницы
            limit: 24          // Количество фильмов на одну подгрузку
        }).toString();

        const res = await fetch(`/api/movies?${params}`);
        if (!res.ok) throw new Error('Ошибка при загрузке данных с сервера');
        
        const data = await res.json(); // Получаем { movies, total, pages }

        // 1. Очищаем сетку, если это новый поиск/фильтр, а не "Показать ещё"
        if (!append) {
            grid.innerHTML = '';
        }

        // 2. Обработка пустого результата
        if (data.movies.length === 0 && !append) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-search fs-1 opacity-25 d-block mb-3"></i>
                    <p class="opacity-50">Ничего не найдено по вашему запросу</p>
                </div>`;
            if (loadMoreContainer) loadMoreContainer.classList.add('d-none');
            return;
        }

        // 3. Отрисовка карточек
        data.movies.forEach(movie => {
            const genresList = movie.genres.map(g => g.name).join(', ');
            const rating = movie.rating ? movie.rating.toFixed(1) : '0.0';
            // Подготовка рейтинга IMDb для карточки
            const imdbRating = movie.imdb_rating ? movie.imdb_rating.toFixed(1) : '—';

            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 movie-card shadow">
                        <div class="position-relative">
                            <img src="${movie.poster_link}" class="card-img-top" alt="${movie.title}">
                            
                            <div class="position-absolute top-0 end-0 m-2 badge bg-warning text-dark fw-bold">
                                <i class="bi bi-star-fill"></i> ${rating}
                            </div>
                            
                            <div class="position-absolute top-0 start-0 m-2 badge bg-dark border border-warning text-warning fw-bold">
                                IMDb: ${imdbRating}
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title mb-1 text-truncate" title="${movie.title}">${movie.title}</h6>
                            <p class="small mb-3 opacity-75">${movie.year} • ${genresList}</p>
                            <a href="movie.html?id=${movie._id}" class="btn btn-warning btn-sm w-100 fw-bold">ПОДРОБНЕЕ</a>
                        </div>
                    </div>
                </div>`;
        });

        // 4. Управление видимостью кнопки "Показать ещё"
        if (loadMoreContainer) {
            if (currentPage >= data.pages) {
                loadMoreContainer.classList.add('d-none'); // Прячем, если страницы кончились
            } else {
                loadMoreContainer.classList.remove('d-none'); // Показываем, если есть что грузить
            }
        }
        
    } catch (err) {
        console.error("Ошибка в loadMovies:", err);
        const grid = document.getElementById('movie-grid');
        if (grid) grid.innerHTML = `<p class="text-danger text-center w-100">Ошибка соединения с сервером</p>`;
    }
}

async function checkNotifications() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const wrapper = document.getElementById('notif-wrapper');
    if (wrapper) wrapper.style.display = 'block';

    try {
        const res = await fetch(`/api/notifications/${userId}`);
        const notifications = await res.json();
        
        const badge = document.getElementById('notif-badge');
        const list = document.getElementById('notif-list');

        if (notifications.length > 0) {
            badge.textContent = notifications.length;
            badge.classList.remove('d-none');

            list.innerHTML = notifications.map(n => `
                <div class="list-group-item bg-transparent text-white border-secondary py-3">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1 text-warning small fw-bold">НОВИНКА</h6>
                        <small class="opacity-50">${new Date(n.created_at).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1 small">${n.message_text}</p>
                </div>
            `).join('');
        } else {
            badge.classList.add('d-none');
            list.innerHTML = '<p class="text-center py-4 opacity-50 mb-0">У вас нет новых уведомлений</p>';
        }
    } catch (err) { console.error(err); }
}
const markReadBtn = document.getElementById('mark-read-btn');
if (markReadBtn) {
    markReadBtn.addEventListener('click', async () => {
        const userId = localStorage.getItem('userId');
        try {
            const res = await fetch(`/api/notifications/read-all/${userId}`, { method: 'PUT' });
            if (res.ok) {
                checkNotifications(); 
                bootstrap.Modal.getInstance(document.getElementById('notifModal')).hide();
            }
        } catch (err) { console.error(err); }
    });
}