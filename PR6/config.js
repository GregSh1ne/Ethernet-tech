const path = require('path');

module.exports = {
    PORT: process.env.PORT || 8000,
    ROOT_DIR: __dirname,
    USERS_FILE: path.join(__dirname, 'users.json'),
    PUBLIC_DIR: __dirname,
    
    // Доступные маршруты для логгирования
    ROUTES: {
        '/': 'Главная страница (HTML)',
        '/text': 'Текстовый ответ',
        '/api/data': 'JSON API',
        '/image': 'Изображение',
        '/login': 'Страница входа',
        '/api/login': 'API авторизации'
    }
};