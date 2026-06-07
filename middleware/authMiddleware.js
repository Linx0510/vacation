const UserModel = require('../models/UserModel');

module.exports = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await UserModel.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.user = user;
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
    }
    return next();
  }
  res.redirect('/auth/login');
};
