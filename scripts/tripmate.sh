#!/bin/zsh
# 一键打开 TripMate + 启动 Expo iOS 开发环境（iOS 模拟器 / Expo Go）

PROJECT_ROOT="/Users/morning_glory/codes/TripMate"
APP_DIR="$PROJECT_ROOT/app"

# 1. 用 Cursor 打开整个项目（在后台执行，当前终端继续用来跑开发服务）
cursor "$PROJECT_ROOT" &

# 2. 进入 Expo 项目目录
cd "$APP_DIR"

# 3. 启动开发服务器并在 iOS 模拟器中打开（等同于：npm run ios）
# - 会自动启动 Metro / Expo dev server
# - 若已配置 Xcode 和 iOS 模拟器，会自动在模拟器中打开 Expo Go
npm run ios




