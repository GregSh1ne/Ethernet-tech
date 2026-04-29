let adminCurrentPage = 1;
let adminSearchTerm = '';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Проверка прав доступа
    const userRole = localStorage.getItem('userRole');
    if (userRole !== '1') {
        alert('Доступ запрещен. Требуются права администратора.');
        window.location.href = 'index.html';
        return;
    }

    // 2. Инициализация интерфейса
    loadStats();
    loadMoviesTable();
    loadGenresToModal();
    loadPeopleToModal();
    loadReviewsModeration();

    const adminSearchInput = document.getElementById('admin-search-input');
    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', (e) => {
            adminSearchTerm = e.target.value.trim();
            adminCurrentPage = 1; // Сброс на первую страницу при поиске
            loadMoviesTable(false); // false = очистить таблицу и начать заново
        });
    }

    const loadMoreBtn = document.getElementById('admin-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            adminCurrentPage++;
            loadMoviesTable(true); // true = добавить в конец текущего списка
        });
    }

    // Элементы DOM
    const addMovieModal = new bootstrap.Modal(document.getElementById('addMovieModal'));
    const addBtn = document.querySelector('.btn-warning');
    const addForm = document.getElementById('add-movie-form');
    const fetchBtn = document.getElementById('fetch-imdb-btn');
    const imdbInput = document.getElementById('imdb-id-input');

    // Открытие модального окна
    if (addBtn) {
        addBtn.addEventListener('click', () => addMovieModal.show());
    }

    // 3. Логика «Умного импорта» (IMDb/TMDB)
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const imdbId = imdbInput.value.trim();
            if (!imdbId.startsWith('tt')) {
                return alert("Введите корректный IMDb ID (например, tt1375666)");
            }

            // Индикация загрузки
            fetchBtn.disabled = true;
            fetchBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;

            try {
                const res = await fetch(`/api/admin/smart-import/${imdbId}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.message || "Ошибка импорта");

                // ВАЖНО: Сначала обновляем списки людей, чтобы новые ID появились в DOM
                await loadPeopleToModal();

                // Теперь заполняем поля
                addForm.querySelector('[name="title"]').value = data.title || '';
                addForm.querySelector('[name="year"]').value = data.year || '';
                addForm.querySelector('[name="rating"]').value = data.rating || '';
                addForm.querySelector('[name="imdb_rating"]').value = data.rating || '';
                addForm.querySelector('[name="duration"]').value = data.duration || '';
                addForm.querySelector('[name="description"]').value = data.description || '';
                addForm.querySelector('[name="poster_link"]').value = data.poster_link || '';
                
                // Заполняем СТРАНУ
                const countryInput = addForm.querySelector('[name="country"]');
                if (countryInput) countryInput.value = data.country || '';

                // Установка режиссера
                if (data.director_id) {
                    document.getElementById('modal-directors').value = data.director_id;
                }
                
                // Установка актеров
                if (data.actors_ids) {
                    const actorSelect = document.getElementById('modal-actors');
                    Array.from(actorSelect.options).forEach(opt => opt.selected = false);
                    
                    data.actors_ids.forEach(id => {
                        const opt = actorSelect.querySelector(`option[value="${id}"]`);
                        if (opt) opt.selected = true;
                    });
                }
                
                if (data.genres) {
                    const genreSelect = document.getElementById('modal-genres');
                    // Сначала сбрасываем всё выделение
                    Array.from(genreSelect.options).forEach(opt => opt.selected = false);

                    data.genres.forEach(genreName => {
                        // Ищем опцию в нашем списке, у которой ТЕКСТ совпадает с названием от TMDB
                        const option = Array.from(genreSelect.options).find(
                            opt => opt.text.toLowerCase() === genreName.toLowerCase()
                        );
                        if (option) option.selected = true;
                    });
                }

                alert("Всё готово! Данные, включая страну и персон, подтянуты.");
            } catch (err) {
                console.error(err);
                alert("Ошибка: " + err.message);
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.innerHTML = `<i class="bi bi-download"></i> ПОДТЯНУТЬ`;
            }
        });
    }

    // 4. Сохранение нового фильма в базу
    if (addForm) {
        addForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addForm);
            const trailer = formData.get('trailer_link').trim();
            
            const movieData = {
                title: formData.get('title'),
                year: Number(formData.get('year')),
                rating: Number(formData.get('rating')),
                imdb_rating: Number(formData.get('imdb_rating')),
                duration: Number(formData.get('duration')),
                description: formData.get('description'),
                poster_link: formData.get('poster_link'),
                trailer_link: trailer || "Трейлер будет позже",
                genres: Array.from(formData.getAll('genres')),
                director_id: formData.get('director_id'),
                actors_ids: Array.from(formData.getAll('actors'))
            };

            try {
                const res = await fetch('/api/admin/movies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });

                if (res.ok) {
                    alert('Фильм успешно добавлен в каталог!');
                    addForm.reset();
                    addMovieModal.hide();
                    loadMoviesTable();
                    loadStats();
                } else {
                    const error = await res.json();
                    alert('Ошибка сохранения: ' + error.message);
                }
            } catch (err) {
                console.error(err);
                alert('Сетевая ошибка при сохранении');
            }
        });
    }
});

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const stats = await res.json();
        const statValues = document.querySelectorAll('h3.fw-bold');
        if (statValues.length >= 3) {
            statValues[0].textContent = stats.totalMovies.toLocaleString();
            statValues[1].textContent = `+${stats.newReviews}`;
            statValues[2].textContent = stats.totalUsers.toLocaleString();
        }
    } catch (err) { console.error("Ошибка статистики:", err); }
}

/**
 * Исправленная загрузка таблицы фильмов
 * @param {Boolean} append - Если true, данные добавляются в конец, если false - таблица очищается
 */

async function loadMoviesTable(append = false) {
    try {

        const params = new URLSearchParams({
            page: adminCurrentPage,
            limit: 20, // Грузим по 20 штук для таблицы
            search: adminSearchTerm
        }).toString();

        const res = await fetch(`/api/movies?${params}`);
        const data = await res.json();
        
        const movies = data.movies; // ИСПРАВЛЕНО: берем массив из объекта
        
        const tbody = document.querySelector('tbody');
        if (!tbody) return;

        if (!append) tbody.innerHTML = ''; 

        if (data.movies.length === 0 && !append) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 opacity-50">Фильмы не найдены</td></tr>';
        } else {
            data.movies.forEach(movie => {
                tbody.innerHTML += `
                    <tr>
                        <td class="ps-4 opacity-50 small">#${movie._id.slice(-6)}</td>
                        <td class="fw-bold">${movie.title}</td>
                        <td>${movie.year}</td>
                        <td><i class="bi bi-star-fill text-warning"></i> ${movie.rating}</td>
                        <td class="text-end pe-4">
                            <button class="btn btn-sm btn-outline-warning me-2" onclick="editMovie('${movie._id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMovie('${movie._id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            });
        }
        
        const loadMoreBtn = document.getElementById('admin-load-more');
        if (loadMoreBtn) {
            if (adminCurrentPage >= data.pages || data.movies.length === 0) {
                loadMoreBtn.classList.add('d-none');
            } else {
                loadMoreBtn.classList.remove('d-none');
            }
        }

        const footerSpan = document.querySelector('.card-footer span');
        if (footerSpan) footerSpan.textContent = `Показано ${tbody.children.length} из ${data.total} записей`;

    } 
    catch (err) { 
        console.error("Ошибка таблицы фильмов:", err); 
    }
}

window.editMovie = async function(id) {
    try {
        const res = await fetch(`/api/movies/${id}`);
        const movie = await res.json();
        
        const form = document.getElementById('add-movie-form');
        const modalTitle = document.querySelector('.modal-title');
        const submitBtn = form.closest('.modal-content').querySelector('button[type="submit"]');

        // Заполняем поля
        document.getElementById('edit-movie-id').value = movie._id;
        form.querySelector('[name="title"]').value = movie.title;
        form.querySelector('[name="year"]').value = movie.year;
        form.querySelector('[name="country"]').value = movie.country || '';
        form.querySelector('[name="rating"]').value = movie.rating;
        form.querySelector('[name="imdb_rating"]').value = movie.imdb_rating || 0;
        form.querySelector('[name="duration"]').value = movie.duration;
        form.querySelector('[name="poster_link"]').value = movie.poster_link;
        form.querySelector('[name="trailer_link"]').value = movie.trailer_link;
        form.querySelector('[name="description"]').value = movie.description;

        modalTitle.textContent = "РЕДАКТИРОВАНИЕ ФИЛЬМА";
        submitBtn.textContent = "ОБНОВИТЬ ДАННЫЕ";

        new bootstrap.Modal(document.getElementById('addMovieModal')).show();
    } catch (err) { alert("Ошибка при загрузке данных фильма"); }
}

document.getElementById('add-movie-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const movieId = document.getElementById('edit-movie-id').value;
    
    const movieData = {
        title: formData.get('title'),
        year: Number(formData.get('year')),
        rating: Number(formData.get('rating')),
        imdb_rating: Number(formData.get('imdb_rating')),
        duration: Number(formData.get('duration')),
        description: formData.get('description'),
        poster_link: formData.get('poster_link'),
        trailer_link: formData.get('trailer_link') || "Трейлер будет позже",
        genres: Array.from(formData.getAll('genres')),
        director_id: formData.get('director_id'),
        actors_ids: Array.from(formData.getAll('actors'))
    };

    const url = movieId ? `/api/admin/movies/${movieId}` : '/api/admin/movies';
    const method = movieId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movieData)
        });

        if (res.ok) {
            alert(movieId ? 'Данные обновлены!' : 'Фильм добавлен!');
            location.reload();
        }
    } catch (err) { console.error(err); }
});

async function loadGenresToModal() {
    try {
        const res = await fetch('/api/genres');
        const genres = await res.json();
        const select = document.getElementById('modal-genres');
        if (!select) return;
        
        select.innerHTML = ''; // Очистка
        genres.forEach(g => {
            const option = new Option(g.name, g._id);
            select.add(option);
        });
    } catch (err) { console.error("Ошибка загрузки жанров:", err); }
}

async function loadPeopleToModal() {
    try {
        const res = await fetch('/api/people');
        const people = await res.json();
        const dSelect = document.getElementById('modal-directors');
        const aSelect = document.getElementById('modal-actors');
        
        if (!dSelect || !aSelect) return;

        dSelect.innerHTML = '<option value="">Выберите режиссера...</option>';
        aSelect.innerHTML = '';

        people.forEach(p => {
            const opt = new Option(p.surname_name, p._id);
            dSelect.add(opt.cloneNode(true));
            aSelect.add(opt);
        });
    } catch (err) { console.error("Ошибка загрузки людей:", err); }
}

async function deleteMovie(id) {
    if (!confirm('Вы уверены, что хотите удалить этот фильм?')) return;
    try {
        const res = await fetch(`/api/admin/movies/${id}`, { method: 'DELETE' });
        if (res.ok) { 
            loadMoviesTable(); 
            loadStats(); 
        } else {
            alert('Не удалось удалить фильм');
        }
    } catch (err) { console.error("Ошибка удаления:", err); }
}

async function loadReviewsModeration() {
    try {
        const res = await fetch('/api/admin/reviews');
        const reviews = await res.json();
        
        const tbody = document.querySelector('#reviews-moderation-table tbody');
        tbody.innerHTML = '';

        reviews.forEach(rev => {
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4"><strong>${rev.author_id.login}</strong></td>
                    <td class="small">${rev.movie_id ? rev.movie_id.title : '---'}</td>
                    <td class="small opacity-75">${rev.review_text.substring(0, 50)}...</td>
                    <td class="small">${new Date(rev.published).toLocaleDateString()}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteReview('${rev._id}')">
                            <i class="bi bi-trash"></i> Удалить
                        </button>
                    </td>
                </tr>`;
        });
    } catch (err) { console.error(err); }
}

window.deleteReview = async function(id) {
    if (!confirm('Удалить этот отзыв?')) return;
    try {
        const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Отзыв удален');
            loadReviewsModeration(); // Обновляем список
        }
    } catch (err) { console.error(err); }
}