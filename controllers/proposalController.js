const UserModel = require('../models/UserModel');
const FavoriteModel = require('../models/FavoriteModel');
const ReviewModel = require('../models/ReviewModel');
const ParticipantModel = require('../models/ParticipantModel');
const ProposalModel = require('../models/ProposalModel');
const NotificationModel = require('../models/NotificationModel');
const db = require('../config/database');

class ProposalController {
  static async getProposals(req, res) {
    try {
      const filters = {
        status: req.query.status || 'all',
        sort: req.query.sort || 'new'
      };
      const userId = req.user ? req.user.id : (req.session.userId || null);
      console.log('ProposalController.getProposals: final userId for query is', userId);
      const proposals = await ProposalModel.findAll(filters, userId);
      const stats = await ProposalModel.getTotalStats();
      
      if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.render('pages/proposals', { 
          proposals, 
          filters,
          user: req.user || null,
          stats,
          layout: false
        });
      }
      
      res.render('pages/proposals', { 
        proposals, 
        filters,
        user: req.user || null,
        stats
      });
    } catch (error) {
      console.error('ProposalController.getProposals error:', error);
      res.status(500).send('Ошибка при получении предложений: ' + error.message);
    }
  }

  static async createProposal(req, res) {
    try {
      console.log('=== PROPOSAL CREATE DEBUG ===');
      console.log('req.body:', req.body);
      console.log('req.session.userId:', req.session.userId);
      
      // Защита от undefined - извлекаем поля с проверкой
      const { title, category, description } = req.body || {};
      
      // Проверка обязательных полей
      if (!title) {
        return res.status(400).json({ 
          success: false, 
          message: 'Название идеи обязательно для заполнения' 
        });
      }
      
      const user_id = req.session.userId;
      
      if (!user_id) {
        return res.status(401).json({ 
          success: false, 
          message: 'Пожалуйста, войдите в систему' 
        });
      }

      // Создаём предложение с дефолтными значениями для пустых полей
      await ProposalModel.create({ 
        user_id, 
        title: title.trim(), 
        category: category || 'Другое', 
        description: description || '' 
      });
      
      // Уведомление администраторам о новом предложении
      try {
        const [admins] = await db.execute('SELECT id FROM users WHERE role = "admin"');
        const NotificationModel = require('../models/NotificationModel');
        for (const admin of admins) {
          await NotificationModel.create({
            user_id: admin.id,
            title: 'Новая запись на мероприятие',
            message: `Пользователь предложил идею: "${title.substring(0, 50)}${title.length > 50 ? '...' : ''}"`
          });
        }
      } catch (e) {
        console.error('Admin notification error:', e);
      }
      
      res.json({ 
        success: true, 
        message: 'Ваше предложение успешно создано и отправлено на модерацию!' 
      });
    } catch (error) {
      console.error('Create proposal error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Ошибка при создании предложения: ' + error.message 
      });
    }
  }

  static async vote(req, res) {
    try {
      const proposalId = req.params.id;
      const userId = req.user ? req.user.id : req.session.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Нужна авторизация' });
      }

      const result = await ProposalModel.vote(proposalId, userId);
      const stats = await ProposalModel.getTotalStats();
      
      return res.json({ 
        success: true, 
        action: result.action, 
        votes_count: result.votes_count,
        stats 
      });
    } catch (error) {
      console.error('Vote error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getMyProposals(req, res) {
    res.redirect('/user/profile?tab=proposals');
  }

  static async delete(req, res) {
    try {
      const proposalId = req.params.id || req.body.proposalId;
      const userId = req.session.userId;
      
      if (!proposalId) {
        return res.status(400).json({ success: false, message: 'ID предложения не указан' });
      }
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Нужна авторизация' });
      }
      
      await ProposalModel.delete(proposalId, userId);
      const stats = await ProposalModel.getTotalStats();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Delete proposal error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ProposalController;