const { validateCredentials } = require('../../../utils/auth');
const { sendJson } = require('../../../utils/helpers');

/**
 * Обработчик GET-запроса к /api/login
 * @param {http.IncomingMessage} request - Объект запроса HTTP
 * @param {http.ServerResponse} response - Объект ответа HTTP
 * @param {Object} query - Параметры запроса (parsed URL query)
 */
function handleLoginApi(request, response, query) {
    // Логирование попытки входа (без пароля!)
    console.log(`[AUTH] Попытка входа: username="${query.username || 'empty'}"`);
    
    // Валидация входных данных
    const result = validateCredentials(query?.username, query?.password);
    
    // Определение HTTP-статуса
    const statusCode = result.success ? 200 : 401;
    
    // Отправка JSON-ответа
    sendJson(response, statusCode, result);
}

/**
 * Обработчик POST-запроса к /api/login (альтернативный вариант)
 * @param {http.IncomingMessage} request 
 * @param {http.ServerResponse} response 
 */
function handleLoginApiPost(request, response) {
    let body = '';
    
    request.on('data', chunk => {
        body += chunk.toString();
        // Ограничение размера тела запроса (защита от DoS)
        if (body.length > 1e6) request.destroy();
    });
    
    request.on('end', () => {
        try {
            const { username, password } = JSON.parse(body);
            const result = validateCredentials(username, password);
            const statusCode = result.success ? 200 : 401;
            sendJson(response, statusCode, result);
        } catch (err) {
            sendJson(response, 400, { success: false, message: 'Неверный формат JSON' });
        }
    });
}

module.exports = { 
    handleLoginApi,
    handleLoginApiPost 
};