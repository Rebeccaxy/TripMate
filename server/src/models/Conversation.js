const { db } = require('../db/database');

class Conversation {
  // 获取用户的所有对话
  static async findByUserId(userId, limit = 50) {
    try {
      const stmt = db.prepare(`
        SELECT id, title, summary, updated_at as updatedAt, created_at as createdAt
        FROM conversations
        WHERE user_id = ?
        ORDER BY updated_at DESC
        LIMIT ?
      `);
      const conversations = stmt.all(userId, limit);
      return conversations;
    } catch (err) {
      console.error('[Conversation] 查询对话失败:', err);
      throw err;
    }
  }

  // 根据ID查找对话
  static async findById(conversationId, userId) {
    try {
      const stmt = db.prepare(`
        SELECT id, title, summary, updated_at as updatedAt, created_at as createdAt
        FROM conversations
        WHERE id = ? AND user_id = ?
      `);
      const conversation = stmt.get(conversationId, userId);
      return conversation || null;
    } catch (err) {
      console.error('[Conversation] 查询对话失败:', err);
      throw err;
    }
  }

  // 创建新对话
  static async create(userId, conversationData) {
    try {
      const { id, title, summary } = conversationData;
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
        INSERT INTO conversations (id, user_id, title, summary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, userId, title, summary || '', now, now);
      
      return {
        id,
        title,
        summary: summary || '',
        updatedAt: now,
        createdAt: now,
      };
    } catch (err) {
      console.error('[Conversation] 创建对话失败:', err);
      throw err;
    }
  }

  // 更新对话
  static async update(conversationId, userId, updates) {
    try {
      const { title, summary } = updates;
      const now = new Date().toISOString();
      
      const stmt = db.prepare(`
        UPDATE conversations
        SET title = COALESCE(?, title),
            summary = COALESCE(?, summary),
            updated_at = ?
        WHERE id = ? AND user_id = ?
      `);
      const result = stmt.run(title, summary, now, conversationId, userId);
      
      if (result.changes === 0) {
        return null;
      }
      
      return await this.findById(conversationId, userId);
    } catch (err) {
      console.error('[Conversation] 更新对话失败:', err);
      throw err;
    }
  }

  // 删除对话
  static async delete(conversationId, userId) {
    try {
      const stmt = db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?');
      const result = stmt.run(conversationId, userId);
      return result.changes > 0;
    } catch (err) {
      console.error('[Conversation] 删除对话失败:', err);
      throw err;
    }
  }
}

module.exports = Conversation;
