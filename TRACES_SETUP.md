# Traces（足迹地图）功能设置指南

## 📋 概述

Traces功能已经基本实现，包括：
- ✅ 位置追踪服务（前台和后台）
- ✅ 足迹数据管理（城市访问记录）
- ✅ 地图展示和轨迹绘制
- ✅ 统计信息展示
- ✅ 城市列表和详情

## 🚀 安装依赖

首先需要安装必要的依赖包：

```bash
cd app
npm install expo-location react-native-maps expo-task-manager
```

**注意**：`react-native-maps` 需要额外的原生配置。对于Expo项目，建议使用 `expo install` 命令：

```bash
cd app
npx expo install expo-location react-native-maps expo-task-manager
```

## ⚙️ 配置说明

### 1. 地图服务配置

`react-native-maps` 需要配置地图服务提供商。当前代码使用 Google Maps，您需要：

**iOS**：
- 在 `app.json` 中添加 Google Maps API Key（如果需要）
- 或者使用 Apple Maps（默认，无需配置）

**Android**：
- 需要在 `app.json` 的 `android` 配置中添加 Google Maps API Key

**推荐方案**：使用默认的地图提供商（iOS用Apple Maps，Android用Google Maps），无需额外配置。

如果遇到地图显示问题，可以修改 `traces.tsx` 中的 `PROVIDER_GOOGLE` 为默认提供商。

### 2. 地理编码服务（重要）

当前实现中，城市名称的获取使用了占位实现。**您需要集成真实的地理编码服务**：

**选项1：高德地图API**
- 注册高德地图开发者账号
- 获取API Key
- 在 `server/src/models/CityVisit.js` 的 `getCityByLocation` 方法中集成逆地理编码API

**选项2：百度地图API**
- 注册百度地图开发者账号
- 获取API Key
- 集成逆地理编码API

**选项3：使用第三方服务**
- 可以使用 `geocoding-api` 等npm包
- 或使用免费的OpenStreetMap Nominatim API

**示例代码位置**：`server/src/models/CityVisit.js` 第 12-20 行

### 3. 数据库初始化

运行数据库初始化脚本以创建足迹相关的表：

```bash
cd server
npm run init-db
```

这将创建以下表：
- `location_points` - 位置轨迹表
- `city_visits` - 城市访问记录表

## 📱 使用说明

### 首次使用

1. **开启位置追踪**
   - 进入 Traces 页面
   - 点击"开启位置追踪"按钮
   - 授予定位权限（前台和后台）

2. **查看足迹**
   - 系统会自动记录您的位置
   - 当满足条件时（累计到访2次或停留48小时），城市会被点亮
   - 在地图上可以看到已点亮城市的标记和轨迹线

### 业务规则

根据您提供的需求，实现了以下规则：

1. **到访判定**：
   - 累计到访2次：第二次到达后的第二天城市会被点亮
   - 连续停留48小时以上：第三天直接点亮

2. **位置采集**：
   - 静止时：每5分钟采集一次
   - 移动时：每1分钟采集一次
   - 根据运动状态自动调整采样频率

3. **防作弊**：
   - 不允许手动添加城市
   - 只能通过实时定位达到规则方可点亮
   - 服务器端可以基于时间和位置信息判断异常行为

## 🔧 需要您完成的事项

### 1. 集成地理编码服务（必须）

**文件**：`server/src/models/CityVisit.js`

**方法**：`getCityByLocation(latitude, longitude)`

**当前状态**：返回占位值 `{ cityName: '未知城市', provinceName: '未知省份' }`

**需要完成**：
```javascript
static async getCityByLocation(latitude, longitude) {
  // TODO: 调用地理编码API
  // 示例：使用高德地图逆地理编码API
  const response = await fetch(
    `https://restapi.amap.com/v3/geocode/regeo?key=YOUR_API_KEY&location=${longitude},${latitude}`
  );
  const data = await response.json();
  // 解析返回的城市和省份信息
  return {
    cityName: data.regeocode.addressComponent.city,
    provinceName: data.regeocode.addressComponent.province,
  };
}
```

### 2. 安装依赖包（必须）

```bash
cd app
npx expo install expo-location react-native-maps expo-task-manager
```

### 3. 测试地图显示（建议）

- iOS：默认使用Apple Maps，应该可以直接使用
- Android：可能需要配置Google Maps API Key

如果遇到地图不显示的问题，可以：
1. 检查网络连接
2. 检查权限是否授予
3. 尝试使用默认地图提供商（移除 `PROVIDER_GOOGLE`）

### 4. 优化位置采集逻辑（可选）

当前实现中，城市访问记录的更新逻辑在 `server/src/models/LocationPoint.js` 的 `updateCityVisit` 方法中。

您可能需要根据实际需求调整：
- 停留时间的计算方式
- 到访判定的阈值
- 连续停留的判断逻辑

## 🐛 已知问题

1. **地理编码服务**：当前返回占位值，需要集成真实API
2. **地图提供商**：Android可能需要配置Google Maps API Key
3. **后台定位**：在某些设备上可能需要用户手动在系统设置中开启后台定位权限

## 📚 API文档

### 前端服务

**LocationTrackingService** (`app/services/locationTrackingService.ts`)
- `requestPermissions()` - 请求定位权限
- `startTracking()` - 开始位置追踪
- `stopTracking()` - 停止位置追踪
- `checkPermissions()` - 检查权限状态

**TracesService** (`app/services/tracesService.ts`)
- `getCityVisits()` - 获取城市访问列表
- `getStats()` - 获取统计信息
- `getLocationTrajectory()` - 获取位置轨迹
- `uploadLocation()` - 上传位置点

### 后端API

**POST** `/api/traces/location` - 上传位置点
**GET** `/api/traces/cities` - 获取城市访问记录
**GET** `/api/traces/cities/:id` - 获取城市详情
**GET** `/api/traces/stats` - 获取统计信息
**GET** `/api/traces/trajectory` - 获取位置轨迹

## 🎯 下一步优化建议

1. **地理编码缓存**：缓存已查询的城市信息，减少API调用
2. **轨迹优化**：对轨迹点进行抽稀处理，减少存储和传输
3. **离线支持**：位置点先保存到本地，网络恢复后批量上传
4. **分享功能**：生成足迹地图图片分享到社交平台
5. **成就系统**：点亮特定城市或完成里程碑时给予奖励
6. **旅行日记**：为每个城市添加照片、笔记等功能

## 📞 需要帮助？

如果遇到问题，请检查：
1. 依赖是否正确安装
2. 权限是否正确授予
3. 后端服务是否正常运行
4. 数据库表是否已创建
