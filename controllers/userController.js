const db = require('../config/database');
const ReviewModel = require('../models/ReviewModel');

const UserController = {
    getProfile: async (req, res) => {
        try {
            const userId = req.session.userId;
            
            if (!userId) {
                return res.redirect('/auth/login');
            }
            
            const [users] = await db.execute(
                'SELECT id, email, first_name, last_name, phone, avatar, role FROM users WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return res.redirect('/auth/login');
            }
            
            const user = users[0];
            
            const [favorites] = await db.execute(
                `SELECT e.* FROM events e
                 JOIN favorites f ON e.id = f.event_id
                 WHERE f.user_id = ?`,
                [userId]
            );
            
            const [going] = await db.execute(
                `SELECT e.* FROM events e
                 JOIN participants p ON e.id = p.event_id
                 WHERE p.user_id = ? AND p.status = 'going'`,
                [userId]
            );
            
            const reviews = await ReviewModel.getUserReviews(userId);
            
            const [proposals] = await db.execute(
                'SELECT * FROM proposals WHERE user_id = ? ORDER BY created_at DESC',
                [userId]
            );
            
            const allReviews = await ReviewModel.getAllReviews(userId);
            
            const [notifications] = await db.execute(
                'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
                [userId]
            );
            
            res.render('user/profile', {
                path: '/user/profile',
                user,
                favorites,
                going,
                reviews,
                proposals,
                allReviews,
                notifications,
                success: req.flash('success'),
                error: req.flash('error')
            });
        } catch (error) {
            console.error('GetProfile error:', error);
            req.flash('error', 'Ошибка загрузки профиля');
            res.redirect('/');
        }
    },

    updateProfile: async (req, res) => {
        try {
            const userId = req.session.userId;
            
            // Исправление 1: Защита от undefined
            const first_name = req.body.first_name !== undefined ? req.body.first_name : null;
            const last_name = req.body.last_name !== undefined ? req.body.last_name : null;
            const phone = req.body.phone !== undefined ? req.body.phone : null;
            
            // Исправление 2: Правильный путь для аватарки
            let avatar = null;
            if (req.file) {
                avatar = `/uploads/avatars/${req.file.filename}`;
                console.log('Avatar uploaded:', avatar);
            }
            
            // Исправление 3: Динамическое построение запроса
            const updates = [];
            const params = [];
            
            if (first_name !== null) {
                updates.push('first_name = ?');
                params.push(first_name);
            }
            
            if (last_name !== null) {
                updates.push('last_name = ?');
                params.push(last_name);
            }
            
            if (phone !== null) {
                updates.push('phone = ?');
                params.push(phone);
            }
            
            if (avatar) {
                updates.push('avatar = ?');
                params.push(avatar);
            }
            
            if (updates.length === 0) {
                req.flash('error', 'Нет данных для обновления');
                return res.redirect('/user/profile');
            }
            
            params.push(userId);
            const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
            
            console.log('SQL Query:', query);
            console.log('Params:', params);
            
            await db.execute(query, params);
            
            req.flash('success', 'Профиль обновлен');
            res.redirect('/user/profile');
        } catch (error) {
            console.error('UpdateProfile error:', error);
            req.flash('error', 'Ошибка обновления профиля: ' + error.message);
            res.redirect('/user/profile');
        }
    },

    clearNotifications: async (req, res) => {
        try {
            const userId = req.session.userId;
            await db.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
            res.json({ success: true });
        } catch (error) {
            console.error('Clear notifications error:', error);
            res.status(500).json({ success: false });
        }
    }
};

module.exports = UserController;