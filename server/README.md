# TripMate 后端服务

TripMate应用的后端API服务，提供用户注册、登录等功能。

## 功能特性

- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT令牌认证
- ✅ 密码加密存储（bcrypt）
- ✅ SQLite数据库
- ✅ 输入验证

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置你的JWT密钥：

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动服务器

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## API接口

### 用户注册

**POST** `/api/auth/register`

请求体：
```json
{
  "name": "用户名",
  "email": "user@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "注册成功",
  "user": {
    "id": "user_id",
    "name": "用户名",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 用户登录

**POST** `/api/auth/login`

请求体：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

响应：
```json
{
  "success": true,
  "message": "登录成功",
  "user": {
    "id": "user_id",
    "name": "用户名",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

### 获取当前用户

**GET** `/api/auth/me`

请求头：
```
Authorization: Bearer <token>
```

响应：
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "用户名",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 项目结构

```
server/
├── src/
│   ├── db/
│   │   ├── database.js      # 数据库连接和初始化
│   │   └── init.js          # 数据库初始化脚本
│   ├── models/
│   │   └── User.js          # 用户模型
│   ├── routes/
│   │   └── auth.js          # 认证路由
│   ├── middleware/
│   │   └── auth.js          # JWT认证中间件
│   └── index.js             # 服务器入口
├── data/                     # 数据库文件存储目录
├── .env                      # 环境变量（不提交到git）
├── .env.example             # 环境变量示例
└── package.json
```

## 技术栈

- **Express.js** - Web框架
- **SQLite3** - 数据库
- **bcryptjs** - 密码加密
- **jsonwebtoken** - JWT令牌
- **express-validator** - 输入验证
- **cors** - 跨域支持

## 注意事项

1. 生产环境请务必修改 `.env` 中的 `JWT_SECRET` 为强随机字符串
2. 数据库文件存储在 `data/` 目录，请确保该目录有写入权限
3. 建议在生产环境使用更强大的数据库（如PostgreSQL、MySQL）
