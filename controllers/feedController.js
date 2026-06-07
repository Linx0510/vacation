const ReviewModel = require('../models/ReviewModel');

class FeedController {
  static async getFeed(req, res) {
    try {
      const userId = req.session.userId || null;
      const reviews = await ReviewModel.findAll(userId);
      res.render('user/feed', { reviews, user: req.user || null });
    } catch (error) {
      res.status(500).send('Ошибка при получении ленты: ' + error.message);
    }
  }
}

module.exports = FeedController;
