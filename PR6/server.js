#!/usr/bin/env node
/**
 * Node.js HTTP Server
 * Модульная версия с разделением ответственности
 */

const http = require('http');
const config = require('./config');
const { routeRequest } = require('./routes');

// Создание сервера
const server = http.createServer((request, response) => {
    // Добавляем базовые заголовки безопасности
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    
    // Делегируем обработку маршрутизатору
    routeRequest(request, response);
});

// Запуск сервера
server.listen(config.PORT, () => {
    console.log(`\n🚀 Сервер запущен: http://localhost:${config.PORT}\n`);
    console.log('📋 Доступные маршруты:');
    Object.entries(config.ROUTES).forEach(([path, desc]) => {
        console.log(`   ${path.padEnd(15)} — ${desc}`);
    });
    console.log('\n🛑 Нажмите Ctrl+C для остановки\n');
});

// Обработка завершения работы
process.on('SIGINT', () => {
    console.log('\n👋 Завершение работы сервера...');
    server.close(() => {
        console.log('✅ Сервер остановлен');
        process.exit(0);
    });
});