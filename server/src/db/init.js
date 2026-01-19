require('dotenv').config();
const { initDatabase, closeDatabase } = require('./database');

async function initialize() {
  try {
    console.log('正在初始化数据库...');
    await initDatabase();
    console.log('数据库初始化完成！');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

initialize();
