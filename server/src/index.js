require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./db/database');
const authRoutes = require('./routes/auth');
const tracesRoutes = require('./routes/traces');
const aiRoutes = require('./routes/ai');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件（开发环境）
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [请求] ${req.method} ${req.path}`);
    if (req.query && Object.keys(req.query).length > 0) {
      console.log(`[${timestamp}] [请求] 查询参数:`, req.query);
    }
    next();
  });
}

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TripMate后端服务运行正常' });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/traces', tracesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);

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
      console.log(`   POST /api/traces/location - 上传位置点（需要认证）`);
      console.log(`   GET  /api/traces/cities - 获取城市访问记录（需要认证）`);
      console.log(`   GET  /api/traces/stats - 获取足迹统计（需要认证）`);
      console.log(`   GET  /api/traces/trajectory - 获取位置轨迹（需要认证）`);
      console.log(`   POST /api/ai/travel-suggest - 生成旅行建议（需要认证）`);
      console.log(`   GET  /api/chat/conversations - 获取对话列表（需要认证）`);
      console.log(`   POST /api/chat/conversations - 创建对话（需要认证）`);
      console.log(`   GET  /api/chat/conversations/:id/messages - 获取消息列表（需要认证）`);
      console.log(`   POST /api/chat/conversations/:id/messages - 创建消息（需要认证）`);
    });
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}

startServer();
