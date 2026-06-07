-- =============================================
-- СОЗДАНИЕ БАЗЫ ДАННЫХ
-- =============================================
CREATE DATABASE IF NOT EXISTS event_platform;
USE event_platform;

-- =============================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- =============================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'organizer', 'admin') DEFAULT 'user',
    avatar VARCHAR(255),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ТАБЛИЦА КАТЕГОРИЙ
-- =============================================
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- =============================================
-- ТАБЛИЦА МЕРОПРИЯТИЙ
-- =============================================
DROP TABLE IF EXISTS events;
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    status ENUM('pending', 'approved', 'rejected', 'requires_changes') DEFAULT 'pending',
    moderation_comment TEXT,
    date DATETIME NOT NULL,
    location VARCHAR(255),
    media_url VARCHAR(255),
    max_participants INT DEFAULT 50,
    participants_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =============================================
-- ТАБЛИЦА ИЗБРАННОГО
-- =============================================
DROP TABLE IF EXISTS favorites;
CREATE TABLE favorites (
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ПРЕДЛОЖЕНИЙ (ГОЛОСОВАНИЕ)
-- =============================================
DROP TABLE IF EXISTS proposals;
CREATE TABLE proposals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    status ENUM('moderation', 'voting', 'approved', 'in_progress', 'completed', 'rejected') DEFAULT 'moderation',
    moderation_comment TEXT,
    votes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ГОЛОСОВ ЗА ПРЕДЛОЖЕНИЯ
-- =============================================
DROP TABLE IF EXISTS proposal_votes;
CREATE TABLE proposal_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (proposal_id, user_id),
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ОТЗЫВОВ (ИСПРАВЛЕННАЯ)
-- =============================================
DROP TABLE IF EXISTS reviews;
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT,
    rating INT DEFAULT 5,
    comment TEXT,
    photos JSON,
    videos JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- =============================================
-- ТАБЛИЦА ЛАЙКОВ НА ОТЗЫВЫ
-- =============================================
DROP TABLE IF EXISTS review_likes;
CREATE TABLE review_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (user_id, review_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ЖАЛОБ НА ОТЗЫВЫ
-- =============================================
DROP TABLE IF EXISTS review_reports;
CREATE TABLE review_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('pending', 'reviewed', 'rejected') DEFAULT 'pending',
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_report (review_id, user_id)
);

-- =============================================
-- ТАБЛИЦА УЧАСТНИКОВ МЕРОПРИЯТИЙ
-- =============================================
DROP TABLE IF EXISTS participants;
CREATE TABLE participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    status ENUM('going', 'cancelled') DEFAULT 'going',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_participant (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА УВЕДОМЛЕНИЙ
-- =============================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ПОСТОВ В ЛЕНТЕ
-- =============================================
DROP TABLE IF EXISTS feed_posts;
CREATE TABLE feed_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    media_url VARCHAR(255),
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ОРГАНИЗАТОРОВ
-- =============================================
DROP TABLE IF EXISTS organizers;
CREATE TABLE organizers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ТАБЛИЦА ПАРТНЕРОВ
-- =============================================
DROP TABLE IF EXISTS partners;
CREATE TABLE partners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    company_name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    contact_info TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- ТАБЛИЦА FAQ
-- =============================================
DROP TABLE IF EXISTS faq;
CREATE TABLE faq (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    for_role ENUM('user', 'organizer', 'all') DEFAULT 'all'
);

-- =============================================
-- ТАБЛИЦА СООБЩЕНИЙ ОБРАТНОЙ СВЯЗИ
-- =============================================
DROP TABLE IF EXISTS contact_messages;
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    message TEXT NOT NULL,
    source VARCHAR(255) DEFAULT NULL,
    status ENUM('pending', 'replied', 'closed') DEFAULT 'pending',
    reply TEXT,
    admin_reply TEXT,
    replied_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ТАБЛИЦА СОГЛАСИЯ НА COOKIE
-- =============================================
DROP TABLE IF EXISTS cookies_consent;
CREATE TABLE cookies_consent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_or_id VARCHAR(255),
    consent BOOLEAN DEFAULT TRUE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ВСТАВКА НАЧАЛЬНЫХ КАТЕГОРИЙ
-- =============================================
INSERT IGNORE INTO categories (id, name) VALUES (1, 'Сезонные');
INSERT IGNORE INTO categories (id, name) VALUES (2, 'Тематические');
INSERT IGNORE INTO categories (id, name) VALUES (3, 'Мастер-классы');
INSERT IGNORE INTO categories (id, name) VALUES (4, 'Выездные');

-- =============================================
-- ВСТАВКА ТЕСТОВОГО АДМИНА
-- =============================================
INSERT IGNORE INTO users (email, first_name, last_name, password_hash, role) 
VALUES ('admin@mail.ru', 'Admin', 'Adminov', '$2b$10$YourHashHere', 'admin');

-- =============================================
-- ВСТАВКА НАЧАЛЬНЫХ FAQ
-- =============================================
INSERT IGNORE INTO faq (id, question, answer, for_role) VALUES 
(1, 'Когда и где пройдут мероприятия?', 'Площадки разные: от лофтов в центре до загородных баз отдыха. Точный адрес всегда указан на странице каждого события.', 'all'),
(2, 'Есть ли дресс-код?', 'Если мероприятие предполагает особый стиль или тематику, мы обязательно указываем это в описании события. В остальных случаях — приходите в том, в чем вам комфортно. Главное — ваше настроение.', 'all'),
(3, 'Как добраться до площадки?', 'После регистрации на событие мы присылаем подробную схему проезда, точный адрес и контакты организатора, чтобы вы не заблудились. Если площадка сложная — добавляем ориентиры и фото входа.', 'all');

-- =============================================
-- ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ
-- =============================================
SHOW TABLES;
DESCRIBE reviews;
DESCRIBE review_likes;