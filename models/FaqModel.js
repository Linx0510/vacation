const db = require('../config/database');

class FaqModel {
  static async findAll(role = null) {
    let query = 'SELECT * FROM faq';
    const params = [];
    if (role) {
      query += ' WHERE for_role = ?';
      params.push(role);
    }
    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async create({ question, answer, for_role }) {
    const [result] = await db.execute(
      'INSERT INTO faq (question, answer, for_role) VALUES (?, ?, ?)',
      [question, answer, for_role]
    );
    return result.insertId;
  }

  static async delete(id) {
    const [result] = await db.execute('DELETE FROM faq WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = FaqModel;
