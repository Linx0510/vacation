const db = require('../config/database');

class ContactMessageModel {
  static async create({ name, phone, email, message, source }) {
    try {
      // Очистка данных перед вставкой
      const cleanName = String(name || 'Аноним').substring(0, 255);
      const cleanPhone = String(phone || 'Не указан').substring(0, 20);
      const cleanEmail = email ? String(email).substring(0, 255) : null;
      const cleanMessage = String(message || 'Без сообщения');
      const cleanSource = String(source || 'Неизвестно').substring(0, 100);

      const [result] = await db.execute(
        "INSERT INTO contact_messages (name, phone, email, message, source, status) VALUES (?, ?, ?, ?, ?, 'pending')",
        [cleanName, cleanPhone, cleanEmail, cleanMessage, cleanSource]
      );
      return result.insertId;
    } catch (err) {
      console.error('SQL ERROR in ContactMessageModel.create:', err);
      throw err;
    }
  }

  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM contact_messages WHERE id = ?', [id]);
    return rows[0];
  }

  static async updateStatus(id, status, admin_reply = null) {
    await db.execute(
      'UPDATE contact_messages SET status = ?, admin_reply = ?, replied_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, admin_reply, id]
    );
  }

  static async delete(id) {
    await db.execute('DELETE FROM contact_messages WHERE id = ?', [id]);
  }
}

module.exports = ContactMessageModel;
