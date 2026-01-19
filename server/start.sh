#!/bin/bash

# TripMate后端服务启动脚本

echo "🚀 正在启动TripMate后端服务..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
  echo "📦 正在安装依赖..."
  npm install
fi

# 检查.env文件
if [ ! -f ".env" ]; then
  echo "⚠️  未找到.env文件，正在从.env.example创建..."
  cp .env.example .env
  echo "✅ 已创建.env文件，请编辑并设置JWT_SECRET"
fi

# 检查数据库是否已初始化
if [ ! -f "data/tripmate.db" ]; then
  echo "🗄️  正在初始化数据库..."
  npm run init-db
fi

# 启动服务器
echo "🎯 启动服务器..."
npm run dev
