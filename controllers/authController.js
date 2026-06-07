const UserModel = require('../models/UserModel');
const OrganizerModel = require('../models/OrganizerModel');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Настройка почтового транспорта (используем Gmail как пример)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

class AuthController {
  static async register(req, res) {
    console.log('--- ПОПЫТКА РЕГИСТРАЦИИ ---');
    console.log('Данные:', req.body);
    try {
      const { first_name, last_name, email, password, role, phone, birth_date } = req.body;
      
      // Проверка на существование пользователя
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        console.log('Ошибка: Email уже занят');
        req.flash('error', 'Пользователь с таким email уже существует');
        return res.redirect('/auth/register');
      }

      console.log('Хеширование пароля...');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      console.log('Создание пользователя в БД...');
      const userId = await UserModel.create({ 
        first_name, 
        last_name, 
        email, 
        password: hashedPassword, 
        role: role || 'user',
        phone: phone || null,
        birth_date: birth_date || null
      });

      console.log('Пользователь создан, ID:', userId);

      if (role === 'organizer') {
        console.log('Создание профиля организатора...');
        const { company_name, description } = req.body;
        await OrganizerModel.create({ 
          user_id: userId, 
          company_name: company_name || `Компания ${first_name}`, 
          description: description || '' 
        });
        console.log('Профиль организатора создан');
      }

      req.flash('success', 'Регистрация успешна! Теперь вы можете войти.');
      res.redirect('/auth/login');
    } catch (error) {
      console.error('КРИТИЧЕСКАЯ ОШИБКА ПРИ РЕГИСТРАЦИИ:', error);
      res.status(500).send(`<h1>Ошибка регистрации</h1><p>${error.message}</p><pre>${error.stack}</pre>`);
    }
  }

  static async login(req, res) {
    console.log('--- ПОПЫТКА ВХОДА ---');
    console.log('Email:', req.body.email);
    try {
      const { email, password } = req.body;
      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        console.log('Ошибка: Пользователь не найден');
        req.flash('error', 'Неверный email или пароль');
        return res.redirect('/auth/login');
      }

      console.log('Проверка пароля...');
      const isMatch = await bcrypt.compare(password, user.password_hash || user.password);
      if (!isMatch) {
        console.log('Ошибка: Пароль не совпадает');
        req.flash('error', 'Неверный email или пароль');
        return res.redirect('/auth/login');
      }
      
      console.log('Вход выполнен! ID:', user.id);
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.userRole = user.role;
      req.session.email = user.email;
      
      res.redirect('/');
    } catch (error) {
      console.error('КРИТИЧЕСКАЯ ОШИБКА ПРИ ВХОДЕ:', error);
      req.flash('error', 'Ошибка при входе: ' + error.message);
      res.redirect('/auth/login');
    }
  }

  static logout(req, res) {
    req.session.destroy();
    res.redirect('/');
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await UserModel.findByEmail(email);
      
      if (!user) {
        req.flash('error', 'Пользователь с таким Email не найден');
        return res.redirect('/auth/forgot-password');
      }

      // В реальном приложении здесь должен генерироваться токен сброса
      // Для примера просто отправляем уведомление
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Восстановление пароля - Вакация',
        html: `
          <div style="font-family: 'Manrope', sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #635bff;">Восстановление пароля</h2>
            <p>Здравствуйте, ${user.first_name}!</p>
            <p>Мы получили запрос на восстановление пароля для вашего аккаунта в системе <b>Вакация</b>.</p>
            <p>Если вы не делали этого запроса, просто проигнорируйте это письмо.</p>
            <div style="margin: 30px 0;">
              <a href="${req.protocol}://${req.get('host')}/auth/reset-password?email=${email}" 
                 style="background: #635bff; color: #fff; padding: 12px 25px; border-radius: 10px; text-decoration: none; font-weight: 700;">
                Сбросить пароль
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">Это автоматическое сообщение, на него не нужно отвечать.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      req.flash('success', 'Инструкции по сбросу пароля отправлены на ваш Email');
      res.redirect('/auth/forgot-password');
    } catch (error) {
      console.error('Ошибка отправки почты:', error);
      req.flash('error', 'Не удалось отправить письмо. Проверьте настройки почтового сервера.');
      res.redirect('/auth/forgot-password');
    }
  }
}

module.exports = AuthController;
