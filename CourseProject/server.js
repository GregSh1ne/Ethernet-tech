const express = require('express'); 
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
require('dotenv').config(); 
const axios = require('axios'); 

const app = express();
const server = http.createServer(app); 
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_catalog';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('>>> База данных MongoDB подключена успешно'))
    .catch(err => console.error('!!! Ошибка подключения к БД:', err));

const Schema_Movies = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  year: Number,
  country: String,
  duration: Number,
  director_id: { type: mongoose.Schema.Types.ObjectId, ref: 'People' },
  actors_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'People' }],
  genres: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Genres' }],
  rating: { type: Number, default: 0 },
  poster_link: String,
  trailer_link: String
});

const Schema_Users = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: Number, default: 0 }, // 0-user, 1-admin
  favorite_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'People' }],
  date_of_create: { type: Date, default: Date.now }
}) 

const Schema_Reviews = new mongoose.Schema({
  movie_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Movies', required: true },
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  review_text: { type: String, required: true },
  user_rating: { type: Number, min: 1, max: 10 },
  published: { type: Date, default: Date.now }
});

const Schema_People = new mongoose.Schema({
  surname_name: { type: String, required: true },
  photo_link: String,
  birth_date: Date,
  birth_place: String,
  biography: String,
  roles: [String],
  movies_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movies' }]
})

const Schema_Notification = new mongoose.Schema({
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  message_text: String,
  message_type: { type: String, default: 'info' },
  status: { type: Boolean, default: false }, // false = не прочитано
  created_at: { type: Date, default: Date.now }
})

const Schema_Genres = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  system_name: { type: String, required: true, unique: true } // Для фильтров в URL
})

const Movies = mongoose.model('Movies', Schema_Movies);
const Users = mongoose.model('Users', Schema_Users);
const Reviews = mongoose.model('Reviews', Schema_Reviews);
const People = mongoose.model('People', Schema_People);
const Notification = mongoose.model('Notification', Schema_Notification);
const Genres = mongoose.model('Genres', Schema_Genres);

// Получение списка фильмов
app.get('/api/movies', async (req, res) => {
    try {
        const { genre, year } = req.query; 
        let query = {};
        if (genre) {
            query.genres = genre; 
        }
        if (year) {
            query.year = year;
        }
        const movies = await Movies.find(query).populate('genres', 'name');
        res.status(200).json(movies);
    }
    catch (err) {
        res.status(500).json({ message: "Ошибка при получении списка фильмов", error: err.message });
    }
});

// Детальная информация
app.get('/api/movies/:id', async (req, res) => {
  try {
        const movie = await Movies.findById(req.params.id)
            .populate('director_id')
            .populate('actors_ids')
            .populate('genres');
        if (!movie) {
            return res.status(404).json({ message: "Фильм не найден" });
        }
        res.status(200).json(movie);
    } 
    catch (err) {
        res.status(400).json({ message: "Некорректный идентификатор фильма", error: err.message });
    }
});

// "Мне повезет"
app.get('/api/movies/random', async (req, res) =>{
    try { 
        const randomMovie = await Movies.aggregate([{ $sample: { size: 1 } }]);
        if (randomMovie.length === 0) {
            return res.status(404).json({ message: "В каталоге пока нет фильмов" });
        }
        res.status(200).json(randomMovie[0]);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при выборе случайного фильма", error: err.message });
    }
});

// Данные о персоне
app.get('/api/people/:id', async (req, res) => {
    try {
        const person = await People.findById(req.params.id);
        if (!person) {
            return res.status(404).json({ message: "Персона не найдена" });
        }
        const filmography = await Movies.find({
            $or: [
                { director_id: req.params.id },
                { actors_ids: req.params.id }
            ]
        }).select('title year poster_link rating'); // Берем только нужные для списка поля
        res.status(200).json({
            person: person,
            movies: filmography
        });
    } 
    catch (err) {
        res.status(400).json({ message: "Некорректный ID", error: err.message });
    }
});

// Регистрация
app.post('/api/auth/register', async (req, res) => {
    try {
        const { login, password } = req.body;
        const candidate = await Users.findOne({ login });
        if (candidate) {
            return res.status(400).json({ message: "Пользователь с таким логином уже существует" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new Users({
            login: login,
            password: hashedPassword,
            date_of_create: new Date()
        });

        await user.save();
        res.status(201).json({ message: "Пользователь успешно зарегистрирован" });
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при регистрации", error: err.message });
    }
});

// Авторизация
app.post('/api/auth/login', async (req, res) => {
    try {
        const { login, password } = req.body;

        const user = await Users.findOne({ login });
        
        if (!user) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Неверный логин или пароль" });
        }

        // Если всё верно, возвращаем данные пользователя (без пароля!) 
        res.status(200).json({
            message: "Вход выполнен успешно",
            user: {
                id: user._id,
                login: user.login,
                role: user.role
            }
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка сервера", error: err.message });
    }
});

// Данные профиля
app.get('/api/user/profile/:id', async (req, res) => {
    try {
        const user = await Users.findById(req.params.id)
            .select('-password') 
            .populate('favorite_list'); // Подтягиваем данные об избранных актерах

        if (!user) {
            return res.status(404).json({ message: "Профиль не найден" });
        }
        res.status(200).json(user);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при получении данных профиля", error: err.message });
    }
});

// Добавление отзыва
app.post('/api/reviews', async (req, res) => {
    try {
        const { movie_id, author_id, review_text, user_rating } = req.body;

        const newReview = new Reviews({
            movie_id,
            author_id,
            review_text,
            user_rating,
            published: new Date()
        });

        await newReview.save();

        const movieReviews = await Reviews.find({ movie_id });
        const avgRating = movieReviews.reduce((acc, item) => acc + item.user_rating, 0) / movieReviews.length;

        await Movies.findByIdAndUpdate(movie_id, { rating: avgRating.toFixed(1) });

        const populatedReview = await newReview.populate('author_id', 'login');
        
        // Отправляем событие "new_review" всем подключенным клиентам
        io.emit('display_review', {
            review: populatedReview,
            movie_id: movie_id
        });

        res.status(201).json({ message: "Отзыв опубликован", review: populatedReview });
    }
    catch (err) {
        res.status(500).json({ message: "Ошибка при публикации отзыва", error: err.message });
    }
});

// История отзывов
app.get('/api/reviews/user/:id', async (req, res) => {
    try {
        const userReviews = await Reviews.find({ author_id: req.params.id })
            .populate('movie_id', 'title poster_link')
            .sort({ published: -1 });

        res.status(200).json(userReviews);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при загрузке истории отзывов", error: err.message });
    }
});

// Добавление в "Избранное"
app.post('/api/user/favorites', async (req, res) => {
    try {
        const { userId, personId } = req.body;

        const updatedUser = await Users.findByIdAndUpdate(
            userId,
            { $addToSet: { favorite_list: personId } }, 
            { new: true } // Параметр, чтобы метод вернул уже обновленный документ
        ).populate('favorite_list');

        if (!updatedUser) {
            return res.status(404).json({ message: "Пользователь не найден" });
        }

        res.status(200).json({
            message: "Добавлено в избранное",
            favorites: updatedUser.favorite_list
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при добавлении в избранное", error: err.message });
    }
});

// Список жанров
app.get('/api/genres', async (req, res) => {
    try {
        const genres = await Genres.find();
        res.status(200).json(genres);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при загрузке списка жанров", error: err.message });
    }
});

// Уведомление
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const notifications = await Notification.find({ 
            receiver_id: req.params.userId, 
            status: false 
        }).sort({ created_at: -1 });

        res.status(200).json(notifications);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при загрузке уведомлений", error: err.message });
    }
});

// Статистика
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [totalMovies, totalUsers, totalReviews] = await Promise.all([
            Movies.countDocuments(),
            Users.countDocuments(),
            Reviews.countDocuments()
        ]);

        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const newReviews = await Reviews.countDocuments({ published: { $gte: dayAgo } });

        res.status(200).json({
            totalMovies,
            totalUsers,
            totalReviews,
            newReviews
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при формировании статистики", error: err.message });
    }
});

// Добавление фильма
app.post('/api/admin/movies', async (req, res) => {
    try {
        const { title, description, year, country, duration, director_id, actors_ids, genres, poster_link, trailer_link } = req.body;

        const newMovie = new Movies({
            title,
            description,
            year,
            country,
            duration,
            director_id,
            actors_ids,
            genres,
            poster_link,
            trailer_link
        });

        await newMovie.save();

        res.status(201).json({
            message: "Новый фильм успешно добавлен в каталог",
            movie: newMovie
        });
    } 
    catch (err) {
        res.status(400).json({ message: "Ошибка при добавлении фильма", error: err.message });
    }
});

// Удаление контента
app.delete('/api/admin/movies/:id', async (req, res) => {
    try {
        const deletedMovie = await Movies.findByIdAndDelete(req.params.id);

        if (!deletedMovie) {
            return res.status(404).json({ message: "Фильм не найден, удаление невозможно" });
        }

        res.status(200).json({ 
            message: "Фильм успешно удален из системы",
            id: req.params.id 
        });
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при удалении контента", error: err.message });
    }
});

server.listen(PORT, () => console.log(`MovieHub запущен на порту ${PORT}`));
