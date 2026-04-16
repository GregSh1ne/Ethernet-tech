// Ждем полной загрузки DOM-дерева перед выполнением скриптов
document.addEventListener('DOMContentLoaded', () => {
    // 1. Первоначальная загрузка данных
    loadGenres();
    loadMovies();

    // 2. Обработка фильтрации при нажатии на кнопку "ПРИМЕНИТЬ"
    const applyFiltersBtn = document.querySelector('.btn-outline-warning');
    applyFiltersBtn.addEventListener('click', () => {
        const genreId = document.querySelector('.form-select').value;
        const yearFrom = document.querySelectorAll('input[type="number"]')[0].value;
        const yearTo = document.querySelectorAll('input[type="number"]')[1].value;

        // Вызываем загрузку с учетом выбранного жанра
        // (Для простоты в ПЗ используем фильтр по жанру, как в API)
        loadMovies(genreId === 'Все жанры' ? '' : genreId);
    });

    // 3. Логика кнопки "МНЕ ПОВЕЗЕТ"
    // Ищем кнопку внутри блока со значком перемешивания
    const luckyBtn = document.querySelector('.bi-shuffle').closest('div').querySelector('button');
    luckyBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/movies/random');
            const movie = await res.json();
            
            if (movie && movie._id) {
                // Перенаправляем на страницу фильма с передачей ID в URL
                window.location.href = `movie.html?id=${movie._id}`;
            }
        } catch (err) {
            console.error("Ошибка при выборе случайного фильма:", err);
        }
    });
});

/**
 * Загрузка списка жанров из БД в выпадающий список
 */
async function loadGenres() {
    try {
        const res = await fetch('/api/genres');
        const genres = await res.json();
        const select = document.querySelector('.form-select');

        genres.forEach(genre => {
            const option = document.createElement('option');
            option.value = genre._id; // Используем ObjectId из MongoDB
            option.textContent = genre.name;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Не удалось загрузить жанры:", err);
    }
}

/**
 * Загрузка и отрисовка карточек фильмов
 */
async function loadMovies(genreId = '') {
    try {
        const url = genreId ? `/api/movies?genre=${genreId}` : '/api/movies';
        const res = await fetch(url);
        const movies = await res.json();
        
        const grid = document.querySelector('.col-lg-9 .row');
        
        // Находим и сохраняем блок "Случайный выбор", чтобы он не исчез
        const randomChoiceBlock = grid.querySelector('.col.d-flex.align-items-center').outerHTML;
        
        // Очищаем сетку
        grid.innerHTML = '';

        // Генерируем карточки для каждого фильма из базы
        movies.forEach(movie => {
            // Формируем строку с названиями жанров через запятую
            const genresList = movie.genres.map(g => g.name).join(', ');

            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 movie-card shadow">
                        <div class="position-relative">
                            <img src="${movie.poster_link}" class="card-img-top" alt="${movie.title}">
                            <div class="position-absolute top-0 end-0 m-2 badge bg-warning">
                                <i class="bi bi-star-fill"></i> ${movie.rating}
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title mb-1">${movie.title}</h6>
                            <p class="small mb-3 opacity-75">${movie.year} • ${genresList}</p>
                            <a href="movie.html?id=${movie._id}" class="btn btn-warning btn-sm w-100">ПОДРОБНЕЕ</a>
                        </div>
                    </div>
                </div>
            `;
        });

        // Возвращаем блок "Случайный выбор" в конец списка
        grid.innerHTML += randomChoiceBlock;
        
    } catch (err) {
        console.error("Ошибка при загрузке фильмов:", err);
    }
}