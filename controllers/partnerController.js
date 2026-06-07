const db = require('../config/database');
const PartnerModel = require('../models/PartnerModel');

class PartnerController {
  // Для организатора: страница подачи заявки
  static async getApplyPage(req, res) {
    try {
      const partner = null; 
      res.render('organizer/partner-apply', { partner });
    } catch (error) {
      console.error('General error in getApplyPage:', error.message);
      res.render('organizer/partner-apply', { partner: null, error: error.message });
    }
  }

  // Для организатора: обработка заявки
  static async submitApply(req, res) {
    try {
      const { company_name, inn, contact_info } = req.body;
      const user_id = req.session.userId;
      
      await PartnerModel.create({ user_id, company_name, inn, contact_info });
      req.flash('success', 'Заявка на партнерство отправлена и находится на рассмотрении.');
      res.redirect('/organizer/partner/apply');
    } catch (error) {
      res.status(500).send('Ошибка при подаче заявки: ' + error.message);
    }
  }

  // ОБНОВЛЕННЫЙ МЕТОД ДЛЯ ОБРАБОТКИ ЗАЯВКИ СО СТРАНИЦЫ /partners
  static async applyPartner(req, res) {
    try {
      console.log('=== applyPartner called ===');
      console.log('Request body:', req.body);
      
      const { company_name, venue_type, contact_name, phone, city } = req.body;
      const user_id = req.session.userId || null;
      
      // Проверяем обязательные поля
      if (!company_name || !contact_name || !phone || !city) {
        return res.status(400).json({ 
          success: false, 
          error: 'Пожалуйста, заполните все обязательные поля' 
        });
      }
      
      // Сохраняем как JSON для удобного парсинга
      const contact_info = JSON.stringify({
        company_name: company_name,
        venue_type: venue_type || 'не указан',
        contact_name: contact_name,
        phone: phone,
        city: city
      });
      
      // Сохраняем в таблицу partners
      const [result] = await db.execute(
        `INSERT INTO partners (user_id, company_name, contact_info, status, created_at) 
         VALUES (?, ?, ?, 'pending', NOW())`,
        [user_id, company_name, contact_info]
      );
      
      console.log('Insert result:', result);
      
      res.json({ success: true, message: 'Заявка успешно отправлена!' });
    } catch (error) {
      console.error('Apply partner error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Ошибка при отправке заявки: ' + error.message 
      });
    }
  }

  // Для админа: список заявок
  static async getAdminPartners(req, res) {
    try {
      const partners = await PartnerModel.findAll();
      res.render('admin/partners', { partners });
    } catch (error) {
      console.error('Get admin partners error:', error);
      res.status(500).send('Ошибка: ' + error.message);
    }
  }

  // Для админа: обновление статуса
  static async updatePartnerStatus(req, res) {
    try {
      const { id, status, commission_rate } = req.body;
      await PartnerModel.updateStatus(id, status, commission_rate);
      req.flash('success', 'Статус партнера обновлен');
      res.redirect('/admin/partners');
    } catch (error) {
      console.error('Update partner status error:', error);
      res.status(500).send('Ошибка: ' + error.message);
    }
  }
}

module.exports = PartnerController;