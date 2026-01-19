# TripMate

TripMate: a mobile travel planner integrating third-party APIs and an AI agent for personalized 
itineraries.

一个集成了第三方 API 和 AI 智能体的移动端旅行规划应用，为您提供个性化的旅行行程规划。

## 功能特性

- 🗺️ 智能旅行规划
- 🤖 AI 助手（基于通义千问）
- 📱 跨平台支持（iOS / Android）
- 🔐 用户认证系统
- 💾 SQLite 数据库存储

## 支持平台与测试情况

- **iOS**：已在 iOS 模拟器（iPhone 17 Pro，iOS 26.0）验证可运行
- **Android**：代码目标支持，但你当前尚未在 Android 模拟器/真机上验证（欢迎补充测试反馈）

## 快速开始

### 前置要求

- Node.js (推荐 v18+)
- npm 或 yarn
- Expo CLI（会自动安装）
- iOS 开发：Xcode（macOS）
- Android 开发：Android Studio

### 一键启动（推荐）

我们提供了一个便捷的启动脚本，可以同时启动后端和前端服务：

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd TripMate

# 2. 赋予脚本执行权限（只需执行一次）
chmod +x scripts/tripmate.sh

# 3. 一键启动前后端
./scripts/tripmate.sh
```

脚本会自动完成以下操作：
- ✅ 检查并安装后端依赖（如需要）
- ✅ 创建 `.env` 配置文件（如不存在）
- ✅ 初始化数据库（如未初始化）
- ✅ 启动后端服务（http://localhost:3000）
- ✅ 启动前端 Expo 开发服务器（iOS 模拟器）

**注意**：首次运行前，请确保：
1. 后端 `.env` 文件中已配置 `JWT_SECRET`
2. 前端 `.env.local` 文件中已配置 `EXPO_PUBLIC_QIANWEN_API_KEY`（如需使用 AI 功能）

### 手动启动（可选）

如果你需要分别启动前后端，或自定义启动方式：

#### 启动后端

```bash
cd server
npm install              # 首次运行
cp .env.example .env     # 首次运行，记得配置 JWT_SECRET
npm run init-db          # 首次运行，初始化数据库
npm run dev              # 启动开发服务器
```

后端将在 `http://localhost:3000` 运行。

#### 启动前端

```bash
cd app
npm install              # 首次运行
npm run ios              # iOS 模拟器
# 或
npm run android          # Android 模拟器
# 或
npm start                # 仅启动开发服务器
```

## 项目结构

```
TripMate/
├── app/                  # 前端（React Native + Expo）
│   ├── app/             # 应用页面
│   ├── components/      # 组件
│   ├── config/          # 配置文件
│   └── services/        # 服务层
├── server/              # 后端（Node.js + Express）
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── models/      # 数据模型
│   │   └── db/         # 数据库配置
│   └── data/           # SQLite 数据库文件
└── scripts/            # 工具脚本
    └── tripmate.sh     # 一键启动脚本
```

## 配置说明

### 后端配置

编辑 `server/.env`：

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

### 前端配置

编辑 `app/.env.local`（创建此文件）：

```env
EXPO_PUBLIC_QIANWEN_API_KEY=your-qianwen-api-key
```

获取通义千问 API Key：访问 [阿里云 DashScope 控制台](https://dashscope.aliyun.com/)

## 开发指南

### API 文档

后端 API 文档请参考：
- `BACKEND_SETUP.md` - 后端设置指南
- `BACKEND_SUMMARY.md` - API 接口文档

### 常见问题

- `HTTP 502` 错误：检查 Expo 开发服务器是否正常运行
- 无法连接后端：确认后端服务在 `http://localhost:3000` 运行
- API Key 未配置：检查 `.env.local` 文件是否存在并配置正确

更多故障排查请参考 `app/TROUBLESHOOTING.md`

## 许可证

本项目采用 **MIT License**，详见 `LICENSE` 文件。

## 贡献

欢迎提交 Issue 和 Pull Request！
