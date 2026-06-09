const db = require('../config/database');

class ProposalModel {
  static async create({ user_id, title, category, description }) {
    const [result] = await db.execute(
      "INSERT INTO proposals (user_id, title, category, description, status, created_at) VALUES (?, ?, ?, ?, 'moderation', NOW())",
      [user_id, title, category, description]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM proposals WHERE id = ?', [id]);
    return rows[0];
  }

  static async findAll(filters = {}, userId = null) {
    let query = `
      SELECT p.*, u.first_name, u.last_name, u.email, u.avatar,
      (SELECT COUNT(*) FROM proposal_votes pv WHERE pv.proposal_id = p.id AND pv.user_id = ?) as user_voted
      FROM proposals p 
      JOIN users u ON p.user_id = u.id 
      WHERE 1=1
    `;
    const params = [userId || 0];

    // НЕ показываем предложения на модерации (moderation) и отклоненные (rejected)
    // Показываем только: voting, approved, in_progress, completed
    query += " AND p.status IN ('voting', 'approved', 'in_progress', 'completed')";

    if (filters.sort === 'popular') {
      query += ' ORDER BY p.votes_count DESC, p.created_at DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  static async findByUser(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM proposals WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  static async findByUserId(userId) {
    return ProposalModel.findByUser(userId);
  }

  static async vote(proposalId, userId) {
    try {
      // Проверяем, голосовал ли пользователь уже
      const [existing] = await db.execute(
        'SELECT id FROM proposal_votes WHERE proposal_id = ? AND user_id = ?',
        [proposalId, userId]
      );

      if (existing.length > 0) {
        // Если голос уже есть — УДАЛЯЕМ его
        await db.execute(
          'DELETE FROM proposal_votes WHERE proposal_id = ? AND user_id = ?',
          [proposalId, userId]
        );

        // Уменьшаем счетчик голосов
        await db.execute(
          'UPDATE proposals SET votes_count = GREATEST(0, votes_count - 1) WHERE id = ?',
          [proposalId]
        );

        const [updated] = await db.execute('SELECT votes_count FROM proposals WHERE id = ?', [proposalId]);
        return { action: 'removed', votes_count: updated[0].votes_count };
      }

      // Если голоса нет — ДОБАВЛЯЕМ его
      await db.execute(
        'INSERT INTO proposal_votes (proposal_id, user_id) VALUES (?, ?)',
        [proposalId, userId]
      );

      // Увеличиваем счетчик голосов
      await db.execute(
        'UPDATE proposals SET votes_count = votes_count + 1 WHERE id = ?',
        [proposalId]
      );

      const [updated] = await db.execute('SELECT votes_count FROM proposals WHERE id = ?', [proposalId]);
      return { action: 'added', votes_count: updated[0].votes_count };
    } catch (error) {
      console.error('Error in ProposalModel.vote:', error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE proposals SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows;
  }

  static async delete(id, userId) {
    await db.execute('DELETE FROM proposals WHERE id = ? AND user_id = ?', [id, userId]);
  }
  
  static async getTotalStats() {
    const [proposalsCount] = await db.execute(
      'SELECT COUNT(*) as total FROM proposals WHERE status IN ("voting", "approved", "in_progress", "completed")'
    );
    const [votesCount] = await db.execute(
      'SELECT SUM(votes_count) as total FROM proposals WHERE status IN ("voting", "approved", "in_progress", "completed")'
    );
    return {
      totalProposals: proposalsCount[0].total || 0,
      totalVotes: votesCount[0].total || 0
    };
  }
}

module.exports = ProposalModel;