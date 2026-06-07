const db = require('../config/database');

class ParticipantModel {
  static async add(userId, eventId) {
    const [result] = await db.execute(
      'INSERT IGNORE INTO participants (user_id, event_id, status) VALUES (?, ?, "going")',
      [userId, eventId]
    );
    return result.affectedRows;
  }

  static async remove(userId, eventId) {
    const [result] = await db.execute(
      'DELETE FROM participants WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );
    return result.affectedRows;
  }

  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT e.*, p.created_at as joined_at 
       FROM events e 
       JOIN participants p ON e.id = p.event_id 
       WHERE p.user_id = ? AND p.status = 'going'
       ORDER BY e.date ASC`,
      [userId]
    );
    return rows;
  }

  static async findByEvent(eventId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, p.created_at 
       FROM users u 
       JOIN participants p ON u.id = p.user_id 
       WHERE p.event_id = ? AND p.status = 'going'`,
      [eventId]
    );
    return rows;
  }

  static async isParticipating(userId, eventId) {
    const [rows] = await db.execute(
      'SELECT id FROM participants WHERE user_id = ? AND event_id = ? AND status = "going"',
      [userId, eventId]
    );
    return rows.length > 0;
  }
}

module.exports = ParticipantModel;
