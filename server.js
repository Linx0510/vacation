const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Включаем детальное логирование ошибок
process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много попыток входа'
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

const uploadDirs = [
    'public/images/uploads/avatars',
    'public/images/uploads/event_pics',
    'public/images/uploads/feed_posts'
];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const routes = require('./routes/index');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/images/uploads')));

app.use(session({
    secret: 'event_platform_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(flash());

app.use(async (req, res, next) => {
    res.locals.cookieAccepted = req.session.cookieAccepted || false;
    res.locals.user = req.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.path = req.path;
    next();
});

const db = require('./config/database');
const OrganizerController = require('./controllers/organizerController');

app.use('/', routes);

// Профиль организатора доступен по прямой ссылке с страницы мероприятия
app.get('/organizer/:id', OrganizerController.getOrganizerProfile);
app.get('/organizer/profile/:id', OrganizerController.getOrganizerProfile);

app.get('/privacy', (req, res) => res.render('pages/privacy', { path: '/privacy', user: null, success: [], error: [] }));
app.get('/personal-data', (req, res) => res.render('pages/personalData', { path: '/personal-data', user: null, success: [], error: [] }));
app.get('/terms', (req, res) => res.render('legal/terms-of-use', { path: '/terms', user: null, success: [], error: [] }));
app.get('/marketing-consent', (req, res) => res.render('legal/marketing-consent', { path: '/marketing-consent', user: null, ip: req.ip, success: [], error: [] }));

app.use((req, res) => {
    res.status(404).send('<h1>404: Страница не найдена</h1>');
});

app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR HANDLER:', err);
    console.error('Error stack:', err.stack);
    
    if (req.xhr || req.headers.accept?.includes('json') || req.path.startsWith('/user/')) {
        return res.status(500).json({ 
            success: false, 
            message: err.message || 'Внутренняя ошибка сервера'
        });
    }
    
    res.status(500).send(`<h1>Ошибка</h1><p>${err.message}</p>`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\nСервер запущен: http://localhost:${PORT}`);
    console.log(`\nДАННЫЕ ДЛЯ ВХОДА:`);
    console.log(`Email: admin@mail.ru`);
    console.log(`Пароль: admin123\n`);
});
