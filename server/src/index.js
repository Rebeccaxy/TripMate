require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TripMate后端服务运行正常' });
});

// API路由
app.use('/api/auth', authRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 TripMate后端服务已启动`);
      console.log(`📡 服务器运行在 http://localhost:${PORT}`);
      console.log(`📝 API文档:`);
      console.log(`   POST /api/auth/register - 用户注册`);
      console.log(`   POST /api/auth/login - 用户登录`);
      console.log(`   GET  /api/auth/me - 获取当前用户（需要认证）`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
