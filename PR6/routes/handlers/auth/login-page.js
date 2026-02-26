const { getLoginHtml } = require('./templates/login.html');

/**
 * Отправляет HTML-страницу авторизации
 * @param {http.ServerResponse} response - Объект ответа HTTP
 */
function handleLoginPage(response) {
    response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    response.end(getLoginHtml());
}

module.exports = { handleLoginPage };