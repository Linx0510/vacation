-- =============================================
-- PostgreSQL schema for the event platform
-- =============================================
-- Create the database outside an active connection when needed:
--   CREATE DATABASE event_platform;
-- Then connect to it before running this file:
--   \c event_platform

-- =============================================
-- DROP TABLES
-- =============================================
DROP TABLE IF EXISTS cookies_consent CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS faq CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS organizers CASCADE;
DROP TABLE IF EXISTS feed_posts CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS review_reports CASCADE;
DROP TABLE IF EXISTS review_likes CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS proposal_votes CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
    avatar VARCHAR(255),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CATEGORIES
-- =============================================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

-- =============================================
-- EVENTS
-- =============================================
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    organizer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INT,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requires_changes')),
    moderation_comment TEXT,
    date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    media_url VARCHAR(255),
    max_participants INT DEFAULT 50,
    participants_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =============================================
-- FAVORITES
-- =============================================
CREATE TABLE favorites (
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =============================================
-- PROPOSALS
-- =============================================
CREATE TABLE proposals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    status VARCHAR(32) DEFAULT 'moderation' CHECK (status IN ('moderation', 'voting', 'approved', 'in_progress', 'completed', 'rejected')),
    moderation_comment TEXT,
    votes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- PROPOSAL VOTES
-- =============================================
CREATE TABLE proposal_votes (
    id SERIAL PRIMARY KEY,
    proposal_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_vote UNIQUE (proposal_id, user_id),
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT,
    rating INT DEFAULT 5,
    comment TEXT,
    photos JSONB,
    videos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- =============================================
-- REVIEW LIKES
-- =============================================
CREATE TABLE review_likes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    review_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_like UNIQUE (user_id, review_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
);

-- =============================================
-- REVIEW REPORTS
-- =============================================
CREATE TABLE review_reports (
    id SERIAL PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected')),
    admin_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_report UNIQUE (review_id, user_id)
);

-- =============================================
-- PARTICIPANTS
-- =============================================
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    status VARCHAR(32) DEFAULT 'going' CHECK (status IN ('going', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_participant UNIQUE (user_id, event_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- =============================================
-- NOTIFICATIONS
-- =============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- FEED POSTS
-- =============================================
CREATE TABLE feed_posts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    media_url VARCHAR(255),
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- ORGANIZERS
-- =============================================
CREATE TABLE organizers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- PARTNERS
-- =============================================
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    user_id INT DEFAULT NULL,
    company_name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    contact_info TEXT,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- FAQ
-- =============================================
CREATE TABLE faq (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    for_role VARCHAR(20) DEFAULT 'all' CHECK (for_role IN ('user', 'organizer', 'all'))
);

-- =============================================
-- CONTACT MESSAGES
-- =============================================
CREATE TABLE contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    message TEXT NOT NULL,
    source VARCHAR(255) DEFAULT NULL,
    status VARCHAR(32) DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
    reply TEXT,
    admin_reply TEXT,
    replied_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- COOKIE CONSENT
-- =============================================
CREATE TABLE cookies_consent (
    id SERIAL PRIMARY KEY,
    ip_or_id VARCHAR(255),
    consent BOOLEAN DEFAULT TRUE,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INITIAL DATA
-- =============================================
INSERT INTO categories (id, name) VALUES
(1, 'Сезонные'),
(2, 'Тематические'),
(3, 'Мастер-классы'),
(4, 'Выездные')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (email, first_name, last_name, password_hash, role)
VALUES ('admin@mail.ru', 'Admin', 'Adminov', '$2b$10$YourHashHere', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO faq (id, question, answer, for_role) VALUES
(1, 'Когда и где пройдут мероприятия?', 'Площадки разные: от лофтов в центре до загородных баз отдыха. Точный адрес всегда указан на странице каждого события.', 'all'),
(2, 'Есть ли дресс-код?', 'Если мероприятие предполагает особый стиль или тематику, мы обязательно указываем это в описании события. В остальных случаях — приходите в том, в чем вам комфортно. Главное — ваше настроение.', 'all'),
(3, 'Как добраться до площадки?', 'После регистрации на событие мы присылаем подробную схему проезда, точный адрес и контакты организатора, чтобы вы не заблудились. Если площадка сложная — добавляем ориентиры и фото входа.', 'all')
ON CONFLICT (id) DO NOTHING;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = current_schema()
ORDER BY table_name;
