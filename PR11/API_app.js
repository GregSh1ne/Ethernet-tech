const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http"); // Добавили для работы сокетов
const { Server } = require("socket.io"); // Подключаем Socket.io

const app = express();
const server = http.createServer(app); // Создаем сервер
const io = new Server(server); // Инициализируем сокеты

const FILE_PATH = path.join(__dirname, "users.json");

app.use(express.json());
app.use(express.static(__dirname + "/public"));

// --- 1. ОГРАНИЧЕНИЕ ЗАПРОСОВ (Rate Limiting) ---
const requestCounts = new Map();
const RATE_LIMIT = 50; 
const TIME_WINDOW = 60 * 1000;

app.use((req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (!requestCounts.has(ip)) requestCounts.set(ip, { count: 1, startTime: now });
    else {
        const data = requestCounts.get(ip);
        if (now - data.startTime < TIME_WINDOW) {
            data.count++;
            if (data.count > RATE_LIMIT) return res.status(429).json({ error: "Too many requests" });
        } else requestCounts.set(ip, { count: 1, startTime: now });
    }
    next();
});

// --- 2. АВТОРИЗАЦИЯ ---
const API_KEY = "group-secret-key-2026";
const authHeader = (req, res, next) => {
    if (req.headers["x-api-key"] === API_KEY) return next();
    res.status(401).json({ error: "Unauthorized" });
};

// Вспомогательные функции
const readData = () => JSON.parse(fs.readFileSync(FILE_PATH, "utf8") || "[]");
const writeData = (data) => {
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    io.emit("users_updated"); // КЛЮЧЕВОЙ МОМЕНТ: Сигнал всем клиентам об обновлении
};

// --- API ФУНКЦИИ ---

app.get("/api/users", (req, res) => res.send(readData()));

app.get("/api/users/search", (req, res) => {
    const name = req.query.name?.toLowerCase();
    res.send(readData().filter(u => u.name.toLowerCase().includes(name)));
});

app.get("/api/users/stats", (req, res) => {
    const users = readData();
    const avg = users.length ? users.reduce((s, u) => s + Number(u.age), 0) / users.length : 0;
    res.json({ count: users.length, averageAge: avg.toFixed(1) });
});

app.get("/api/users/:id", (req, res) => {
    const user = readData().find(u => u.id == req.params.id);
    user ? res.send(user) : res.status(404).send();
});

app.post("/api/users", authHeader, (req, res) => {
    if (!req.body.name || !req.body.age) return res.status(400).send("Missing data");
    const users = readData();
    const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
    
    const newUser = {
        id: maxId + 1,
        name: req.body.name, 
        age: req.body.age
    };
    
    users.push(newUser);
    writeData(users);
    res.status(201).send(newUser);
});

app.delete("/api/users/:id", authHeader, (req, res) => {
    let users = readData();
    const user = users.find(u => u.id == req.params.id);
    if (!user) return res.status(404).send();
    writeData(users.filter(u => u.id != req.params.id));
    res.send(user);
});

app.put("/api/users", authHeader, (req, res) => {
    const users = readData();
    const index = users.findIndex(u => u.id == req.body.id);
    if (index === -1) return res.status(404).send();
    users[index] = { ...users[index], name: req.body.name, age: req.body.age };
    writeData(users);
    res.send(users[index]);
});

// Слушаем через server, а не через app
server.listen(3000, () => console.log("Сервер реального времени: http://localhost:3000"));