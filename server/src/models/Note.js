const { db } = require('../db/database');

class Note {
  // 创建笔记
  static create(noteData, callback) {
    const { id, userId, title, placeId, status, sections, createdAt, updatedAt } = noteData;
    
    try {
      const stmt = db.prepare(
        `INSERT INTO notes (id, user_id, title, place_id, status, sections, created_at, updated_at, like_count, favorite_count, comment_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      const likeCount = status === 'published' ? 0 : null;
      const favoriteCount = status === 'published' ? 0 : null;
      const commentCount = status === 'published' ? 0 : null;
      
      stmt.run(
        id,
        userId,
        title,
        placeId || null,
        status,
        JSON.stringify(sections),
        createdAt,
        updatedAt,
        likeCount,
        favoriteCount,
        commentCount
      );
      
      callback(null, {
        id,
        userId,
        title,
        placeId: placeId || null,
        status,
        sections,
        createdAt,
        updatedAt,
        likeCount,
        favoriteCount,
        commentCount,
      });
    } catch (err) {
      callback(err);
    }
  }

  // 根据ID查找笔记
  static findById(id, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
      const row = stmt.get(id);
      
      if (!row) {
        return callback(null, null);
      }
      
      callback(null, {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        placeId: row.place_id,
        status: row.status,
        sections: JSON.parse(row.sections),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      });
    } catch (err) {
      callback(err);
    }
  }

  // 根据用户ID查找笔记
  static findByUserId(userId, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC');
      const rows = stmt.all(userId);
      
      const notes = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        placeId: row.place_id,
        status: row.status,
        sections: JSON.parse(row.sections),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      }));
      
      callback(null, notes);
    } catch (err) {
      callback(err);
    }
  }

  // 根据状态查找笔记（草稿或已发布）
  static findByStatus(userId, status, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM notes WHERE user_id = ? AND status = ? ORDER BY updated_at DESC');
      const rows = stmt.all(userId, status);
      
      const notes = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        placeId: row.place_id,
        status: row.status,
        sections: JSON.parse(row.sections),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      }));
      
      callback(null, notes);
    } catch (err) {
      callback(err);
    }
  }

  // 更新笔记
  static update(id, userId, updates, callback) {
    try {
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.placeId !== undefined) {
        fields.push('place_id = ?');
        values.push(updates.placeId || null);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
        
        // 如果状态改为已发布，初始化统计数据
        if (updates.status === 'published') {
          fields.push('like_count = ?');
          fields.push('favorite_count = ?');
          fields.push('comment_count = ?');
          values.push(0, 0, 0);
        }
      }
      if (updates.sections !== undefined) {
        fields.push('sections = ?');
        values.push(JSON.stringify(updates.sections));
      }
      
      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      
      values.push(id, userId);
      
      const stmt = db.prepare(
        `UPDATE notes SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`
      );
      stmt.run(...values);
      
      // 返回更新后的笔记
      Note.findById(id, callback);
    } catch (err) {
      callback(err);
    }
  }

  // 删除笔记
  static delete(id, userId, callback) {
    try {
      const stmt = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?');
      stmt.run(id, userId);
      callback(null, true);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = Note;
