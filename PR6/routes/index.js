#!/usr/bin/env node
/**
 * Центральный маршрутизатор HTTP-запросов
 * Распределяет запросы по соответствующим обработчикам
 */

const url = require('url');

// Импорт обработчиков
const staticHandlers = require('./handlers/static');
const apiHandlers = require('./handlers/api');
const authHandlers = require('./handlers/auth'); // импортирует index.js из папки auth
const { sendText } = require('../utils/helpers');

/**
 * Главная функция маршрутизации
 * @param {http.IncomingMessage} request - Объект запроса
 * @param {http.ServerResponse} response - Объект ответа
 */
function routeRequest(request, response) {
    // Парсинг URL для получения пути и параметров
    const parsedUrl = url.parse(request.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    const method = request.method;

    // Логирование запроса
    console.log(`[${new Date().toISOString()}] ${method} ${request.url}`);

    // === Маршруты ===
    
    // 1. Главная страница (HTML)
    if (pathname === '/' || pathname === '/index.html') {
        if (method === 'GET') {
            staticHandlers.handleIndex(response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 2. Текстовый ответ
    if (pathname === '/text') {
        if (method === 'GET') {
            staticHandlers.handleText(response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 3. JSON API (тестовые данные)
    if (pathname === '/api/data') {
        if (method === 'GET') {
            apiHandlers.handleApiData(response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 4. Изображение
    if (pathname === '/image' || pathname === '/logo.jpg' || pathname === '/logo.svg') {
        if (method === 'GET') {
            staticHandlers.handleImage(response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 5. Страница входа (HTML форма)
    if (pathname === '/login') {
        if (method === 'GET') {
            authHandlers.handleLoginPage(response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 6. API авторизации (XHR запрос)
    if (pathname === '/api/login') {
        if (method === 'GET') {
            authHandlers.handleLoginApi(request, response, query);
        } else if (method === 'POST') {
            authHandlers.handleLoginApiPost(request, response);
        } else {
            sendText(response, 405, 'Метод не разрешён', 'text/plain; charset=utf-8');
        }
        return;
    }

    // 7. 404 — Страница не найдена
    sendText(response, 404, 'Страница не найдена', 'text/plain; charset=utf-8');
}

/**
 * Получить список всех зарегистрированных маршрутов
 * @returns {Array} Массив объектов с информацией о маршрутах
 */
function getRoutes() {
    return [
        { path: '/', method: 'GET', description: 'Главная страница (HTML)' },
        { path: '/text', method: 'GET', description: 'Текстовый ответ' },
        { path: '/api/data', method: 'GET', description: 'JSON API' },
        { path: '/image', method: 'GET', description: 'Изображение' },
        { path: '/login', method: 'GET', description: 'Страница входа' },
        { path: '/api/login', method: 'GET/POST', description: 'API авторизации' }
    ];
}

module.exports = { 
    routeRequest,
    getRoutes
};