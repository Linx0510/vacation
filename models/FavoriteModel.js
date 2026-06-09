const db = require('../config/database');

class FavoriteModel {
  static async add(userId, eventId) {
    const [result] = await db.execute(
      `INSERT INTO favorites (user_id, event_id) VALUES (?, ?)
       ON CONFLICT (user_id, event_id) DO NOTHING`,
      [userId, eventId]
    );
    return result.affectedRows;
  }

  static async remove(userId, eventId) {
    const [result] = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return result.affectedRows;
  }

  static async findByUser(userId) {
    const [rows] = await db.execute(
      'SELECT e.* FROM events e JOIN favorites f ON e.id = f.event_id WHERE f.user_id = ?',
      [userId]
    );
    return rows;
  }

  static async isFavorite(userId, eventId) {
    const [rows] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return rows.length > 0;
  }
}

module.exports = FavoriteModel;
