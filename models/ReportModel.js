const db = require('../config/database');

class ReportModel {
  static async create({ user_id, review_id, reason }) {
    const [result] = await db.execute(
      'INSERT INTO review_reports (user_id, review_id, reason, status) VALUES (?, ?, ?, "pending")',
      [user_id, review_id, reason]
    );
    return result.insertId;
  }

  static async findAll() {
    const [rows] = await db.execute(`
      SELECT 
        rr.*, 
        u.email as reporter_email, 
        u.first_name as reporter_first_name,
        u.last_name as reporter_last_name,
        u.avatar as reporter_avatar,
        r.comment as review_text, 
        r.user_id as review_author_id,
        r.photos as review_photos,
        r.videos as review_videos,
        r.rating as review_rating,
        ru.email as review_author_email,
        ru.first_name as author_first_name,
        ru.last_name as author_last_name,
        ru.avatar as author_avatar,
        e.title as event_title,
        e.id as event_id
      FROM review_reports rr
      JOIN users u ON rr.user_id = u.id
      JOIN reviews r ON rr.review_id = r.id
      JOIN users ru ON r.user_id = ru.id
      LEFT JOIN events e ON r.event_id = e.id
      ORDER BY rr.created_at DESC
    `);
    return rows;
  }

  static async updateStatus(id, status, admin_comment = null) {
    const [result] = await db.execute(
      'UPDATE review_reports SET status = ?, admin_comment = ?, reviewed_at = NOW() WHERE id = ?',
      [status, admin_comment, id]
    );
    return result.affectedRows;
  }

  static async findByReviewId(reviewId, userId) {
    const [rows] = await db.execute(
      'SELECT * FROM review_reports WHERE review_id = ? AND user_id = ?',
      [reviewId, userId]
    );
    return rows[0];
  }

  static async deleteByReviewId(reviewId) {
    await db.execute('DELETE FROM review_reports WHERE review_id = ?', [reviewId]);
  }
}

module.exports = ReportModel;