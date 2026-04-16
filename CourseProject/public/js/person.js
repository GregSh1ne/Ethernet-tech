// 1. Получаем ID персоны из параметров URL
const urlParams = new URLSearchParams(window.location.search);
const personId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!personId) {
        window.location.href = 'index.html';
        return;
    }

    loadPersonDetails();
});

/**
 * Загрузка данных о персоне и её фильмографии
 */
async function loadPersonDetails() {
    try {
        const res = await fetch(`/api/people/${personId}`);
        if (!res.ok) throw new Error('Персона не найдена');
        
        const { person, movies } = await res.json();

        // 2. Заполнение основной информации
        document.querySelector('h1').textContent = person.surname_name;
        document.querySelector('.card img').src = person.photo_link || 'https://via.placeholder.com/400x500?text=Нет+фото';
        document.querySelector('.lead').textContent = person.biography;
        document.querySelector('p.fs-4').textContent = person.roles.join(', ');

        // 3. Заполнение боковой панели "О ПЕРСОНЕ"
        const infoList = document.querySelector('.list-unstyled');
        const birthDate = person.birth_date ? new Date(person.birth_date).toLocaleDateString('ru-RU') : 'Не указана';
        
        infoList.innerHTML = `
            <li class="mb-2"><span class="opacity-50">Карьера:</span> <span class="float-end">${person.roles.join(', ')}</span></li>
            <li class="mb-2"><span class="opacity-50">Дата рождения:</span> <span class="float-end">${birthDate}</span></li>
            <li class="mb-2"><span class="opacity-50">Место рождения:</span> <span class="float-end">${person.birth_place || 'Не указано'}</span></li>
        `;

        // 4. Отрисовка фильмографии (карточки фильмов)
        const movieContainer = document.querySelector('.row.row-cols-md-2');
        movieContainer.innerHTML = ''; // Очищаем статику

        if (movies.length === 0) {
            movieContainer.innerHTML = '<p class="opacity-50 ps-3">В базе пока нет фильмов с этой персоной.</p>';
        } else {
            movies.forEach(movie => {
                movieContainer.innerHTML += `
                    <div class="col">
                        <div class="card h-100 movie-card shadow-sm">
                            <div class="card-body d-flex gap-3 align-items-center p-2">
                                <img src="${movie.poster_link}" style="width: 60px; height: 90px; object-fit: cover;" class="rounded" alt="${movie.title}">
                                <div>
                                    <h6 class="mb-1">${movie.title}</h6>
                                    <p class="small mb-0 opacity-50">${movie.year} • Рейтинг: ${movie.rating}</p>
                                    <a href="movie.html?id=${movie._id}" class="small text-warning text-decoration-none">Подробнее</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

    } catch (err) {
        console.error("Ошибка загрузки данных персоны:", err);
        document.body.innerHTML = `<div class="container my-5 text-center"><h2>${err.message}</h2><a href="index.html" class="btn btn-warning mt-3">Назад в каталог</a></div>`;
    }
}