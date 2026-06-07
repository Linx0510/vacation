const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const promisePool = pool.promise();

// Проверка подключения при запуске
promisePool.getConnection()
  .then(connection => {
    console.log('БАЗА ДАННЫХ: Успешно подключено к MySQL (event_platform)');
    connection.release();
  })
  .catch(err => {
    console.error('БАЗА ДАННЫХ: ОШИБКА ПОДКЛЮЧЕНИЯ!');
    console.error('Убедитесь, что MySQL запущен в XAMPP/MAMP.');
    console.error('Ошибка:', err.message);
  });

module.exports = promisePool;
