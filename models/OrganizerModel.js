const db = require('../config/database');

class OrganizerModel {
  static async create({ user_id, company_name, description }) {
    const [result] = await db.execute(
      'INSERT INTO organizers (user_id, company_name, description) VALUES (?, ?, ?)',
      [user_id, company_name, description]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    const [rows] = await db.execute('SELECT * FROM organizers WHERE user_id = ?', [userId]);
    return rows[0];
  }

  static async verify(id) {
    const [result] = await db.execute('UPDATE organizers SET is_verified = 1 WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = OrganizerModel;
