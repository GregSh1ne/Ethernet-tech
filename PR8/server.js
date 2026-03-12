const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

let documentContent = [];
const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

function generateRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function generateUserName() {
    const adjectives = ['Весёлый', 'Умный', 'Быстрый', 'Творческий', 'Внимательный'];
    const nouns = ['Редактор', 'Писатель', 'Кодер', 'Автор', 'Пользователь'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adj + ' ' + noun;
}

io.on('connection', (socket) => {
    console.log('Подключился:', socket.id);
    
    const user = {
        id: socket.id,
        name: generateUserName(),
        color: generateRandomColor()
    };
    users.set(socket.id, user);
    
    socket.emit('init', {
        content: documentContent.map(function(i) { return i.char; }).join(''),
        contentData: documentContent,
        users: Array.from(users.values()),
        currentUser: user
    });
    
    socket.broadcast.emit('userJoined', user);
    
    socket.on('textChange', (data) => {
        if (data.contentData && data.contentData.length >= 0) {
            documentContent = data.contentData;
            
            socket.broadcast.emit('textChange', {
                content: data.content,
                contentData: documentContent,
                userId: socket.id,
                userName: user.name,
                userColor: user.color,
                timestamp: Date.now()
            });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Отключился:', socket.id);
        users.delete(socket.id);
        io.emit('userLeft', { 
            userId: socket.id, 
            userName: user.name 
        });
    });
});

server.listen(PORT, () => {
    console.log('Сервер: http://localhost:' + PORT);
});