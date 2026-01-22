#!/bin/bash

# TripMate 后端服务器重启脚本

echo "🛑 正在停止现有的服务器进程..."

# 查找并停止 nodemon 和 node 进程
pkill -f "nodemon src/index.js" 2>/dev/null
pkill -f "node src/index.js" 2>/dev/null

# 等待进程完全停止
sleep 2

echo "✅ 服务器已停止"
echo ""
echo "🚀 正在启动服务器..."

# 切换到服务器目录
cd "$(dirname "$0")"

# 启动服务器
npm run dev
