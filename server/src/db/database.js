const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dbDir, 'tripmate.db');

// 创建数据库连接
let db;
try {
  db = new Database(dbPath);
  console.log('已连接到SQLite数据库');
} catch (err) {
  console.error('数据库连接失败:', err.message);
  throw err;
}

// 初始化数据库表
const initDatabase = () => {
  try {
    // 创建用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log('用户表已创建或已存在');
    return Promise.resolve();
  } catch (err) {
    console.error('创建用户表失败:', err.message);
    return Promise.reject(err);
  }
};

// 关闭数据库连接
const closeDatabase = () => {
  try {
    db.close();
    console.log('数据库连接已关闭');
    return Promise.resolve();
  } catch (err) {
    console.error('关闭数据库连接失败:', err.message);
    return Promise.reject(err);
  }
};

module.exports = {
  db,
  initDatabase,
  closeDatabase,
};
