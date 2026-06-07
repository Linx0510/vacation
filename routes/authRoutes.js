const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.get('/login', (req, res) => res.render('pages/login')); // Предполагаем наличие страницы login.ejs
router.post('/login', AuthController.login);

router.get('/register', (req, res) => res.render('pages/register')); // Предполагаем наличие страницы register.ejs
router.post('/register', AuthController.register);

router.get('/logout', AuthController.logout);

router.get('/forgot-password', (req, res) => res.render('pages/forgot-password'));
router.post('/forgot-password', AuthController.forgotPassword);

module.exports = router;
