const userId = localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!userId) {
        window.location.href = 'auth.html';
        return;
    }

    const userRole = localStorage.getItem('userRole');
    if (userRole === '1') {
        const adminBtn = document.getElementById('admin-panel-btn');
        if (adminBtn) {
            adminBtn.classList.remove('d-none');
        }
    }

    loadUserProfile();
    loadUserReviews();
    checkNotifications();

    const logoutBtn = document.querySelector('.btn-outline-danger');
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
});

async function loadUserProfile() {
    try {
        const res = await fetch(`/api/user/profile/${userId}`);
        if (!res.ok) throw new Error('Ошибка при загрузке профиля');
        
        const user = await res.json();

        document.querySelector('h3').textContent = user.login;
        document.querySelector('.avatar-circle').textContent = user.login.charAt(0).toUpperCase();
        
        const favoritesCount = document.getElementById('favorites-count');
        if (favoritesCount) {
            favoritesCount.textContent = user.favorite_list.length;
        }

        const favoritesList = document.querySelector('.list-group-flush');
        favoritesList.innerHTML = '';

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

async function loadUserReviews() {
    try {
        const res = await fetch(`/api/reviews/user/${userId}`);
        const reviews = await res.json();

        const reviewsContainer = document.querySelector('.review-list-container');
        const reviewsCount = document.getElementById('reviews-count');
        
        if (reviewsCount) {
            reviewsCount.textContent = reviews.length;
        }
        reviewsContainer.innerHTML = '';

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

async function removeFromFavorites(personId) {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    if (confirm('Удалить эту персону из избранного?')) {
        try {
            const res = await fetch('/api/user/favorites', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, personId })
            });

            if (res.ok) {
                await loadUserProfile(); 
            } else {
                const error = await res.json();
                alert("Ошибка: " + error.message);
            }
        } catch (err) {
            console.error("Ошибка при удалении из избранного:", err);
            alert("Не удалось связаться с сервером");
        }
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