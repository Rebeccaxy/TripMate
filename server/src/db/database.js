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

    // 创建位置轨迹表
    db.exec(`
      CREATE TABLE IF NOT EXISTS location_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        accuracy REAL,
        speed REAL,
        heading REAL,
        city_name TEXT,
        province_name TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_location_user_timestamp ON location_points(user_id, timestamp)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_location_user_city ON location_points(user_id, city_name)`);
    console.log('位置轨迹表已创建或已存在');

    // 创建城市访问记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS city_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        city_name TEXT NOT NULL,
        province_name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        first_visit_date TEXT NOT NULL,
        last_visit_date TEXT NOT NULL,
        visit_count INTEGER NOT NULL DEFAULT 1,
        total_stay_hours REAL NOT NULL DEFAULT 0,
        is_lighted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, city_name, province_name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_city_visits_user ON city_visits(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_city_visits_lighted ON city_visits(user_id, is_lighted)`);
    console.log('城市访问记录表已创建或已存在');

    // 创建对话表（用于记忆功能）
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(user_id, updated_at)`);
    console.log('对话表已创建或已存在');

    // 创建消息表（用于记忆功能）
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        text TEXT NOT NULL,
        is_user INTEGER NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, timestamp)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)`);
    console.log('消息表已创建或已存在');

    // 创建笔记表
    db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        place_id TEXT,
        status TEXT NOT NULL CHECK(status IN ('draft', 'published')),
        sections TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        like_count INTEGER,
        favorite_count INTEGER,
        comment_count INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_status ON notes(user_id, status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_notes_place ON notes(place_id)`);
    console.log('笔记表已创建或已存在');

    // 创建帖子表
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        note_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        place_id TEXT,
        category TEXT NOT NULL CHECK(category IN ('sight', 'food', 'route')),
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        images TEXT NOT NULL,
        created_at TEXT NOT NULL,
        like_count INTEGER NOT NULL DEFAULT 0,
        favorite_count INTEGER NOT NULL DEFAULT 0,
        comment_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category, created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_note ON posts(note_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_posts_place ON posts(place_id)`);
    console.log('帖子表已创建或已存在');

    return Promise.resolve();
  } catch (err) {
    console.error('创建数据库表失败:', err.message);
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
