const { sendJson } = require('../../utils/helpers');

/**
 * Возвращает тестовые данные в формате JSON
 */
function handleApiData(response) {
    const data = {
        status: 'success',
        timestamp: new Date().toISOString(),
        message: 'Данные получены',
        items: [1, 2, 3, 4, 5],
        server: 'Node.js HTTP Server'
    };
    sendJson(response, 200, data);
}

module.exports = {
    handleApiData
};