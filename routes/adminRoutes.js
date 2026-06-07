const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');

// ВРЕМЕННО - ОТКЛЮЧАЕМ ПРОВЕРКУ ДЛЯ ТЕСТА
// Раскомментируйте потом обратно
/*
router.use((req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  
  if (req.session.userRole !== 'admin') {
    return res.status(403).send('Доступ запрещен: недостаточно прав');
  }
  
  next();
});
*/

// Временная проверка с отладкой
router.use((req, res, next) => {
  console.log('=== DEBUG ADMIN ACCESS ===');
  console.log('Session userId:', req.session.userId);
  console.log('Session userRole:', req.session.userRole);
  console.log('Full session:', req.session);
  
  if (!req.session.userId) {
    console.log('Нет userId, редирект на логин');
    return res.redirect('/auth/login');
  }
  
  // Временно пропускаем всех авторизованных пользователей
  // Уберите эту строку когда все заработает
  console.log('Временно разрешаем доступ всем авторизованным');
  return next();
  
  // Раскомментируйте когда наладится
  // if (req.session.userRole !== 'admin') {
  //   console.log(`Роль ${req.session.userRole} не является admin`);
  //   return res.status(403).send('Доступ запрещен: недостаточно прав');
  // }
  
  // next();
});

// Основные страницы
router.get('/dashboard', AdminController.getDashboard);
router.get('/moderation', AdminController.getModeration);
router.get('/moderation/data', AdminController.getModerationData);
router.get('/reports', AdminController.getReports);
router.get('/users', AdminController.getUsers);
router.get('/partners', AdminController.getPartners);
router.get('/faq', AdminController.getFaq);

// Действия
router.post('/users/update-role', AdminController.updateUserRole);
router.post('/users/delete', AdminController.deleteUser);
router.post('/moderation/update', AdminController.updateEventStatus);
router.post('/moderation/proposal/update', AdminController.updateProposalStatus);
router.post('/moderation/proposal/delete', AdminController.deleteProposal);
router.post('/moderation/event/delete', AdminController.deleteEvent);
router.post('/partners/update', AdminController.updatePartner);
router.post('/faq/reply', AdminController.replyToMessage);
router.post('/faq/delete-message', AdminController.deleteMessage);
router.post('/reports/update', AdminController.updateReportStatus);

module.exports = router;