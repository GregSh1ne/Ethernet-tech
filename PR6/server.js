const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

let users = {};
try {
  const data = fs.readFileSync(path.join(__dirname, 'users.json'), 'utf8');
  users = JSON.parse(data);
} catch (e) {
  console.warn('Не удалось загрузить users.json');
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`Запрос: ${req.url}`);

  // === 1. Текст ===
  if (pathname === '/text') {
    res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Это обычный текст');
  }

  // === 2. JSON ===
  else if (pathname === '/json') {
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    res.end(JSON.stringify({ status: 'ok', message: 'Данные в JSON' }));
  }

  // === 3. Файлы (HTML, JPEG и др.) ===
  else if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, 'index.html', 'text/html');
  }
  else if (pathname === '/logo.svg') {
    serveFile(res, 'logo.svg', 'image/svg+xml');
  }

  // === 4. Авторизация через GET-запрос ===
  else if (pathname === '/login') {
    const { username, password } = parsedUrl.query;
    
    if (users[username] && users[username] === password) {
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({ success: true, message: 'Вход выполнен' }));
    } else {
      res.writeHead(401, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({ success: false, message: 'Неверный логин или пароль' }));
    }
  }

  // === 5. Страница с формой входа ===
  else if (pathname === '/login-page') {
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
    res.end(`
      <!DOCTYPE html>
      <html><body>
        <h2>Вход</h2>
        <form action="/login" method="get">
          Логин: <input name="username"><br>
          Пароль: <input name="password" type="password"><br>
          <button type="submit">Войти</button>
        </form>
        <p>Тест: admin / 12345</p>
      </body></html>
    `);
  }

  // === 404 ===
  else {
    res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Страница не найдена');
  }
});

// Вспомогательная функция для отправки файлов
function serveFile(res, filename, contentType) {
  const filePath = path.join(__dirname, filename);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Файл не найден');
      return;
    }
    res.writeHead(200, {'Content-Type': contentType});
    res.end(data);
  });
}

server.listen(3000, () => {
  console.log('Сервер работает: http://localhost:3000');
  console.log('Маршруты:');
  console.log('/text       → обычный текст');
  console.log('/json       → JSON-ответ');
  console.log('/           → index.html');
  console.log('/logo.svg  → картинка');
  console.log('/login-page → форма входа');
  console.log('/login?username=...&password=... → проверка авторизации');
});