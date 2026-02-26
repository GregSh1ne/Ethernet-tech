const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Определяет Content-Type по расширению файла
 */
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
        '.txt': 'text/plain; charset=utf-8',
        '.ico': 'image/x-icon'
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Читает и парсит JSON-файл с пользователями
 */
function loadUsers() {
    try {
        const data = fs.readFileSync(config.USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.warn('⚠️ Не удалось загрузить users.json:', err.message);
        return {};
    }
}

/**
 * Отправляет JSON-ответ
 */
function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(data));
}

/**
 * Отправляет текстовый ответ
 */
function sendText(response, statusCode, text, contentType = 'text/plain; charset=utf-8') {
    response.writeHead(statusCode, { 'Content-Type': contentType });
    response.end(text);
}

/**
 * Отправляет файл с обработкой ошибок
 */
function sendFile(response, filePath) {
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            sendText(response, 404, 'Файл не найден');
            return;
        }
        response.writeHead(200, { 'Content-Type': getContentType(filePath) });
        fs.createReadStream(filePath).pipe(response);
    });
}

module.exports = {
    getContentType,
    loadUsers,
    sendJson,
    sendText,
    sendFile
};