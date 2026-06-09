-- Connect to event_platform before running this seed file.

TRUNCATE TABLE
    cookies_consent,
    contact_messages,
    faq,
    partners,
    organizers,
    feed_posts,
    notifications,
    participants,
    review_reports,
    review_likes,
    reviews,
    proposal_votes,
    proposals,
    favorites,
    events,
    categories,
    users
RESTART IDENTITY CASCADE;

INSERT INTO users (id, email, phone, first_name, last_name, password_hash, role, avatar, birth_date, created_at) VALUES
(1, 'admin@mail.ru', '+79990000001', 'Admin', 'Adminov', '$2b$10$YourHashHere', 'admin', '/images/static/default-avatar.png', '1990-01-01', NOW()),
(2, 'org@mail.ru', '+79990000002', 'Ирина', 'Организаторова', '$2b$10$YourHashHere', 'organizer', '/images/static/default-avatar.png', '1992-05-12', NOW()),
(3, 'user@mail.ru', '+79990000003', 'Антон', 'Петров', '$2b$10$YourHashHere', 'user', '/images/static/default-avatar.png', '1995-09-20', NOW()),
(4, 'user2@mail.ru', '+79990000004', 'Мария', 'Иванова', '$2b$10$YourHashHere', 'user', '/images/static/default-avatar.png', '1998-11-03', NOW());

INSERT INTO categories (id, name) VALUES
(1, 'Сезонные'),
(2, 'Тематические'),
(3, 'Мастер-классы'),
(4, 'Выездные');

INSERT INTO events (id, organizer_id, title, description, category_id, status, moderation_comment, date, location, media_url, max_participants, participants_count, created_at) VALUES
(1, 2, 'Осенний гастро-фестиваль', 'Большой городской фестиваль еды и музыки.', 2, 'approved', NULL, NOW() + INTERVAL '10 days', 'Москва, Парк Горького', '/images/static/sample-event-1.jpg', 120, 2, NOW()),
(2, 2, 'Мастер-класс по керамике', 'Создаем кружки и тарелки своими руками.', 3, 'pending', NULL, NOW() + INTERVAL '14 days', 'Москва, Арт-лофт', '/images/static/sample-event-2.jpg', 20, 0, NOW()),
(3, 2, 'Выездной пикник у озера', 'День отдыха на природе с музыкой и активностями.', 4, 'requires_changes', 'Добавьте подробности по трансферу и программе.', NOW() + INTERVAL '21 days', 'Подмосковье', '/images/static/sample-event-3.jpg', 50, 0, NOW());

INSERT INTO favorites (user_id, event_id, created_at) VALUES
(3, 1, NOW()),
(4, 1, NOW());

INSERT INTO proposals (id, user_id, title, category, description, status, votes_count, created_at, updated_at) VALUES
(1, 3, 'Ночной кино-пикник', 'Тематические', 'Показ фильмов под открытым небом.', 'voting', 7, NOW(), NOW()),
(2, 4, 'Квест по историческому центру', 'Выездные', 'Городской квест с командами и призами.', 'moderation', 2, NOW(), NOW()),
(3, 3, 'Фестиваль локальной кухни', 'Сезонные', 'Событие с фудкортом и мастер-классами.', 'rejected', 0, NOW(), NOW());

INSERT INTO proposal_votes (proposal_id, user_id, created_at) VALUES
(1, 2, NOW()),
(1, 3, NOW()),
(1, 4, NOW()),
(2, 2, NOW()),
(2, 3, NOW()),
(1, 1, NOW());

INSERT INTO reviews (id, user_id, event_id, rating, comment, photos, videos, created_at) VALUES
(1, 3, 1, 5, 'Отличное мероприятие, все было очень атмосферно!', '["/images/uploads/feed_posts/demo-review-1.jpg"]', '["/images/uploads/feed_posts/demo-review-1.mp4"]', NOW()),
(2, 4, 1, 4, 'Хорошая организация и интересная программа.', '[]', '[]', NOW()),
(3, 3, 1, 5, 'Второй пример отзыва для проверки ленты.', '[]', '[]', NOW());

INSERT INTO review_likes (user_id, review_id, created_at) VALUES
(2, 1, NOW()),
(4, 1, NOW()),
(1, 1, NOW());

INSERT INTO review_reports (id, review_id, user_id, reason, status, admin_comment, created_at, reviewed_at) VALUES
(1, 2, 3, 'Неуместный тон', 'pending', NULL, NOW(), NULL);

INSERT INTO participants (user_id, event_id, status, created_at) VALUES
(3, 1, 'going', NOW()),
(4, 1, 'going', NOW()),
(3, 3, 'cancelled', NOW());

INSERT INTO notifications (user_id, title, message, is_read, created_at) VALUES
(3, 'Мероприятие одобрено', 'Ваше мероприятие «Осенний гастро-фестиваль» прошло модерацию.', FALSE, NOW()),
(2, 'Новый отзыв', 'Пользователь оставил отзыв о вашем мероприятии.', FALSE, NOW()),
(3, 'Предложение на голосовании', 'Ваше предложение доступно для голосования.', FALSE, NOW());

INSERT INTO feed_posts (id, user_id, media_url, caption, created_at) VALUES
(1, 3, '/images/uploads/feed_posts/post-1.jpg', 'Новый фотоотчет с события', NOW()),
(2, 4, '/images/uploads/feed_posts/post-2.jpg', 'Видео с мастер-класса', NOW());

INSERT INTO organizers (id, user_id, company_name, description, is_verified) VALUES
(1, 2, 'Вакация Events', 'Организация городских и выездных событий', TRUE);

INSERT INTO partners (id, user_id, company_name, inn, contact_info, status, commission_rate, created_at) VALUES
(1, 2, 'Арт-лофт Центр', '7700000000', 'partner@example.com', 'approved', 12.50, NOW()),
(2, 3, 'Кафе на Набережной', '7800000001', 'cafe@example.com', 'pending', 10.00, NOW());

INSERT INTO faq (id, question, answer, for_role) VALUES
(1, 'Когда и где пройдут мероприятия?', 'Площадки разные: от лофтов в центре до загородных баз отдыха.', 'all'),
(2, 'Как оставить отзыв?', 'Откройте профиль, перейдите в раздел отзывов и заполните форму.', 'user'),
(3, 'Как проходит модерация?', 'Администратор проверяет мероприятие или предложение вручную и по автоматическим фильтрам.', 'organizer');

INSERT INTO contact_messages (id, name, phone, email, message, source, status, reply, admin_reply, replied_at, created_at) VALUES
(1, 'Ольга Смирнова', '+79991112233', 'olga@example.com', 'Хочу уточнить условия участия.', 'landing', 'pending', NULL, NULL, NULL, NOW());

INSERT INTO cookies_consent (id, ip_or_id, consent, date) VALUES
(1, 'seed-demo', TRUE, NOW());

SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1), TRUE) FROM users;
SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE(MAX(id), 1), TRUE) FROM categories;
SELECT setval(pg_get_serial_sequence('events', 'id'), COALESCE(MAX(id), 1), TRUE) FROM events;
SELECT setval(pg_get_serial_sequence('proposals', 'id'), COALESCE(MAX(id), 1), TRUE) FROM proposals;
SELECT setval(pg_get_serial_sequence('proposal_votes', 'id'), COALESCE(MAX(id), 1), TRUE) FROM proposal_votes;
SELECT setval(pg_get_serial_sequence('reviews', 'id'), COALESCE(MAX(id), 1), TRUE) FROM reviews;
SELECT setval(pg_get_serial_sequence('review_likes', 'id'), COALESCE(MAX(id), 1), TRUE) FROM review_likes;
SELECT setval(pg_get_serial_sequence('review_reports', 'id'), COALESCE(MAX(id), 1), TRUE) FROM review_reports;
SELECT setval(pg_get_serial_sequence('participants', 'id'), COALESCE(MAX(id), 1), TRUE) FROM participants;
SELECT setval(pg_get_serial_sequence('notifications', 'id'), COALESCE(MAX(id), 1), TRUE) FROM notifications;
SELECT setval(pg_get_serial_sequence('feed_posts', 'id'), COALESCE(MAX(id), 1), TRUE) FROM feed_posts;
SELECT setval(pg_get_serial_sequence('organizers', 'id'), COALESCE(MAX(id), 1), TRUE) FROM organizers;
SELECT setval(pg_get_serial_sequence('partners', 'id'), COALESCE(MAX(id), 1), TRUE) FROM partners;
SELECT setval(pg_get_serial_sequence('faq', 'id'), COALESCE(MAX(id), 1), TRUE) FROM faq;
SELECT setval(pg_get_serial_sequence('contact_messages', 'id'), COALESCE(MAX(id), 1), TRUE) FROM contact_messages;
SELECT setval(pg_get_serial_sequence('cookies_consent', 'id'), COALESCE(MAX(id), 1), TRUE) FROM cookies_consent;
