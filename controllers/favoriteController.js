const FavoriteModel = require('../models/FavoriteModel');

class FavoriteController {
  static async addToFavorites(req, res) {
    try {
      const { eventId } = req.body;
      await FavoriteModel.add(req.session.userId, eventId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async removeFromFavorites(req, res) {
    try {
      const eventId = req.params.id || req.body.eventId;
      await FavoriteModel.remove(req.session.userId, eventId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getFavorites(req, res) {
    res.redirect('/user/profile?tab=favorites');
  }
}

module.exports = FavoriteController;
