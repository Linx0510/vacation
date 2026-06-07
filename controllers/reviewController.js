const db = require('../config/database');
const ReviewModel = require('../models/ReviewModel');
const ReportModel = require('../models/ReportModel');

console.log('REVIEW CONTROLLER LOADED');

const ReviewController = {
    create: async (req, res) => {
        console.log('=== CREATE REVIEW CALLED ===');
        console.log('Body:', req.body);
        console.log('Files:', req.files);
        
        try {
            const user_id = req.session ? req.session.userId : null;
            const { event_id, comment } = req.body;

            if (!user_id) {
                console.log('No user_id in session');
                return res.status(401).json({ success: false, message: 'Пожалуйста, войдите в систему заново' });
            }

            if (!event_id || !comment) {
                console.log('Missing fields');
                return res.status(400).json({ success: false, message: 'Заполните все поля' });
            }

            let photos = [];
            let videos = [];

            if (req.files) {
                if (req.files.photos) {
                    photos = req.files.photos.map(f => '/images/uploads/feed_posts/' + f.filename);
                }
                if (req.files.videos) {
                    videos = req.files.videos.map(f => '/images/uploads/feed_posts/' + f.filename);
                }
            }

            console.log('Saving review...');
            const reviewId = await ReviewModel.create({
                user_id,
                event_id,
                comment,
                rating: 5,
                photos: JSON.stringify(photos),
                videos: JSON.stringify(videos)
            });

            console.log('Review saved, ID:', reviewId);
            
            return res.json({ 
                success: true, 
                message: 'Отзыв опубликован',
                reviewId 
            });
            
        } catch (error) {
            console.error('ERROR:', error);
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    },

    toggleLike: async (req, res) => {
        console.log('=== TOGGLE LIKE ===', req.params.id);
        try {
            const reviewId = req.params.id;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Не авторизован' });
            }

            const result = await ReviewModel.toggleLike(reviewId, userId);
            const [likesResult] = await db.execute('SELECT COUNT(*) as count FROM review_likes WHERE review_id = ?', [reviewId]);

            return res.json({ 
                success: true, 
                liked: result.liked, 
                likes: likesResult[0].count 
            });
        } catch (error) {
            console.error('Like error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    },

    delete: async (req, res) => {
        try {
            const reviewId = req.params.id;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Не авторизован' });
            }

            const [reviewRows] = await db.execute('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);
            if (reviewRows.length === 0) {
                return res.status(404).json({ success: false, error: 'Отзыв не найден' });
            }

            const isAdmin = req.session.role === 'admin' || req.session.userRole === 'admin';
            if (reviewRows[0].user_id !== userId && !isAdmin) {
                return res.status(403).json({ success: false, error: 'Недостаточно прав' });
            }

            await db.execute('DELETE FROM review_likes WHERE review_id = ?', [reviewId]);
            await db.execute('DELETE FROM review_reports WHERE review_id = ?', [reviewId]);
            await db.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
            
            res.json({ success: true });
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    report: async (req, res) => {
        try {
            const { reviewId, reason } = req.body;
            const userId = req.session.userId;

            if (!userId) {
                return res.status(401).json({ success: false, error: 'Не авторизован' });
            }

            const duplicate = await ReportModel.findByReviewId(reviewId, userId);
            if (duplicate) {
                return res.status(409).json({ success: false, error: 'Вы уже отправляли жалобу на этот отзыв' });
            }

            await ReportModel.create({ review_id: reviewId, user_id: userId, reason });
            
            res.json({ success: true });
        } catch (error) {
            console.error('Report error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = ReviewController;
