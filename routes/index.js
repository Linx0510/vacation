const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const setUserMiddleware = require('../middleware/setUserMiddleware');

const ReviewController = require('../controllers/reviewController');
const ProposalController = require('../controllers/proposalController');
const ParticipantController = require('../controllers/participantController');
const UserController = require('../controllers/userController');
const OrganizerController = require('../controllers/organizerController');
const EventController = require('../controllers/eventController');
const SupportChatClient = require('../utils/supportChatClient');
const rateLimit = require('express-rate-limit');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'public/images/uploads/';
    if (file.fieldname === 'avatar') dest += 'avatars/';
    else if (file.fieldname === 'media' || file.fieldname === 'event_pic' || file.fieldname === 'image') dest += 'event_pics/';
    else if (file.fieldname === 'feed_image') dest += 'feed_posts/';
    else dest += 'temp/';
    
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Разрешены только изображения и видео (MP4, MOV, AVI, WEBM)!'), false);
};

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter });
const uploadNone = multer().none();

const supportChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Слишком много сообщений. Попробуйте немного позже.' }
});

router.use(setUserMiddleware);

router.use('/', require('./publicRoutes'));
router.use('/auth', require('./authRoutes'));

router.get('/organizer/dashboard', authMiddleware, roleMiddleware(['organizer', 'admin']), OrganizerController.getDashboard);
router.get('/organizer/events', authMiddleware, roleMiddleware(['organizer', 'admin']), OrganizerController.getMyEvents);
router.get('/organizer/events/create', authMiddleware, roleMiddleware(['organizer', 'admin']), (req, res) => res.render('events/create'));
router.post('/organizer/events/create', authMiddleware, roleMiddleware(['organizer', 'admin']), upload.fields([{ name: 'media', maxCount: 1 }]), EventController.createEvent);
router.post('/organizer/proposals/take/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), OrganizerController.takeProposal);
router.get('/organizer/events/:id/participants', authMiddleware, roleMiddleware(['organizer', 'admin']), OrganizerController.getEventParticipants);
router.get('/organizer/:id', OrganizerController.getOrganizerProfile);

router.get('/events/test-exclusive', (req, res) => {
    const isGoing = req.session.testJoined || false;
    const isFavorite = req.session.testFavorite || false;
    res.render('events/single', {
        event: {
            id: 'test-exclusive',
            title: 'Фестиваль уличного искусства «Степь»',
            description: 'Главное культурное событие лета в Оренбурге. Фестиваль «Степь» объединяет художников, музыкантов и активную молодежь города. В программе: создание масштабного мурала на фасаде здания, воркшопы по граффити, лекции об урбанистике и большой концерт под открытым небом. Все участники получат памятные стикерпаки и возможность поработать с профессиональными материалами.',
            date: '2026-06-30',
            location: 'г. Оренбург, Советская 45',
            category_id: 'exclusive',
            media_url: '/images/static/event-1.jpg',
            participants_count: isGoing ? 89 : 88,
            max_participants: 100,
            price: 500,
            organizer_id: 1,
            status: 'approved',
            first_name: 'Алексей',
            last_name: 'Филиппов',
            avatar: '/images/static/admin-avatar.png'
        },
        user: req.session.user || null,
        isGoing: isGoing,
        isFavorite: isFavorite,
        reviews: [],
        path: '/events'
    });
});

router.post('/events/join/test-exclusive', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Необходима авторизация' });
    }
    req.session.testJoined = !req.session.testJoined;
    res.json({ success: true, message: req.session.testJoined ? 'Вы успешно записаны!' : 'Запись отменена' });
});

router.post('/user/favorites/test-exclusive', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Необходима авторизация' });
    }
    req.session.testFavorite = !req.session.testFavorite;
    res.json({ success: true, message: req.session.testFavorite ? 'Добавлено в избранное' : 'Удалено из избранного' });
});

router.use('/events', require('./eventRoutes'));

router.use('/user', authMiddleware, require('./userRoutes'));
router.use('/admin', authMiddleware, roleMiddleware(['admin']), require('./adminRoutes'));

router.get('/proposals', ProposalController.getProposals);
router.post('/proposals/vote/:id', authMiddleware, uploadNone, ProposalController.vote);
router.delete('/proposals/:id', authMiddleware, ProposalController.delete);

router.get('/api/cookie-consent', (req, res) => {
    res.json({ accepted: req.session.cookieAccepted === true });
});

router.post('/api/cookie-consent', uploadNone, (req, res) => {
    req.session.cookieAccepted = true;
    res.json({ success: true });
});


router.post('/api/support-chat', supportChatLimiter, async (req, res) => {
    try {
        const { message, history } = req.body || {};
        const answer = await SupportChatClient.askSupportBot(message, history);
        res.json({ success: true, answer, provider: SupportChatClient.getProvider() });
    } catch (error) {
        console.error('Support chat error:', error.message);
        res.status(500).json({
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? 'Чат поддержки временно недоступен. Попробуйте позже или отправьте сообщение через форму обратной связи.'
                : error.message
        });
    }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error', 'Файл слишком большой! Максимальный размер: 5 MB');
      return res.redirect('back');
    }
    if (err.code === 'UNEXPECTED_FILE') {
      req.flash('error', 'Неожиданное поле для загрузки файла');
      return res.redirect('back');
    }
  }
  if (err.message && err.message.includes('Только изображения')) {
    req.flash('error', err.message);
    return res.redirect('back');
  }
  next(err);
});

module.exports = router;