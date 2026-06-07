const db = require('../config/database');

module.exports = async (req, res, next) => {
    if (req.session && req.session.userId) {
        try {
            const [users] = await db.execute(
                'SELECT id, email, first_name, last_name, avatar, role, phone FROM users WHERE id = ?',
                [req.session.userId]
            );
            if (users.length > 0) {
                req.user = users[0];
                res.locals.user = users[0];
            }
        } catch (error) {
            console.error('SetUserMiddleware error:', error);
        }
    } else {
        res.locals.user = null;
    }
    next();
};