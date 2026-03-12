const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://127.0.0.1:27017/boardDB')
  .then(() => console.log('Успешное подключение к MongoDB'))
  .catch(err => console.error('Ошибка подключения к БД:', err));

const adSchema = new mongoose.Schema({
  title: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

adSchema.index({ title: 'text', text: 'text' });
const Ad = mongoose.model('Ad', adSchema);


app.get('/api/ads', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    
    if (search) {
      query = { $text: { $search: search } };
    }
    
    const ads = await Ad.find(query).sort({ createdAt: -1 });
    res.json(ads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ads', async (req, res) => {
  try {
    const { title, text } = req.body;
    const newAd = new Ad({ title, text });
    await newAd.save();
    res.status(201).json(newAd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Ad.findByIdAndDelete(id);
    res.json({ message: 'Объявление удалено' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
