const db = require('../config/database');

class ReviewModel {
    static normalizeMedia(review) {
        let photos = [];
        let videos = [];
        try {
            if (review.photos) {
                photos = typeof review.photos === 'string' ? JSON.parse(review.photos) : review.photos;
            }
            if (review.videos) {
                videos = typeof review.videos === 'string' ? JSON.parse(review.videos) : review.videos;
            }
        } catch (e) {
            console.error('Error parsing media for review', review.id, e);
        }
        return {
            ...review,
            photos: Array.isArray(photos) ? photos : [],
            videos: Array.isArray(videos) ? videos : []
        };
    }

    static async create(data) {
        const { user_id, event_id, comment, rating, photos, videos } = data;
        const [result] = await db.execute(
            'INSERT INTO reviews (user_id, event_id, comment, rating, photos, videos) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, event_id, comment, rating || 5, photos || '[]', videos || '[]']
        );
        return result.insertId;
    }

    static async toggleLike(reviewId, userId) {
        const [existing] = await db.execute(
            'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
            [reviewId, userId]
        );
        
        if (existing.length > 0) {
            await db.execute(
                'DELETE FROM review_likes WHERE review_id = ? AND user_id = ?',
                [reviewId, userId]
            );
            return { liked: false };
        } else {
            await db.execute(
                'INSERT INTO review_likes (review_id, user_id) VALUES (?, ?)',
                [reviewId, userId]
            );
            return { liked: true };
        }
    }

    static async delete(reviewId, userId) {
        // Проверяем, что пользователь является автором отзыва
        const [review] = await db.execute(
            'SELECT user_id FROM reviews WHERE id = ?',
            [reviewId]
        );
        
        if (review.length === 0) {
            throw new Error('Отзыв не найден');
        }
        
        if (review[0].user_id !== userId) {
            throw new Error('Недостаточно прав');
        }
        
        // Удаляем связанные лайки
        await db.execute('DELETE FROM review_likes WHERE review_id = ?', [reviewId]);
        
        // Удаляем связанные жалобы
        await db.execute('DELETE FROM review_reports WHERE review_id = ?', [reviewId]);
        
        // Удаляем сам отзыв
        await db.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
        
        return true;
    }

    static async getById(reviewId) {
        const [reviews] = await db.execute(
            `SELECT r.*, 
                    u.first_name, u.last_name, u.avatar,
                    e.title as event_title
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             LEFT JOIN events e ON r.event_id = e.id
             WHERE r.id = ?`,
            [reviewId]
        );
        return reviews[0] ? ReviewModel.normalizeMedia(reviews[0]) : null;
    }

    static async findByEventId(eventId, userId = null) {
        const [reviews] = await db.execute(
            `SELECT r.*, 
                    u.first_name, u.last_name, u.avatar as user_avatar,
                    e.title as event_title, e.id as event_id,
                    (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
             FROM reviews r
             LEFT JOIN users u ON r.user_id = u.id
             LEFT JOIN events e ON r.event_id = e.id
             WHERE r.event_id = ?
             ORDER BY r.created_at DESC`,
            [eventId]
        );

        return Promise.all(reviews.map(async (review) => {
            let user_liked = false;
            if (userId) {
                const [liked] = await db.execute(
                    'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
                    [review.id, userId]
                );
                user_liked = liked.length > 0;
            }
            return { ...ReviewModel.normalizeMedia(review), user_liked };
        }));
    }

    static async getUserReviews(userId) {
        const [reviews] = await db.execute(
            `SELECT r.*, e.title as event_title, e.id as event_id,
                    (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
             FROM reviews r
             LEFT JOIN events e ON r.event_id = e.id
             WHERE r.user_id = ?
             ORDER BY r.created_at DESC`,
            [userId]
        );
        
        return Promise.all(reviews.map(async (review) => {
            let user_liked = false;
            if (userId) {
                const [liked] = await db.execute(
                    'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
                    [review.id, userId]
                );
                user_liked = liked.length > 0;
            }
            return { ...ReviewModel.normalizeMedia(review), user_liked };
        }));
    }

    static async getAllReviews(userId = null) {
        const [reviews] = await db.execute(`
            SELECT r.*, 
                    u.first_name, u.last_name, u.avatar as user_avatar,
                    e.title as event_title, e.id as event_id,
                    (SELECT COUNT(*) FROM review_likes WHERE review_id = r.id) as likes_count
            FROM reviews r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN events e ON r.event_id = e.id
            ORDER BY r.created_at DESC
        `);
        
        return Promise.all(reviews.map(async (review) => {
            let user_liked = false;
            if (userId) {
                const [liked] = await db.execute(
                    'SELECT id FROM review_likes WHERE review_id = ? AND user_id = ?',
                    [review.id, userId]
                );
                user_liked = liked.length > 0;
            }
            return { ...ReviewModel.normalizeMedia(review), user_liked };
        }));
    }

    static async findAll(userId = null) {
        return ReviewModel.getAllReviews(userId);
    }
}

module.exports = ReviewModel;