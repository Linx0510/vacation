const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const FavoriteController = require('../controllers/favoriteController');
const ProposalController = require('../controllers/proposalController');
const ReviewController = require('../controllers/reviewController');
const ParticipantController = require('../controllers/participantController');
const ReviewModel = require('../models/ReviewModel');
const ProposalModel = require('../models/ProposalModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Настройка multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = 'public/images/uploads/';
        if (file.fieldname === 'avatar') dest += 'avatars/';
        else if (file.fieldname === 'photos' || file.fieldname === 'videos') dest += 'feed_posts/';
        else dest += 'event_pics/';
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
const uploadNone = multer().none();

// ========== МАРШРУТЫ ПРОФИЛЯ ==========
router.get('/profile', UserController.getProfile);
router.post('/profile/update', upload.single('avatar'), UserController.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), UserController.updateProfile); // ← ДОБАВИТЬ ЭТУ СТРОКУ

// ========== ОСТАЛЬНЫЕ МАРШРУТЫ ==========
router.post('/favorites/add', FavoriteController.addToFavorites);
router.post('/favorites/remove', FavoriteController.removeFromFavorites);
router.post('/favorites/remove/:id', FavoriteController.removeFromFavorites);
router.get('/favorites', FavoriteController.getFavorites);

router.post('/going/join', ParticipantController.joinEvent);
router.post('/going/leave', ParticipantController.leaveEvent);
router.post('/going/leave/:id', ParticipantController.leaveEvent);
router.get('/going', ParticipantController.getMyGoing);

router.post('/proposals/create', ProposalController.createProposal);
router.post('/proposals/delete/:id', ProposalController.delete);
router.get('/proposals', ProposalController.getProposals);
router.post('/proposals/vote/:id', ProposalController.vote);

router.post('/reviews/create', upload.fields([
    { name: 'photos', maxCount: 5 }, 
    { name: 'videos', maxCount: 2 }
]), ReviewController.create);
router.post('/reviews/like/:id', ReviewController.toggleLike);
router.post('/reviews/report', ReviewController.report);
router.delete('/reviews/delete/:id', ReviewController.delete);
router.post('/reviews/delete/:id', ReviewController.delete);
router.get('/reviews/my', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Не авторизован' });
        const reviews = await ReviewModel.getUserReviews(userId);
        res.json({ success: true, reviews });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/proposals/my', async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) return res.status(401).json({ success: false, error: 'Не авторизован' });
        const proposals = await ProposalModel.findByUser(userId);
        res.json({ success: true, proposals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/notifications/clear', UserController.clearNotifications);
router.post('/notifications/read/:id', async (req, res) => {
    try {
        const NotificationModel = require('../models/NotificationModel');
        await NotificationModel.markAsRead(req.params.id, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});
router.post('/notifications/delete/:id', async (req, res) => {
    try {
        const NotificationModel = require('../models/NotificationModel');
        await NotificationModel.delete(req.params.id, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;