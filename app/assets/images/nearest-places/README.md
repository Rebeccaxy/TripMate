# Nearest Places 图片资源文件夹

此文件夹用于存放Nearest Places板块的地点图片资源。

## 使用说明

### 地点图片
- `NP1.png` - 第一个最近地点图片
- `NP1@2x.png` - 2倍图（可选）
- `NP1@3x.png` - 3倍图（可选）

- `NP2.png` - 第二个最近地点图片
- `NP2@2x.png` - 2倍图（可选）
- `NP2@3x.png` - 3倍图（可选）

## 使用方式

在代码中通过以下方式引用：
```typescript
require('@/assets/images/nearest-places/NP1.png')
require('@/assets/images/nearest-places/NP2.png')
```

## 注意事项

- 建议使用PNG格式以保证图片质量
- 图片建议使用方形或接近方形（用于卡片左侧显示）
- 如果使用@2x和@3x版本，系统会自动根据设备分辨率选择合适的图片

