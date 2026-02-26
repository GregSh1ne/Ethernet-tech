// Экспорт всех обработчиков авторизации для удобного импорта
const { handleLoginPage } = require('./login-page');
const { handleLoginApi, handleLoginApiPost } = require('./login-api');

module.exports = {
    handleLoginPage,
    handleLoginApi,
    handleLoginApiPost
};