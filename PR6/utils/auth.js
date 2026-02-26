const { loadUsers, sendJson } = require('./helpers');

/**
 * Проверяет учётные данные пользователя
 */
function validateCredentials(username, password) {
    if (!username || !password) {
        return { success: false, message: 'Укажите имя и пароль' };
    }
    
    const users = loadUsers();
    
    if (users[username] && users[username] === password) {
        return { 
            success: true, 
            message: `Добро пожаловать, ${username}!`,
            user: username 
        };
    }
    
    return { success: false, message: 'Неверное имя пользователя или пароль' };
}

/**
 * Обработчик API авторизации
 */
function handleLoginApi(request, response, query) {
    const result = validateCredentials(query.username, query.password);
    const statusCode = result.success ? 200 : 401;
    sendJson(response, statusCode, result);
}

module.exports = {
    validateCredentials,
    handleLoginApi
};