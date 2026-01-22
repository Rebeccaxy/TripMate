const { db } = require('../db/database');

class Post {
  // 创建帖子
  static create(postData, callback) {
    const { id, noteId, userId, placeId, category, title, text, images, createdAt } = postData;
    
    try {
      const stmt = db.prepare(
        `INSERT INTO posts (id, note_id, user_id, place_id, category, title, text, images, created_at, like_count, favorite_count, comment_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      stmt.run(
        id,
        noteId,
        userId,
        placeId || null,
        category,
        title,
        text,
        JSON.stringify(images || []),
        createdAt,
        0,
        0,
        0
      );
      
      callback(null, {
        id,
        noteId,
        userId,
        placeId: placeId || null,
        category,
        title,
        text,
        images: images || [],
        createdAt,
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
      });
    } catch (err) {
      callback(err);
    }
  }

  // 根据ID查找帖子
  static findById(id, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM posts WHERE id = ?');
      const row = stmt.get(id);
      
      if (!row) {
        return callback(null, null);
      }
      
      callback(null, {
        id: row.id,
        noteId: row.note_id,
        userId: row.user_id,
        placeId: row.place_id,
        category: row.category,
        title: row.title,
        text: row.text,
        images: JSON.parse(row.images || '[]'),
        createdAt: row.created_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      });
    } catch (err) {
      callback(err);
    }
  }

  // 根据分类查找帖子
  static findByCategory(category, callback) {
    try {
      const stmt = db.prepare(
        'SELECT * FROM posts WHERE category = ? ORDER BY created_at DESC'
      );
      const rows = stmt.all(category);
      
      const posts = rows.map(row => ({
        id: row.id,
        noteId: row.note_id,
        userId: row.user_id,
        placeId: row.place_id,
        category: row.category,
        title: row.title,
        text: row.text,
        images: JSON.parse(row.images || '[]'),
        createdAt: row.created_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      }));
      
      callback(null, posts);
    } catch (err) {
      callback(err);
    }
  }

  // 根据笔记ID查找帖子
  static findByNoteId(noteId, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM posts WHERE note_id = ?');
      const rows = stmt.all(noteId);
      
      const posts = rows.map(row => ({
        id: row.id,
        noteId: row.note_id,
        userId: row.user_id,
        placeId: row.place_id,
        category: row.category,
        title: row.title,
        text: row.text,
        images: JSON.parse(row.images || '[]'),
        createdAt: row.created_at,
        likeCount: row.like_count,
        favoriteCount: row.favorite_count,
        commentCount: row.comment_count,
      }));
      
      callback(null, posts);
    } catch (err) {
      callback(err);
    }
  }

  // 删除帖子（根据笔记ID）
  static deleteByNoteId(noteId, callback) {
    try {
      const stmt = db.prepare('DELETE FROM posts WHERE note_id = ?');
      stmt.run(noteId);
      callback(null, true);
    } catch (err) {
      callback(err);
    }
  }

  // 删除单个帖子
  static delete(id, callback) {
    try {
      const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
      stmt.run(id);
      callback(null, true);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = Post;
