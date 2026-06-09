const EventModel = require('../models/EventModel');
const ProposalModel = require('../models/ProposalModel');
const db = require('../config/database');

class OrganizerController {
  static async getOrganizerProfile(req, res) {
    try {
      const organizerId = req.params.id;
      const userId = req.session.userId || null;

      const [users] = await db.execute(
        'SELECT id, first_name, last_name, email, phone, avatar, role, created_at FROM users WHERE id = ?',
        [organizerId]
      );

      if (users.length === 0) {
        return res.status(404).send('Организатор не найден');
      }

      const organizer = users[0];
      const [events] = await db.execute(
        `SELECT e.*, 
                (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id AND p.status = 'going') as participants_count
         FROM events e
         WHERE e.organizer_id = ? AND e.status = 'approved'
         ORDER BY e.date ASC`,
        [organizerId]
      );

      const [stats] = await db.execute(
        `SELECT 
            COUNT(*) as total_events,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_events
         FROM events
         WHERE organizer_id = ?`,
        [organizerId]
      );

      res.render('organizer/profile', {
        organizer,
        events,
        stats: stats[0] || { total_events: 0, approved_events: 0 },
        user: req.user || null,
        currentUserId: userId,
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Organizer profile error:', error);
      res.status(500).send('Ошибка загрузки профиля организатора: ' + error.message);
    }
  }

  static async getDashboard(req, res) {
    try {
      const { sort } = req.query;
      const events = await EventModel.findByOrganizerId(req.session.userId);
      // Показываем только предложения со статусами voting и approved для организатора
      const proposals = await ProposalModel.findAll({ status: 'all', sort: sort || 'new' });
      res.render('organizer/dashboard', { events, proposals, sort });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).send('Ошибка при получении дашборда: ' + error.message);
    }
  }

  static async getMyEvents(req, res) {
    try {
      const events = await EventModel.findByOrganizerId(req.session.userId);
      res.render('organizer/events', { events });
    } catch (error) {
      console.error('My events error:', error);
      res.status(500).send('Ошибка при получении мероприятий: ' + error.message);
    }
  }

  static async takeProposal(req, res) {
    try {
      const proposalId = req.params.id;
      const organizerId = req.session.userId;
      
      // Проверяем, что пользователь - организатор или админ
      const [user] = await db.execute('SELECT role FROM users WHERE id = ?', [organizerId]);
      if (!user.length || (user[0].role !== 'organizer' && user[0].role !== 'admin')) {
        req.flash('error', 'Доступ запрещен. Только организаторы могут брать предложения в работу.');
        return res.redirect('/organizer/dashboard');
      }
      
      // Получаем информацию о предложении до обновления
      const [proposal] = await db.execute('SELECT user_id, title FROM proposals WHERE id = ?', [proposalId]);
      if (proposal.length === 0) {
        req.flash('error', 'Предложение не найдено');
        return res.redirect('/organizer/dashboard');
      }
      
      // Проверяем текущий статус предложения
      if (proposal[0].status === 'in_progress') {
        req.flash('error', 'Это предложение уже взято в работу');
        return res.redirect('/organizer/dashboard');
      }
      
      if (proposal[0].status === 'completed') {
        req.flash('error', 'Это предложение уже реализовано');
        return res.redirect('/organizer/dashboard');
      }
      
      // Обновляем статус на 'in_progress'
      await db.execute("UPDATE proposals SET status = 'in_progress' WHERE id = ?", [proposalId]);
      
      // Уведомление автору предложения
      try {
        const NotificationModel = require('../models/NotificationModel');
        await NotificationModel.create({
          user_id: proposal[0].user_id,
          title: 'Вашу идею взяли в работу!',
          message: `Организатор взял ваше предложение «${proposal[0].title}» для реализации. Следите за афишей событий!`
        });
        console.log(`Уведомление отправлено пользователю ${proposal[0].user_id}`);
      } catch (e) { 
        console.error('Take proposal notification error:', e); 
      }
      
      req.flash('success', 'Предложение взято в работу!');
      res.redirect('/organizer/dashboard');
    } catch (error) {
      console.error('Take proposal error:', error);
      req.flash('error', 'Ошибка: ' + error.message);
      res.redirect('/organizer/dashboard');
    }
  }

  static async getEventParticipants(req, res) {
    try {
      const eventId = req.params.id;
      const organizerId = req.session.userId;
      
      // Проверяем, принадлежит ли мероприятие этому организатору
      const event = await EventModel.findById(eventId);
      if (!event || event.organizer_id !== organizerId) {
        return res.status(403).send('Доступ запрещен');
      }

      const participants = await EventModel.findParticipantsByEventId(eventId);
      
      res.render('organizer/participants', { event, participants });
    } catch (error) {
      console.error('Event participants error:', error);
      res.status(500).send('Ошибка при получении списка участников: ' + error.message);
    }
  }
}

module.exports = OrganizerController;