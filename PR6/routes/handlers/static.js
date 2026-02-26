const path = require('path');
const { sendText, sendFile } = require('../../utils/helpers');
const config = require('../../config');

/**
 * Обработчик главной страницы
 */
function handleIndex(response) {
    const filePath = path.join(config.PUBLIC_DIR, 'index.html');
    sendFile(response, filePath);
}

/**
 * Обработчик текстового ответа
 */
function handleText(response) {
    sendText(response, 200, 'Это простой текстовый ответ от Node.js сервера');
}

/**
 * Обработчик изображения
 */
function handleImage(response, filename = 'logo.svg') {
    const filePath = path.join(config.PUBLIC_DIR, filename);
    sendFile(response, filePath);
}

module.exports = {
    handleIndex,
    handleText,
    handleImage
};