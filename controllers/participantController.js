const db = require('../config/database');
const ParticipantModel = require('../models/ParticipantModel');
const NotificationModel = require('../models/NotificationModel');

class ParticipantController {
  static async joinEvent(req, res) {
    try {
      const { eventId } = req.body;
      const userId = req.session.userId;
      
      console.log('=== JOIN EVENT DEBUG ===');
      console.log('eventId:', eventId);
      console.log('userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Нужна авторизация' });
      }
      
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'ID мероприятия не указан' });
      }
      
      // Проверяем, существует ли мероприятие
      const [eventData] = await db.execute('SELECT organizer_id, title, max_participants FROM events WHERE id = ?', [eventId]);
      
      if (eventData.length === 0) {
        return res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
      }
      
      // Проверяем, не записан ли уже пользователь
      const [existing] = await db.execute(
        'SELECT id FROM participants WHERE user_id = ? AND event_id = ?',
        [userId, eventId]
      );
      
      if (existing.length > 0) {
        return res.status(400).json({ success: false, message: 'Вы уже записаны на это мероприятие' });
      }
      
      // Проверяем количество участников
      const [countResult] = await db.execute('SELECT COUNT(*) as count FROM participants WHERE event_id = ?', [eventId]);
      const currentCount = countResult[0].count;
      
      if (currentCount >= eventData[0].max_participants) {
        return res.status(400).json({ success: false, message: 'Нет свободных мест' });
      }
      
      // Записываем пользователя
      await db.execute(
        "INSERT INTO participants (user_id, event_id, status) VALUES (?, ?, 'going')",
        [userId, eventId]
      );
      
      // Уведомление организатору
      if (eventData[0].organizer_id !== userId) {
        try {
          await NotificationModel.create({
            user_id: eventData[0].organizer_id,
            title: 'Новая запись на мероприятие',
            message: `Пользователь записался на ваше мероприятие "${eventData[0].title}"`
          });
          console.log('Уведомление отправлено организатору');
        } catch (notifyError) {
          console.error('Ошибка при отправке уведомления:', notifyError);
        }
      }
      
      res.json({ success: true, message: 'Вы успешно записаны на мероприятие' });
    } catch (error) {
      console.error('Join event error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  
  static async leaveEvent(req, res) {
    try {
      const eventId = req.params.id || req.body.eventId;
      const userId = req.session.userId;
      
      console.log('=== LEAVE EVENT DEBUG ===');
      console.log('eventId:', eventId);
      console.log('userId:', userId);
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Нужна авторизация' });
      }
      
      if (!eventId) {
        return res.status(400).json({ success: false, message: 'ID мероприятия не указан' });
      }
      
      // Получаем информацию о мероприятии
      const [eventData] = await db.execute('SELECT organizer_id, title FROM events WHERE id = ?', [eventId]);
      
      // Удаляем запись
      await db.execute(
        'DELETE FROM participants WHERE user_id = ? AND event_id = ?',
        [userId, eventId]
      );
      
      // Уведомление организатору
      if (eventData.length > 0 && eventData[0].organizer_id !== userId) {
        try {
          await NotificationModel.create({
            user_id: eventData[0].organizer_id,
            title: 'Пользователь отказался от участия',
            message: `Пользователь отказался от участия в мероприятии "${eventData[0].title}"`
          });
        } catch (notifyError) {
          console.error('Ошибка при отправке уведомления:', notifyError);
        }
      }
      
      res.json({ success: true, message: 'Вы отказались от участия' });
    } catch (error) {
      console.error('Leave event error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  
  static async getMyGoing(req, res) {
    try {
      const userId = req.session.userId;
      
      const [events] = await db.execute(
        `SELECT e.*, p.created_at as joined_at 
         FROM participants p 
         JOIN events e ON p.event_id = e.id 
         WHERE p.user_id = ? AND p.status = 'going'
         ORDER BY p.created_at DESC`,
        [userId]
      );
      
      res.json({ success: true, events });
    } catch (error) {
      console.error('Get my going error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = ParticipantController;