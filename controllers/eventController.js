const db = require('../config/database');
const EventModel = require('../models/EventModel');
const CategoryModel = require('../models/CategoryModel');
const ReviewModel = require('../models/ReviewModel');

class EventController {
  static async getCatalog(req, res) {
    try {
      const userId = req.session.userId;
      const filters = {
        category: req.query.category,
        date_from: req.query.date_from,
        date_to: req.query.date_to,
        search: req.query.search,
        location: req.query.location,
        status: 'approved'
      };
      const events = await EventModel.findAll(filters);
      const categories = await CategoryModel.findAll();

      if (userId) {
        const FavoriteModel = require('../models/FavoriteModel');
        const ParticipantModel = require('../models/ParticipantModel');
        
        const [userFavorites, userGoing] = await Promise.all([
          FavoriteModel.findByUser(userId),
          ParticipantModel.findByUser(userId)
        ]);
        
        const favoriteIds = new Set(userFavorites.map(f => f.id));
        const goingIds = new Set(userGoing.map(g => g.id));
        
        events.forEach(event => {
          event.isFavorite = favoriteIds.has(event.id);
          event.isGoing = goingIds.has(event.id);
        });
      }

      const isAjax = req.xhr || req.query.ajax === '1' || req.headers['x-requested-with'] === 'XMLHttpRequest';
      
      if (isAjax) {
        return res.render('events/catalog', { 
          events, 
          categories, 
          filters,
          layout: false
        });
      }
      
      res.render('events/catalog', { events, categories, filters });
    } catch (error) {
      console.error('Ошибка при получении каталога:', error);
      res.status(500).send('Ошибка при получении каталога: ' + error.message);
    }
  }

  static async getSingleEvent(req, res) {
    try {
      const eventId = req.params.id;
      const userId = req.session.userId;
      const event = await EventModel.findById(eventId);
      if (!event) return res.status(404).send('Мероприятие не найдено');
      
      const reviews = await ReviewModel.findByEventId(eventId, userId);
      
      let isGoing = false;
      let isFavorite = false;
      if (userId) {
        const ParticipantModel = require('../models/ParticipantModel');
        const FavoriteModel = require('../models/FavoriteModel');
        isGoing = await ParticipantModel.isParticipating(userId, eventId);
        isFavorite = await FavoriteModel.isFavorite(userId, eventId);
      }

      res.render('events/single', { event, reviews, isGoing, isFavorite });
    } catch (error) {
      console.error('Ошибка при получении мероприятия:', error);
      res.status(500).send('Ошибка при получении мероприятия: ' + error.message);
    }
  }

  static async createEvent(req, res) {
    try {
      console.log('=== CREATE EVENT DEBUG ===');
      console.log('req.body:', req.body);
      console.log('req.files:', req.files);
      console.log('req.session.userId:', req.session.userId);
      
      const { title, description, category_id, date, location, max_participants } = req.body;
      
      // Валидация
      if (!title) {
        req.flash('error', 'Название мероприятия обязательно для заполнения');
        return res.redirect('/organizer/events/create');
      }
      
      if (!description) {
        req.flash('error', 'Описание мероприятия обязательно для заполнения');
        return res.redirect('/organizer/events/create');
      }
      
      if (!date) {
        req.flash('error', 'Дата мероприятия обязательна для заполнения');
        return res.redirect('/organizer/events/create');
      }
      
      if (!location) {
        req.flash('error', 'Место проведения обязательно для заполнения');
        return res.redirect('/organizer/events/create');
      }
      
      const organizer_id = req.session.userId;
      let media_url = null;
      if (req.files && req.files.media && req.files.media[0]) {
        media_url = `/images/uploads/event_pics/${req.files.media[0].filename}`;
        console.log('Media uploaded:', media_url);
      } else if (req.file) {
        media_url = `/images/uploads/event_pics/${req.file.filename}`;
      }
      
      if (!organizer_id) {
        req.flash('error', 'Необходимо войти в систему');
        return res.redirect('/auth/login');
      }
      
      // Создаем мероприятие
      const eventId = await EventModel.create({ 
        organizer_id, 
        title, 
        description, 
        category_id, 
        date, 
        location, 
        max_participants: max_participants || 50, 
        media_url 
      });
      
      console.log('Event created with ID:', eventId);

      // Уведомление администраторам
      try {
        const [admins] = await db.execute("SELECT id FROM users WHERE role = 'admin'");
        const NotificationModel = require('../models/NotificationModel');
        for (const admin of admins) {
          await NotificationModel.create({
            user_id: admin.id,
            title: 'Новое мероприятие на модерацию',
            message: `Организатор создал мероприятие «${title}». Требуется проверка.`
          });
        }
      } catch (e) { 
        console.error('Admin notification error:', e); 
      }
      
      req.flash('success', 'Мероприятие успешно создано и отправлено на модерацию!');
      res.redirect('/organizer/events');
    } catch (error) {
      console.error('Create Event Error:', error);
      req.flash('error', 'Ошибка при создании мероприятия: ' + error.message);
      res.redirect('/organizer/events/create');
    }
  }

  static async updateEvent(req, res) {
    try {
      const eventId = req.params.id;
      const { title, description, category_id, date, location, max_participants } = req.body;
      const organizer_id = req.session.userId;
      
      // Проверяем, принадлежит ли мероприятие организатору
      const event = await EventModel.findById(eventId);
      if (!event || event.organizer_id !== organizer_id) {
        req.flash('error', 'У вас нет прав на редактирование этого мероприятия');
        return res.redirect('/organizer/events');
      }
      
      let media_url = event.media_url;
      if (req.file) {
        media_url = `/images/uploads/event_pics/${req.file.filename}`;
      }
      
      await EventModel.update(eventId, {
        title,
        description,
        category_id,
        date,
        location,
        max_participants,
        media_url,
        status: 'pending'
      });
      
      req.flash('success', 'Мероприятие обновлено и отправлено на модерацию');
      res.redirect('/organizer/events');
    } catch (error) {
      console.error('Update event error:', error);
      req.flash('error', 'Ошибка при обновлении мероприятия: ' + error.message);
      res.redirect('/organizer/events');
    }
  }

  static async deleteEvent(req, res) {
    try {
      const eventId = req.params.id;
      const organizer_id = req.session.userId;
      
      const event = await EventModel.findById(eventId);
      if (!event || event.organizer_id !== organizer_id) {
        req.flash('error', 'У вас нет прав на удаление этого мероприятия');
        return res.redirect('/organizer/events');
      }
      
      await EventModel.delete(eventId);
      
      req.flash('success', 'Мероприятие удалено');
      res.redirect('/organizer/events');
    } catch (error) {
      console.error('Delete event error:', error);
      req.flash('error', 'Ошибка при удалении мероприятия: ' + error.message);
      res.redirect('/organizer/events');
    }
  }
}

module.exports = EventController;