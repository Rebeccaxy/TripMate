# Tab Bar 图标文件说明

此文件夹用于存放主界面 Tab Bar 的图标图片。

## 需要的图标文件

请为以下四个界面准备图标文件：

### 1. Home（首页）
- `home.png` - 普通分辨率图标
- `home@2x.png` - 2倍分辨率图标（Retina）
- `home@3x.png` - 3倍分辨率图标（Super Retina）
- `home-active.png` - 选中状态的普通分辨率图标（可选）
- `home-active@2x.png` - 选中状态的2倍分辨率图标（可选）
- `home-active@3x.png` - 选中状态的3倍分辨率图标（可选）

### 2. TripChat（行程聊天）
- `tripchat.png` - 普通分辨率图标
- `tripchat@2x.png` - 2倍分辨率图标（Retina）
- `tripchat@3x.png` - 3倍分辨率图标（Super Retina）
- `tripchat-active.png` - 选中状态的普通分辨率图标（可选）
- `tripchat-active@2x.png` - 选中状态的2倍分辨率图标（可选）
- `tripchat-active@3x.png` - 选中状态的3倍分辨率图标（可选）

### 3. Traces（足迹）
- `traces.png` - 普通分辨率图标
- `traces@2x.png` - 2倍分辨率图标（Retina）
- `traces@3x.png` - 3倍分辨率图标（Super Retina）
- `traces-active.png` - 选中状态的普通分辨率图标（可选）
- `traces-active@2x.png` - 选中状态的2倍分辨率图标（可选）
- `traces-active@3x.png` - 选中状态的3倍分辨率图标（可选）

### 4. Account（账户）
- `account.png` - 普通分辨率图标
- `account@2x.png` - 2倍分辨率图标（Retina）
- `account@3x.png` - 3倍分辨率图标（Super Retina）
- `account-active.png` - 选中状态的普通分辨率图标（可选）
- `account-active@2x.png` - 选中状态的2倍分辨率图标（可选）
- `account-active@3x.png` - 选中状态的3倍分辨率图标（可选）

## 图标规格建议

- **尺寸**：建议使用 24x24pt 作为基础尺寸
- **格式**：PNG（支持透明背景）
- **颜色**：建议使用单色图标，颜色会根据主题自动调整
- **样式**：简洁、清晰，符合 iOS/Android 设计规范

## 使用说明

图标文件准备好后，可以在 `app/(tabs)/_layout.tsx` 中使用 `Image` 组件或 `expo-image` 来引用这些图标。

示例：
```tsx
import { Image } from 'expo-image';

tabBarIcon: ({ focused }) => (
  <Image
    source={focused 
      ? require('@/assets/images/tabs/home-active.png')
      : require('@/assets/images/tabs/home.png')
    }
    style={{ width: 24, height: 24 }}
  />
)
```
