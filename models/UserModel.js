const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  static async create({ email, phone, password, role = 'user', birth_date, first_name, last_name }) {
    // Если пароль уже захеширован (приходит из контроллера), используем его, иначе хешируем
    const passwordHash = password.startsWith('$2') ? password : await bcrypt.hash(password, 10);
    
    const [result] = await db.execute(
      'INSERT INTO users (email, phone, password_hash, role, birth_date, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        email || null, 
        phone || null, 
        passwordHash || null, 
        role || 'user', 
        birth_date || null, 
        first_name || null, 
        last_name || null
      ]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
  }

  static async updateProfile(id, { phone, avatar, birth_date, first_name, last_name }) {
    console.log('DB Update - ID:', id, 'Avatar:', avatar);
    const [result] = await db.execute(
      'UPDATE users SET phone = ?, avatar = ?, birth_date = ?, first_name = ?, last_name = ? WHERE id = ?',
      [phone, avatar, birth_date, first_name, last_name, id]
    );
    return result.affectedRows;
  }
}

module.exports = UserModel;
