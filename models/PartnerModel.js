const db = require('../config/database');

class PartnerModel {
  static async create({ user_id, company_name, inn, contact_info }) {
    const [result] = await db.execute(
      'INSERT INTO partners (user_id, company_name, inn, contact_info, status) VALUES (?, ?, ?, ?, "pending")',
      [user_id || null, company_name, inn, contact_info]
    );
    return result.insertId;
  }

  static async findByUserId(userId) {
    try {
      const [rows] = await db.execute('SELECT * FROM partners WHERE user_id = ?', [userId]);
      return rows[0];
    } catch (error) {
      console.error('Error in PartnerModel.findByUserId:', error);
      // Если столбца user_id нет, попробуем найти по id (как временная мера)
      if (error.message.includes('Unknown column \'user_id\'')) {
        const [rows] = await db.execute('SELECT * FROM partners WHERE id = ?', [userId]);
        return rows[0];
      }
      throw error;
    }
  }

  static async findAll(status = null) {
    let query = 'SELECT p.*, u.email, u.first_name, u.last_name FROM partners p LEFT JOIN users u ON p.user_id = u.id';
    const params = [];
    if (status) {
      query += ' WHERE p.status = ?';
      params.push(status);
    }
    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async updateStatus(id, status, commission_rate = 10.00) {
    const [result] = await db.execute(
      'UPDATE partners SET status = ?, commission_rate = ? WHERE id = ?',
      [status, commission_rate, id]
    );
    return result.affectedRows;
  }
}

module.exports = PartnerModel;
