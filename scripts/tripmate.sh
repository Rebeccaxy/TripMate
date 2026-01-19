#!/bin/zsh
# 一键启动 TripMate 前后端开发环境
# - 后端：Node + SQLite（server/）
# - 前端：Expo React Native（app/，默认启动 iOS 模拟器）

set -e

# 自动推导项目根目录（scripts/ 的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$PROJECT_ROOT/app"
SERVER_DIR="$PROJECT_ROOT/server"

echo "🚀 一键启动 TripMate 开发环境"
echo "📂 项目根目录: $PROJECT_ROOT"

#######################################
# 1. 启动后端（后台运行）
#######################################

if [ -d "$SERVER_DIR" ]; then
  echo ""
  echo "================ [后端] 启动中 ================"
  cd "$SERVER_DIR"

  # 安装依赖（如未安装）
  if [ ! -d "node_modules" ]; then
    echo "📦 [后端] 未检测到 node_modules，正在安装依赖..."
    npm install
  fi

  # 确保 .env 存在
  if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "⚙️  [后端] 未检测到 .env，正在从 .env.example 创建..."
    cp .env.example .env
    echo "✅ [后端] 已创建 .env，请记得在其中配置 JWT_SECRET"
  fi

  # 初始化数据库（如未初始化）
  if [ ! -f "data/tripmate.db" ]; then
    echo "🗄️  [后端] 未检测到 data/tripmate.db，正在初始化数据库..."
    npm run init-db
  fi

  echo "🎯 [后端] 使用 nodemon 启动开发服务器..."
  npm run dev &
  BACKEND_PID=$!
  echo "✅ [后端] 已在后台运行 (PID: $BACKEND_PID)，地址: http://localhost:3000"
else
  echo "⚠️  未找到后端目录: $SERVER_DIR，跳过后端启动"
fi

#######################################
# 2. 启动前端（当前终端）
#######################################

if [ -d "$APP_DIR" ]; then
  echo ""
  echo "================ [前端] 启动中 ================"
  cd "$APP_DIR"

  # 你可以改成 npm run start / npm run android 等
  echo "📱 [前端] 启动 Expo（iOS 模拟器）..."
  npm run ios
else
  echo "⚠️  未找到前端目录: $APP_DIR，无法启动 Expo"
fi

echo ""
echo "✅ TripMate 一键启动脚本结束。"
if [ -n "$BACKEND_PID" ]; then
  echo "ℹ️  如需手动停止后端，可执行：kill $BACKEND_PID"
fi
