# 头像资源文件夹

此文件夹用于存放用户头像图片资源。

## 使用说明

### 默认头像
- `default-avatar.png` - 默认用户头像
- `default-avatar@2x.png` - 2倍图（可选）
- `default-avatar@3x.png` - 3倍图（可选）

### 用户头像
用户上传的头像也可以存放在此文件夹中，建议使用用户ID作为文件名。

## 使用方式

在代码中通过以下方式引用：
```typescript
require('@/assets/images/avatars/default-avatar.png')
```

## 注意事项

- 建议使用PNG格式以保证图片质量
- 头像建议使用圆形裁剪
- 如果使用@2x和@3x版本，系统会自动根据设备分辨率选择合适的图片

