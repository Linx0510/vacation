const PartnerModel = require('../models/PartnerModel');
const FaqModel = require('../models/FaqModel');

class PageController {
  static async getIndex(req, res) {
    try {
      const userId = req.session.userId;
      const EventModel = require('../models/EventModel');
      const events = await EventModel.findAll({ status: 'approved' });
      
      // Ограничим до 6 для главной
      const featuredEvents = events.slice(0, 6);

      if (userId) {
        const FavoriteModel = require('../models/FavoriteModel');
        const userFavorites = await FavoriteModel.findByUser(userId);
        const favoriteIds = new Set(userFavorites.map(f => f.id));
        featuredEvents.forEach(event => {
          event.isFavorite = favoriteIds.has(event.id);
        });
      }

      res.render('pages/index', { events: featuredEvents });
    } catch (error) {
      res.status(500).send('Ошибка: ' + error.message);
    }
  }

  static getAbout(req, res) {
    res.render('pages/about');
  }

  static getContacts(req, res) {
    res.render('pages/contacts');
  }

  static async getHelp(req, res) {
    try {
      const faqs = await FaqModel.findAll();
      res.render('pages/help', { faqs });
    } catch (error) {
      res.status(500).send('Ошибка при получении FAQ: ' + error.message);
    }
  }

  static getPrivacy(req, res) {
    res.render('pages/privacy');
  }

  static getPersonalData(req, res) {
    res.render('pages/personalData');
  }

  static getTerms(req, res) {
    res.render('legal/terms-of-use');
  }

  static getMarketingConsent(req, res) {
    res.render('legal/marketing-consent', { ip: req.ip });
  }

  static getOffer(req, res) {
    res.render('pages/offer');
  }

  static async getPartners(req, res) {
    try {
      const partners = await PartnerModel.findAll();
      res.render('pages/partners', { partners });
    } catch (error) {
      res.status(500).send('Ошибка при получении партнеров: ' + error.message);
    }
  }

  static getBecomeOrganizer(req, res) {
    res.render('pages/become-organizer', {
      path: '/become-organizer',
      user: res.locals.user || null,
      success: req.flash('success') || [],
      error: req.flash('error') || []
    });
  }

  static async sendContactForm(req, res) {
    try {
      console.log('--- CONTACT FORM SUBMISSION ---');
      console.log('Body:', req.body);
      console.log('Headers:', req.headers);
      const { name, phone, email, message, venue_name, venue_type, city, source } = req.body;
      const ContactMessageModel = require('../models/ContactMessageModel');
      
      // Если это заявка от партнера (есть venue_name)
      if (venue_name) {
        const PartnerModel = require('../models/PartnerModel');
        const user_id = req.session.userId || null;
        await PartnerModel.create({ 
          user_id, 
          company_name: venue_name, 
          inn: venue_type, 
          contact_info: `Имя: ${name}, Тел: ${phone}, Город: ${city}`
        });
        
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
          return res.json({ success: true, message: 'Ваша заявка на партнерство отправлена!' });
        }
        req.flash('success', 'Ваша заявка на партнерство отправлена на модерацию! Мы свяжемся с вами.');
        return res.redirect('/partners');
      }

      // Сохраняем сообщение в базу для админки
      console.log('Attempting to save message to DB:', { name, phone, email, message, source });
      try {
        const insertId = await ContactMessageModel.create({
          name: name || 'Аноним',
          phone: phone || 'Не указан',
          email: email || null,
          message: message || 'Без сообщения (заказ звонка)',
          source: source || req.headers.referer || 'Главная страница'
        });
        console.log('Message saved successfully with ID:', insertId);
      } catch (dbError) {
        console.error('DATABASE ERROR while saving contact message:', dbError);
        throw dbError; // Пробрасываем дальше в общий catch
      }

      console.log(`Новое сообщение от ${name} (${phone}) сохранено в БД`);
      
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.json({ success: true, message: 'Ваше сообщение успешно отправлено!' });
      }

      req.flash('success', 'Ваше сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.');
      res.redirect('/');
    } catch (error) {
      console.error('sendContactForm error:', error);
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
        return res.status(500).json({ 
          success: false, 
          message: 'Ошибка на сервере: ' + error.message
        });
      }
      req.flash('error', 'Ошибка при отправке: ' + error.message);
      res.redirect('back');
    }
  }
}

module.exports = PageController;
