const express = require('express');
const mustacheExpress = require('mustache-express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: false }));

const rawData = fs.readFileSync('data.json');
const siteData = JSON.parse(rawData).pages;

const pages = ['home', 'about', 'services', 'contacts', 'feedback', 'dostup'];

pages.forEach(page => {
    app.get(page === 'home' ? '/' : `/${page}`, (req, res) => {
        const data = siteData[page];
        data.isFeedback = (page === 'feedback');
        res.render('layout', data);
    });
});

app.post('/submit', (req, res) => {
    const data = req.body;
    const items = Object.keys(data).map(key => ({
        key: key,
        value: data[key]
    }));

    res.render('layout', {
        title: 'Результаты формы',
        content: 'Данные успешно получены!',
        formData: { items: items }
    });
});

app.listen(3000, () => {
    console.log('Сервер запущен: http://localhost:3000');
});