# TripMate 后端服务设置指南

## 快速开始

### 1. 安装后端依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置JWT密钥（生产环境请使用强随机字符串）：

```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动后端服务

开发模式（自动重启）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

## 前端配置

### React Native 网络配置

在React Native中，不同环境的API地址配置：

1. **iOS模拟器**：可以使用 `localhost` 或 `127.0.0.1`
2. **Android模拟器**：需要使用 `10.0.2.2`（这是Android模拟器访问宿主机的方式）
3. **真机调试**：需要使用电脑的局域网IP地址（如：`192.168.1.100`）

### 修改API地址

编辑 `app/config/api.ts` 文件中的 `API_CONFIG.BASE_URL`：

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'http://YOUR_LOCAL_IP:3000/api'  // 替换为你的局域网IP
    : 'https://your-production-api.com/api',
};
```

### 获取局域网IP地址

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

找到类似 `192.168.x.x` 或 `10.x.x.x` 的地址，这就是你的局域网IP。

## 测试API

### 测试注册接口

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试用户",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 测试登录接口

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 测试获取用户信息

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## API接口文档

### POST /api/auth/register

用户注册

**请求体：**
```json
{
  "name": "用户名",
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
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

### POST /api/auth/login

用户登录

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应：**
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

### GET /api/auth/me

获取当前用户信息（需要认证）

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
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

## 常见问题

### 1. 前端无法连接到后端

**问题**：React Native应用无法访问 `localhost:3000`

**解决方案**：
- iOS模拟器：确保使用 `localhost` 或 `127.0.0.1`
- Android模拟器：使用 `10.0.2.2` 代替 `localhost`
- 真机：使用电脑的局域网IP地址

### 2. CORS错误

后端已配置CORS，如果仍有问题，检查：
- 后端服务是否正在运行
- 端口号是否正确
- 防火墙是否阻止了连接

### 3. 数据库错误

确保：
- `data/` 目录有写入权限
- 已运行 `npm run init-db` 初始化数据库
- SQLite3已正确安装

### 4. JWT令牌无效

检查：
- `.env` 文件中的 `JWT_SECRET` 是否配置
- 令牌是否已过期（默认7天）
- 请求头格式是否正确：`Authorization: Bearer <token>`

## 生产环境部署

### 1. 使用更强大的数据库

建议将SQLite替换为PostgreSQL或MySQL：

```bash
npm install pg  # PostgreSQL
# 或
npm install mysql2  # MySQL
```

### 2. 环境变量

确保生产环境的 `.env` 文件包含：
- 强随机的 `JWT_SECRET`
- 正确的数据库连接字符串
- 生产环境的端口号

### 3. 安全建议

- 使用HTTPS
- 启用请求频率限制
- 添加输入验证和清理
- 使用环境变量管理敏感信息
- 定期更新依赖包

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

## 技术支持

如有问题，请查看：
- `server/README.md` - 后端详细文档
- 控制台日志输出
- 网络请求和响应
