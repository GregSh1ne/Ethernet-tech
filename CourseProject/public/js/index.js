document.addEventListener('DOMContentLoaded', () => {
    loadGenres();
    loadMovies(); // Начальная загрузка всех фильмов

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
    const applyFiltersBtn = document.getElementById('apply-filters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const params = {
                genre: document.getElementById('genre-filter').value,
                yearFrom: document.getElementById('year-from').value,
                yearTo: document.getElementById('year-to').value
            };
            loadMovies(params);
        });
    }

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

async function loadMovies(filters = {}) {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `/api/movies?${queryParams}` : '/api/movies';
        
        const res = await fetch(url);
        const movies = await res.json();
        
        const grid = document.getElementById('movie-grid');
        
        // 1. Просто очищаем сетку. lucky-block не пострадает, так как он снаружи
        grid.innerHTML = '';

        if (movies.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center py-5 opacity-50">Ничего не найдено по вашему запросу</div>';
            return;
        }

        // 2. Отрисовываем только фильмы
        movies.forEach(movie => {
            const genresList = movie.genres.map(g => g.name).join(', ');

            grid.innerHTML += `
                <div class="col">
                    <div class="card h-100 movie-card shadow">
                        <div class="position-relative">
                            <img src="${movie.poster_link}" class="card-img-top" alt="${movie.title}">
                            <div class="position-absolute top-0 end-0 m-2 badge bg-warning">
                                <i class="bi bi-star-fill"></i> ${movie.rating.toFixed(1)}
                            </div>
                        </div>
                        <div class="card-body">
                            <h6 class="card-title mb-1 text-truncate">${movie.title}</h6>
                            <p class="small mb-3 opacity-75">${movie.year} • ${genresList}</p>
                            <a href="movie.html?id=${movie._id}" class="btn btn-warning btn-sm w-100 fw-bold">ПОДРОБНЕЕ</a>
                        </div>
                    </div>
                </div>`;
        });
        
    } catch (err) {
        console.error("Ошибка при загрузке фильмов:", err);
    }
}