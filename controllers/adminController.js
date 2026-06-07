const db = require('../config/database');
const { checkProfanity, checkFormat } = require('../utils/moderationHelper');

async function hasColumn(tableName, columnName) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return (rows[0]?.cnt || 0) > 0;
}


class AdminController {
  static async getDashboard(req, res) {
    try {
      const [pendingEvents] = await db.execute('SELECT COUNT(*) as count FROM events WHERE status = "pending"');
      const [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users');
      const [eventsCount] = await db.execute('SELECT COUNT(*) as count FROM events WHERE status = "approved"');
      const [reportsCount] = await db.execute('SELECT COUNT(*) as count FROM review_reports WHERE status = "pending"');
      
      res.render('admin/dashboard', {
        pendingCount: pendingEvents[0]?.count || 0,
        usersCount: usersCount[0]?.count || 0,
        eventsCount: eventsCount[0]?.count || 0,
        reportsCount: reportsCount[0]?.count || 0,
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).send('Ошибка загрузки дашборда');
    }
  }

  static async getModeration(req, res) {
    try {
      const currentRole = req.query.role || 'all';
      const selectedId = req.query.id;
      const selectedType = req.query.type || 'event';

      let pendingEvents = [];
      try {
        const [rows] = await db.execute(`
          SELECT e.*, u.first_name, u.last_name, u.email, u.phone
          FROM events e 
          JOIN users u ON e.organizer_id = u.id 
          WHERE e.status = 'pending'
          ORDER BY e.created_at DESC
        `);
        pendingEvents = rows;
        console.log('Мероприятий на модерации:', pendingEvents.length);
      } catch (e) { console.error('Error pendingEvents:', e); }

      let allEvents = [];
      try {
        const [rows] = await db.execute(`
          SELECT e.*, u.first_name, u.last_name 
          FROM events e 
          JOIN users u ON e.organizer_id = u.id
          ORDER BY e.created_at DESC
        `);
        allEvents = rows;
      } catch (e) { console.error('Error allEvents:', e); }
      
      let proposalsList = [];
      try {
        const [rows] = await db.execute(`
          SELECT p.*, u.first_name, u.last_name, u.email, u.phone
          FROM proposals p 
          JOIN users u ON p.user_id = u.id 
          WHERE p.status = 'moderation'
          ORDER BY p.created_at DESC
        `);
        proposalsList = rows;
        console.log('Предложений на модерации:', proposalsList.length);
      } catch (e) { console.error('Error proposals:', e); }

      let allProposals = [];
      try {
        const [rows] = await db.execute(`
          SELECT p.*, u.first_name, u.last_name 
          FROM proposals p 
          JOIN users u ON p.user_id = u.id
          ORDER BY p.created_at DESC
        `);
        allProposals = rows;
      } catch (e) { console.error('Error allProposals:', e); }

      if (selectedId) {
        if (selectedType === 'event') {
          const [events] = await db.execute(`
            SELECT e.*, u.first_name, u.last_name, u.email, u.phone, u.role as user_role
            FROM events e 
            JOIN users u ON e.organizer_id = u.id 
            WHERE e.id = ?
          `, [selectedId]);
          
          if (events.length > 0) {
            const event = events[0];
            // АВТОМАТИЧЕСКАЯ ПРОВЕРКА ДЛЯ МЕРОПРИЯТИЯ
            event.profanityCheck = checkProfanity(event.title + ' ' + (event.description || ''));
            event.formatCheck = checkFormat(event.description || '', event.media_url, true);

            return res.render('admin/moderation', { 
              selectedItem: event, 
              selectedType: 'event',
              events: pendingEvents, 
              allEvents: allEvents,
              proposals: proposalsList,
              allProposals: allProposals,
              currentRole: currentRole,
              path: req.originalUrl
            });
          }
        } else if (selectedType === 'proposal') {
          const [proposalsData] = await db.execute(`
            SELECT p.*, u.first_name, u.last_name, u.email, u.phone
            FROM proposals p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
          `, [selectedId]);
          
          if (proposalsData.length > 0) {
            const proposal = proposalsData[0];
            // АВТОМАТИЧЕСКАЯ ПРОВЕРКА ДЛЯ ПРЕДЛОЖЕНИЯ
            proposal.profanityCheck = checkProfanity(proposal.title + ' ' + (proposal.description || ''));
            proposal.formatCheck = checkFormat(proposal.description || '', null, false);

            return res.render('admin/moderation', { 
              selectedItem: proposal, 
              selectedType: 'proposal',
              events: pendingEvents, 
              allEvents: allEvents,
              proposals: proposalsList,
              allProposals: allProposals,
              currentRole: currentRole,
              path: req.originalUrl
            });
          }
        }
      }

      res.render('admin/moderation', { 
        events: pendingEvents, 
        allEvents: allEvents,
        proposals: proposalsList,
        allProposals: allProposals,
        currentRole: currentRole,
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Global Error in getModeration:', error);
      res.status(500).send('Ошибка при получении модерации: ' + error.message);
    }
  }

  static async getModerationData(req, res) {
    try {
      const [events] = await db.execute(`
        SELECT e.*, u.first_name, u.last_name, u.email 
        FROM events e
        JOIN users u ON e.organizer_id = u.id
        ORDER BY e.created_at DESC
      `);
      
      const [proposals] = await db.execute(`
        SELECT p.*, u.first_name, u.last_name, u.email 
        FROM proposals p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `);
      
      res.json({
        events: events,
        proposals: proposals
      });
    } catch (error) {
      console.error('Ошибка получения данных модерации:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  static async updateEventStatus(req, res) {
    try {
      const { id, status, moderation_comment } = req.body;

      let newStatus = status;
      if (status === 'approved') {
        newStatus = 'approved';
      } else if (status === 'rejected') {
        newStatus = 'rejected';
      } else if (status === 'requires_changes') {
        newStatus = 'requires_changes';
      }

      const canStoreComment = await hasColumn('events', 'moderation_comment');
      if (canStoreComment) {
        await db.execute(
          'UPDATE events SET status = ?, moderation_comment = ? WHERE id = ?',
          [newStatus, moderation_comment || null, id]
        );
      } else {
        await db.execute(
          'UPDATE events SET status = ? WHERE id = ?',
          [newStatus, id]
        );
      }

      try {
        const [event] = await db.execute('SELECT organizer_id, title FROM events WHERE id = ?', [id]);
        if (event.length > 0) {
          const NotificationModel = require('../models/NotificationModel');
          if (newStatus === 'approved') {
            await NotificationModel.create({
              user_id: event[0].organizer_id,
              title: 'Мероприятие одобрено',
              message: `Ваше мероприятие «${event[0].title}» прошло модерацию и опубликовано на сайте.`
            });
          } else if (newStatus === 'requires_changes' && moderation_comment) {
            await NotificationModel.create({
              user_id: event[0].organizer_id,
              title: 'Мероприятие отправлено на доработку',
              message: `Ваше мероприятие «${event[0].title}» отправлено на доработку. Причина: ${moderation_comment}`
            });
          } else if (newStatus === 'rejected' && moderation_comment) {
            await NotificationModel.create({
              user_id: event[0].organizer_id,
              title: 'Мероприятие отклонено',
              message: `Ваше мероприятие «${event[0].title}» отклонено. Причина: ${moderation_comment}`
            });
          }
        }
      } catch (e) {
        console.error('Notification error:', e);
      }

      res.redirect('/admin/moderation');
    } catch (error) {
      console.error('Update event status error:', error);
      res.status(500).send('Ошибка обновления статуса мероприятия');
    }
  }

  static async updateProposalStatus(req, res) {
    try {
      const { id, status, moderation_comment } = req.body;

      let newStatus = status;
      if (status === 'approved') {
        newStatus = 'voting';
      } else if (status === 'requires_changes') {
        newStatus = 'moderation';
      } else if (status === 'rejected') {
        newStatus = 'rejected';
      }

      const canStoreComment = await hasColumn('proposals', 'moderation_comment');
      if (canStoreComment) {
        await db.execute(
          'UPDATE proposals SET status = ?, moderation_comment = ? WHERE id = ?',
          [newStatus, moderation_comment || null, id]
        );
      } else {
        await db.execute(
          'UPDATE proposals SET status = ? WHERE id = ?',
          [newStatus, id]
        );
      }

      try {
        const [proposal] = await db.execute('SELECT user_id, title FROM proposals WHERE id = ?', [id]);
        if (proposal && proposal.length > 0 && proposal[0].user_id) {
          const NotificationModel = require('../models/NotificationModel');
          if (newStatus === 'voting') {
            await NotificationModel.create({
              user_id: proposal[0].user_id,
              title: 'Ваше предложение одобрено',
              message: `Ваше предложение «${proposal[0].title}» прошло модерацию и теперь доступно для голосования.`
            });
          } else if (newStatus === 'moderation' && moderation_comment) {
            await NotificationModel.create({
              user_id: proposal[0].user_id,
              title: 'Предложение отправлено на доработку',
              message: `Ваше предложение «${proposal[0].title}» отправлено на доработку. Причина: ${moderation_comment}`
            });
          } else if (newStatus === 'rejected' && moderation_comment) {
            await NotificationModel.create({
              user_id: proposal[0].user_id,
              title: 'Предложение отклонено',
              message: `Ваше предложение «${proposal[0].title}» отклонено. Причина: ${moderation_comment}`
            });
          }
        }
      } catch (e) {
        console.error('Notification error:', e);
      }

      res.redirect('/admin/moderation');
    } catch (error) {
      console.error('Update proposal status error:', error);
      res.status(500).send('Ошибка обновления статуса предложения');
    }
  }

  static async deleteEvent(req, res) {
    try {
      const { id } = req.body;
      await db.execute('DELETE FROM events WHERE id = ?', [id]);
      res.redirect('/admin/moderation');
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).send('Ошибка удаления мероприятия');
    }
  }

  static async deleteProposal(req, res) {
    try {
      const { id } = req.body;
      await db.execute('DELETE FROM proposals WHERE id = ?', [id]);
      res.redirect('/admin/moderation');
    } catch (error) {
      console.error('Delete proposal error:', error);
      res.status(500).send('Ошибка удаления предложения');
    }
  }

  static async getUsers(req, res) {
    try {
      const [users] = await db.execute(
        'SELECT id, first_name, last_name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
      );
      res.render('admin/users', { 
        users,
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Users error:', error);
      res.status(500).send('Ошибка загрузки пользователей');
    }
  }

  static async updateUserRole(req, res) {
    try {
      const { userId, role } = req.body;
      await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).send('Ошибка обновления роли');
    }
  }

  static async deleteUser(req, res) {
    try {
      const { userId } = req.body;
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      res.redirect('/admin/users');
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).send('Ошибка удаления пользователя');
    }
  }

  static async getFaq(req, res) {
    try {
      const [messages] = await db.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
      res.render('admin/faq', { 
        messages: messages || [],
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Faq error:', error);
      res.status(500).send('Ошибка загрузки сообщений');
    }
  }

  static async replyToMessage(req, res) {
    try {
      const { messageId, reply } = req.body;
      await db.execute(
        'UPDATE contact_messages SET status = "replied", reply = ?, admin_reply = ?, replied_at = NOW() WHERE id = ?',
        [reply, reply, messageId]
      );
      res.redirect('/admin/faq');
    } catch (error) {
      console.error('Reply error:', error);
      res.status(500).send('Ошибка отправки ответа');
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.body;
      await db.execute('DELETE FROM contact_messages WHERE id = ?', [messageId]);
      res.redirect('/admin/faq');
    } catch (error) {
      console.error('Delete message error:', error);
      res.status(500).send('Ошибка удаления сообщения');
    }
  }

  static async getReports(req, res) {
    try {
      const [reports] = await db.execute(`
        SELECT 
         rr.*, 
         u1.first_name as reporter_first_name, 
         u1.last_name as reporter_last_name, 
         u1.email as reporter_email,
         u1.avatar as reporter_avatar_url,
         u2.first_name as author_first_name, 
         u2.last_name as author_last_name, 
         u2.email as review_author_email,
         u2.avatar as author_avatar_url,
         r.comment as review_text, 
         r.event_id,
         e.title as event_title
        FROM review_reports rr
        JOIN users u1 ON rr.user_id = u1.id
        JOIN reviews r ON rr.review_id = r.id
        JOIN users u2 ON r.user_id = u2.id
        LEFT JOIN events e ON r.event_id = e.id
        ORDER BY rr.created_at DESC
      `);
      
      res.render('admin/reports', { 
        reports: reports || [],
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Reports error:', error);
      res.status(500).send('Ошибка загрузки жалоб: ' + error.message);
    }
  }

  static async updateReportStatus(req, res) {
    try {
      const { reportId, status, admin_comment } = req.body;
      
      const [report] = await db.execute(`
        SELECT rr.*, r.user_id as author_id, r.id as review_id
        FROM review_reports rr 
        JOIN reviews r ON rr.review_id = r.id 
        WHERE rr.id = ?
      `, [reportId]);
      
      if (report.length === 0) {
        return res.redirect('/admin/reports');
      }
      
      await db.execute(
        'UPDATE review_reports SET status = ?, admin_comment = ?, reviewed_at = NOW() WHERE id = ?',
        [status === 'reviewed' ? 'reviewed' : 'rejected', admin_comment || null, reportId]
      );
      
      if (status === 'reviewed') {
        await db.execute('DELETE FROM reviews WHERE id = ?', [report[0].review_id]);
      }
      
      res.redirect('/admin/reports');
    } catch (error) {
      console.error('Update report error:', error);
      res.status(500).send('Ошибка обработки жалобы');
    }
  }

  static async getPartners(req, res) {
    try {
      const [partners] = await db.execute(`
        SELECT 
          p.*, 
          u.first_name, 
          u.last_name, 
          u.email,
          'partners' as source_type
        FROM partners p 
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
      `);
      
      const [partnerMessages] = await db.execute(`
        SELECT 
          id,
          name as contact_name,
          phone,
          message as company_name,
          source,
          created_at,
          'pending' as status,
          NULL as user_id,
          NULL as inn,
          NULL as commission_rate,
          'contact_messages' as source_type
        FROM contact_messages 
        WHERE source = 'Страница партнеров' OR message LIKE '%ПАРТНЕРСКАЯ ЗАЯВКА%' OR message LIKE '%партнерская заявка%'
        ORDER BY created_at DESC
      `);
      
      const processedMessages = partnerMessages.map(msg => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(msg.company_name);
          return {
            ...msg,
            company_name: parsedData.company_name || msg.company_name,
            contact_name: parsedData.contact_name || msg.contact_name,
            phone: parsedData.phone || msg.phone,
            city: parsedData.city || null,
            venue_type: parsedData.venue_type || null,
            raw_message: msg.company_name
          };
        } catch(e) {
          return {
            ...msg,
            company_name: msg.company_name,
            contact_name: msg.contact_name,
            phone: msg.phone,
            city: null,
            venue_type: null,
            raw_message: msg.company_name
          };
        }
      });
      
      const allPartners = [...partners, ...processedMessages];
      allPartners.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      res.render('admin/partners', { 
        partners: allPartners,
        path: req.originalUrl
      });
    } catch (error) {
      console.error('Partners error:', error);
      res.render('admin/partners', { 
        partners: [],
        path: req.originalUrl,
        error: error.message
      });
    }
  }

  static async updatePartner(req, res) {
    try {
      const { id, status, commission_rate } = req.body;
      await db.execute(
        'UPDATE partners SET status = ?, commission_rate = ? WHERE id = ?',
        [status, commission_rate, id]
      );
      res.redirect('/admin/partners');
    } catch (error) {
      console.error('Update partner error:', error);
      res.status(500).send('Ошибка обновления партнера');
    }
  }
}

module.exports = AdminController;