const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
  res.end('Привет, мир!');
}).listen(3000, () => {
  console.log('Сервер запущен: http://localhost:3000');
});