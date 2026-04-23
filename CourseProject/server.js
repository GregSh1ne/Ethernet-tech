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
const API_KEY = process.env.OMDB_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_catalog';
const TMDB_KEY = process.env.TMDB_API_KEY;

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
  imdb_rating: { type: Number, default: 0 },
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
        const { genre, yearFrom, yearTo, search, page = 1, limit = 24, ratingFrom, imdbRatingFrom } = req.query;
        let query = {};

        // Фильтрация по жанру
        if (genre && genre !== 'Все жанры') query.genres = genre; 

        // Фильтрация по году
        if (yearFrom || yearTo) {
            query.year = {};
            if (yearFrom) query.year.$gte = parseInt(yearFrom);
            if (yearTo) query.year.$lte = parseInt(yearTo);
        }

        // Поиск по названию
        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        if (ratingFrom) {
            query.rating = { $gte: parseFloat(ratingFrom) };
        }
        if (imdbRatingFrom) {
            query.imdb_rating = { $gte: parseFloat(imdbRatingFrom) };
        }

        // 1. Сначала вычисляем, сколько записей нужно пропустить
        const skipValue = (parseInt(page) - 1) * parseInt(limit);

        // 2. Выполняем запрос с использованием вычисленного skip
        const movies = await Movies.find(query)
            .populate('genres', 'name')
            .skip(skipValue)   
            .limit(parseInt(limit));

        // 3. Считаем общее количество документов для пагинации на фронтенде
        const total = await Movies.countDocuments(query);

        res.status(200).json({
            movies,
            total,
            pages: Math.ceil(total / limit)
        });
    }
    catch (err) {
        res.status(500).json({ message: "Ошибка поиска", error: err.message });
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

        // Оставляем только ОДНО объявление переменной
        const populatedReview = await newReview.populate('author_id', 'login');
        
        // Отправляем сам отзыв для "Живой ленты"
        io.emit('display_review', {
            movie_id: movie_id,
            review: populatedReview
        });

        // Обновляем рейтинг MovieHub
        io.emit('update_movie_rating', {
            movie_id: movie_id,
            new_rating: avgRating.toFixed(1)
        });

        res.status(201).json({ message: "Отзыв опубликован", review: populatedReview });
    }
    catch (err) {
        res.status(500).json({ message: "Ошибка при публикации отзыва", error: err.message });
    }
});

app.get('/api/reviews/movie/:id', async (req, res) => {
    try {
        const reviews = await Reviews.find({ movie_id: req.params.id })
            .populate('author_id', 'login')
            .sort({ published: -1 });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Ошибка загрузки отзывов" });
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
        // Добавили imdb_rating и rating в деструктуризацию
        const { title, description, year, country, duration, director_id, actors_ids, genres, poster_link, trailer_link, imdb_rating, rating } = req.body;

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
            trailer_link,
            imdb_rating: imdb_rating || 0, // ТЕПЕРЬ СОХРАНЯЕТСЯ
            rating: rating || 0
        });

        await newMovie.save();
        res.status(201).json({ message: "Новый фильм успешно добавлен", movie: newMovie });
    } 
    catch (err) {
        res.status(400).json({ message: "Ошибка при добавлении фильма", error: err.message });
    }
});

// Маршрут для получения данных из IMDb (через OMDb)
app.get('/api/admin/fetch-imdb/:imdbId', async (req, res) => {
    const { imdbId } = req.params;
    const API_KEY = process.env.OMDB_API_KEY || 'ТВОЙ_КЛЮЧ';

    try {
        const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${API_KEY}`);
        const data = response.data;

        if (data.Response === "False") {
            return res.status(404).json({ message: "Фильм не найден в IMDb" });
        }

        // Мапим (сопоставляем) данные OMDb под твою схему
        const movieData = {
            title: data.Title,
            year: parseInt(data.Year),
            rating: parseFloat(data.imdbRating),
            description: data.Plot,
            poster_link: data.Poster,
            duration: parseInt(data.Runtime), // Например, "148 min" станет 148
            trailer_link: "" // Трейлер придется искать отдельно (OMDb их не дает)
        };

        res.json(movieData);
    } catch (err) {
        res.status(500).json({ message: "Ошибка внешнего API" });
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

app.put('/api/admin/movies/:id', async (req, res) => {
    try {
        const updatedMovie = await Movies.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        if (!updatedMovie) return res.status(404).json({ message: "Фильм не найден" });
        res.json({ message: "Данные успешно обновлены", movie: updatedMovie });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/admin/smart-import/:imdbId', async (req, res) => {
    const { imdbId } = req.params;

    try {
        // 1. Находим внутренний ID фильма в TMDB по его IMDb ID
        const findRes = await axios.get(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id&language=ru-RU`);
        const movieBrief = findRes.data.movie_results[0];
        if (!movieBrief) return res.status(404).json({ message: "Фильм не найден" });

        const tmdbId = movieBrief.id;

        // 2. Получаем полные данные о фильме и актерах (credits)
        const movieRes = await axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits&language=ru-RU`);
        const data = movieRes.data;

        // 3. ФУНКЦИЯ-ПОМОЩНИК: Импорт персоны
        const importPerson = async (tmdbPersonId) => {
            // Ищем в коллекции People по имени
            const pRes = await axios.get(`https://api.themoviedb.org/3/person/${tmdbPersonId}?api_key=${TMDB_KEY}&language=ru-RU`);
            const p = pRes.data;

            let person = await People.findOne({ surname_name: p.name }); 
            
            if (person) return person._id;

            const newPerson = await People.create({
                surname_name: p.name,
                roles: [p.known_for_department],
                birth_date: p.birthday ? new Date(p.birthday) : null,
                birth_place: p.place_of_birth,
                biography: p.biography,
                photo_link: `https://image.tmdb.org/t/p/w500${p.profile_path}`
            });
            return newPerson._id;
        };

        // 4. Обрабатываем режиссера и первых 5 актеров
        const directorData = data.credits.crew.find(c => c.job === 'Director');
        let directorId = directorData ? await importPerson(directorData.id) : null;

        let actorIds = [];
        const topActors = data.credits.cast.slice(0, 5); // Берем топ-5
        for (const actor of topActors) {
            const id = await importPerson(actor.id);
            actorIds.push(id);
        }

        const countries = data.production_countries.map(c => c.name).join(', ');

        // 5. Формируем объект фильма для фронтенда
        const finalMovie = {
            title: data.title,
            year: new Date(data.release_date).getFullYear(),
            rating: data.vote_average,
            description: data.overview,
            poster_link: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
            duration: data.runtime,
            country: countries, // ТЕПЕРЬ СТРАНА ПЕРЕДАЕТСЯ
            director_id: directorId,
            actors_ids: actorIds, // ИЗМЕНЕНО: было actors
            genres: data.genres.map(g => g.name)
        };

        res.json(finalMovie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при глубоком импорте" });
    }
});

app.get('/api/people', async (req, res) => {
    try {
        // Находим всех людей и сортируем по имени для удобства
        const people = await People.find().sort({ surname_name: 1 });
        res.status(200).json(people);
    } 
    catch (err) {
        res.status(500).json({ message: "Ошибка при получении списка людей", error: err.message });
    }
});

server.listen(PORT, () => console.log(`MovieHub запущен на порту ${PORT}`));
