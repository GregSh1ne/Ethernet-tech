document.addEventListener('DOMContentLoaded', () => {
    // Проверка прав (упрощенная для ПЗ)
    const userRole = localStorage.getItem('userRole');
    if (userRole !== '1') {
        alert('Доступ запрещен. Только для администраторов.');
        window.location.href = 'index.html';
        return;
    }

    loadStats();
    loadMoviesTable();

    // Обработка кнопки "ДОБАВИТЬ ФИЛЬМ"
    const addBtn = document.querySelector('.btn-warning');
    addBtn.addEventListener('click', () => {
        // В реальном проекте здесь открывается модальное окно с формой
        alert('Переход к форме добавления нового фильма...');
    });
});

/**
 * Загрузка статистики для дашборда
 */
async function loadStats() {
    try {
        const res = await fetch('/api/admin/stats');
        const stats = await res.json();

        // Обновляем цифры в карточках
        const statValues = document.querySelectorAll('h3.fw-bold');
        statValues[0].textContent = stats.totalMovies.toLocaleString();
        statValues[1].textContent = `+${stats.newReviews}`;
        statValues[2].textContent = stats.totalUsers.toLocaleString();
        
    } catch (err) {
        console.error("Ошибка загрузки статистики:", err);
    }
}

/**
 * Загрузка списка фильмов в таблицу управления
 */
async function loadMoviesTable() {
    try {
        const res = await fetch('/api/movies');
        const movies = await res.json();
        const tbody = document.querySelector('tbody');
        tbody.innerHTML = ''; // Очищаем статику

        movies.forEach(movie => {
            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 opacity-50 small">#${movie._id.slice(-6)}</td>
                    <td class="fw-bold">${movie.title}</td>
                    <td>${movie.year}</td>
                    <td><i class="bi bi-star-fill text-warning"></i> ${movie.rating}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-light me-1" onclick="editMovie('${movie._id}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteMovie('${movie._id}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Обновляем футер таблицы
        document.querySelector('.card-footer span').textContent = `Показано ${movies.length} записей`;

    } catch (err) {
        console.error("Ошибка загрузки таблицы:", err);
    }
}

/**
 * Удаление фильма из базы
 */
async function deleteMovie(id) {
    if (!confirm('Вы уверены, что хотите безвозвратно удалить этот фильм из каталога?')) return;

    try {
        const res = await fetch(`/api/admin/movies/${id}`, { method: 'DELETE' });
        if (res.ok) {
            alert('Фильм успешно удален');
            loadMoviesTable(); // Перерисовываем таблицу
            loadStats();       // Обновляем счетчики
        }
    } catch (err) {
        alert('Ошибка при удалении');
    }
}

/**
 * Заглушка для редактирования
 */
function editMovie(id) {
    alert(`Редактирование фильма с ID: ${id}. В данной версии ПЗ функция в разработке.`);
}