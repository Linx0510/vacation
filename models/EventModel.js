const db = require('../config/database');

class EventModel {
  static async create({ organizer_id, title, description, category_id, date, location, max_participants, media_url }) {
    const [result] = await db.execute(
      `INSERT INTO events (organizer_id, title, description, category_id, date, location, max_participants, media_url, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [organizer_id, title, description, category_id, date, location, max_participants || 50, media_url]
    );
    return result.insertId;
  }

  static async update(eventId, { title, description, category_id, date, location, max_participants, media_url, status }) {
    const [result] = await db.execute(
      `UPDATE events 
       SET title = ?, description = ?, category_id = ?, date = ?, location = ?, max_participants = ?, media_url = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [title, description, category_id, date, location, max_participants, media_url, status || 'pending', eventId]
    );
    return result.affectedRows;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT e.*, u.role as creator_role,
      (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'going') as participants_count
      FROM events e 
      JOIN users u ON e.organizer_id = u.id
      WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    if (filters.role) {
      query += ' AND u.role = ?';
      params.push(filters.role);
    }

    if (filters.category && filters.category !== 'all') {
      const catMap = {
        'seasonal': 1,
        'thematic': 2,
        'workshop': 3,
        'outdoor': 4
      };
      const catId = catMap[filters.category];
      if (catId) {
        query += ' AND e.category_id = ?';
        params.push(catId);
      }
    }

    if (filters.search) {
      query += ' AND (e.title LIKE ? OR e.description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.date_from && filters.date_from !== '') {
      query += ' AND e.date >= ?';
      params.push(filters.date_from);
    }

    if (filters.date_to && filters.date_to !== '') {
      query += ' AND e.date <= ?';
      params.push(filters.date_to + ' 23:59:59');
    }

    if (filters.location) {
      query += ' AND e.location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    query += ' ORDER BY e.date ASC';
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await db.execute(
      `SELECT e.*, u.first_name, u.last_name, u.avatar, u.email, u.phone,
       (SELECT COUNT(*) FROM participants WHERE event_id = e.id AND status = 'going') as participants_count
       FROM events e 
       JOIN users u ON e.organizer_id = u.id 
       WHERE e.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async findByOrganizerId(organizerId) {
    const [rows] = await db.execute(
      'SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC',
      [organizerId]
    );
    return rows;
  }

  static async updateStatus(id, status, comment = null) {
    const [result] = await db.execute(
      'UPDATE events SET status = ?, moderation_comment = ? WHERE id = ?',
      [status, comment, id]
    );
    return result.affectedRows;
  }

  static async delete(id) {
    await db.execute('DELETE FROM events WHERE id = ?', [id]);
  }

  static async findParticipantsByEventId(eventId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, p.created_at 
       FROM participants p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.event_id = ? AND p.status = 'going'`,
      [eventId]
    );
    return rows;
  }

  static async isParticipant(eventId, userId) {
    const [rows] = await db.execute(
      "SELECT * FROM participants WHERE event_id = ? AND user_id = ? AND status = 'going'",
      [eventId, userId]
    );
    return rows.length > 0;
  }

  static async addParticipant(eventId, userId) {
    const [result] = await db.execute(
      "INSERT INTO participants (event_id, user_id, status) VALUES (?, ?, 'going')",
      [eventId, userId]
    );
    
    // Обновляем счетчик участников
    await db.execute(
      'UPDATE events SET participants_count = participants_count + 1 WHERE id = ?',
      [eventId]
    );
    
    return result.affectedRows;
  }

  static async removeParticipant(eventId, userId) {
    const [result] = await db.execute(
      'DELETE FROM participants WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    
    // Обновляем счетчик участников
    await db.execute(
      'UPDATE events SET participants_count = participants_count - 1 WHERE id = ?',
      [eventId]
    );
    
    return result.affectedRows;
  }
}

module.exports = EventModel;