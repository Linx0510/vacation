const express = require('express');
const router = express.Router();
const OrganizerController = require('../controllers/organizerController');
const EventController = require('../controllers/eventController');
const PartnerController = require('../controllers/partnerController');

const multer = require('multer');
const path = require('path');

// Настройка хранилища
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/uploads/event_pics/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Только изображения разрешены!'), false);
  }
};

// Настройка multer - принимаем все поля формы
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Маршруты
router.get('/:id(\\d+)', OrganizerController.getOrganizerProfile);
router.get('/dashboard', OrganizerController.getDashboard);
router.get('/events', OrganizerController.getMyEvents);
router.get('/events/create', (req, res) => res.render('events/create'));
router.post('/events/create', upload.single('media'), EventController.createEvent);
router.post('/proposals/take/:id', OrganizerController.takeProposal);
router.get('/events/:id/participants', OrganizerController.getEventParticipants);

router.get('/partner/apply', PartnerController.getApplyPage);
router.post('/partner/apply', PartnerController.submitApply);

module.exports = router;