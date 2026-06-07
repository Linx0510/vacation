const db = require('../config/database');

class CategoryModel {
  static async findAll() {
    const [rows] = await db.execute('SELECT * FROM categories');
    return rows;
  }

  static async create(name) {
    const [result] = await db.execute('INSERT INTO categories (name) VALUES (?)', [name]);
    return result.insertId;
  }
}

module.exports = CategoryModel;
