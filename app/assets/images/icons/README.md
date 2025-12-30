# 图标资源文件夹

此文件夹用于存放应用中使用的小图标资源。

## 使用说明

### Home界面积分图标
- `ri_copper-coin-line.png` - 积分图标（用于Home界面显示points）
- `ri_copper-coin-line@2x.png` - 2倍图（可选）
- `ri_copper-coin-line@3x.png` - 3倍图（可选）

### 搜索图标
- `search-icon.png` - 搜索框放大镜图标（用于Home界面搜索框）
- `search-icon@2x.png` - 2倍图（可选）
- `search-icon@3x.png` - 3倍图（可选）

## 使用方式

在代码中通过以下方式引用：
```typescript
require('@/assets/images/icons/ri_copper-coin-line.png')
require('@/assets/images/icons/search-icon.png')
```

## 注意事项

- 建议使用PNG格式以保证图标清晰度
- 图标建议使用透明背景
- 如果使用@2x和@3x版本，系统会自动根据设备分辨率选择合适的图片

