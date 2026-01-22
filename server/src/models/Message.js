const { db } = require('../db/database');

class Message {
  // 获取对话的所有消息
  static async findByConversationId(conversationId, userId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT id, text, is_user as isUser, timestamp, created_at as createdAt
        FROM messages
        WHERE conversation_id = ? AND user_id = ?
        ORDER BY timestamp ASC
        LIMIT ?
      `);
      const messages = stmt.all(conversationId, userId, limit);
      return messages.map(msg => ({
        ...msg,
        isUser: msg.isUser === 1,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (err) {
      console.error('[Message] 查询消息失败:', err);
      throw err;
    }
  }

  // 创建新消息
  static async create(userId, conversationId, messageData) {
    try {
      const { id, text, isUser, timestamp } = messageData;
      const now = new Date().toISOString();
      const msgTimestamp = timestamp ? new Date(timestamp).toISOString() : now;
      
      const stmt = db.prepare(`
        INSERT INTO messages (id, conversation_id, user_id, text, is_user, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, conversationId, userId, text, isUser ? 1 : 0, msgTimestamp, now);
      
      return {
        id,
        text,
        isUser,
        timestamp: new Date(msgTimestamp),
        createdAt: new Date(now),
      };
    } catch (err) {
      console.error('[Message] 创建消息失败:', err);
      throw err;
    }
  }

  // 批量创建消息
  static async createBatch(userId, conversationId, messages) {
    try {
      const insertStmt = db.prepare(`
        INSERT INTO messages (id, conversation_id, user_id, text, is_user, timestamp, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      const insertMany = db.transaction((messages) => {
        for (const msg of messages) {
          const { id, text, isUser, timestamp } = msg;
          const msgTimestamp = timestamp ? new Date(timestamp).toISOString() : now;
          insertStmt.run(id, conversationId, userId, text, isUser ? 1 : 0, msgTimestamp, now);
        }
      });
      
      insertMany(messages);
      return messages.length;
    } catch (err) {
      console.error('[Message] 批量创建消息失败:', err);
      throw err;
    }
  }

  // 清空对话的所有消息
  static async clearByConversationId(conversationId, userId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM messages
        WHERE conversation_id = ? AND user_id = ?
      `);
      const result = stmt.run(conversationId, userId);
      return result.changes;
    } catch (err) {
      console.error('[Message] 清空消息失败:', err);
      throw err;
    }
  }
}

module.exports = Message;
