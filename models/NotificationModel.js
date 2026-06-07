const db = require('../config/database');

class NotificationModel {
  static async create({ user_id, title, message }) {
    if (!user_id) {
      console.error('Notification create: user_id is required');
      return null;
    }
    const [result] = await db.execute(
      'INSERT INTO notifications (user_id, title, message, created_at, is_read) VALUES (?, ?, ?, NOW(), 0)',
      [user_id, title, message]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  static async markAsRead(id, userId) {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async markAllAsRead(userId) {
    await db.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [userId]
    );
  }

  static async getUnreadCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count;
  }

  static async delete(id, userId) {
    await db.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async deleteAll(userId) {
    await db.execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
  }
}

module.exports = NotificationModel;