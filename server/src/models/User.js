const { db } = require('../db/database');
const bcrypt = require('bcryptjs');

class User {
  // 根据邮箱查找用户
  static findByEmail(email, callback) {
    try {
      const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
      const user = stmt.get(email.toLowerCase());
      callback(null, user || null);
    } catch (err) {
      callback(err);
    }
  }

  // 根据ID查找用户
  static findById(id, callback) {
    try {
      const stmt = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
      const user = stmt.get(id);
      callback(null, user || null);
    } catch (err) {
      callback(err);
    }
  }

  // 创建新用户
  static create(userData, callback) {
    const { id, name, email, password, createdAt } = userData;
    
    // 加密密码
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return callback(err);
      }

      try {
        const stmt = db.prepare(
          'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.run(id, name, email.toLowerCase(), hashedPassword, createdAt);
        
        // 返回用户信息（不包含密码）
        callback(null, {
          id,
          name,
          email: email.toLowerCase(),
          createdAt,
        });
      } catch (err) {
        callback(err);
      }
    });
  }

  // 验证密码
  static verifyPassword(plainPassword, hashedPassword, callback) {
    bcrypt.compare(plainPassword, hashedPassword, callback);
  }

  // 检查邮箱是否已存在
  static emailExists(email, callback) {
    try {
      const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
      const row = stmt.get(email.toLowerCase());
      callback(null, row.count > 0);
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = User;
