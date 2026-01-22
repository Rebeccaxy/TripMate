# Nearest Places Image Assets Folder / 附近地点图片资源文件夹

This folder contains image assets for the Nearest Places section.  
此文件夹包含"附近地点"部分的图片资源。

## Usage / 使用方法

### Place Images / 地点图片

- `NP1.png` - First nearest place image / 第一个附近地点图片
- `NP1@2x.png` - 2x version (optional) / 2倍版本（可选）
- `NP1@3x.png` - 3x version (optional) / 3倍版本（可选）

- `NP2.png` - Second nearest place image / 第二个附近地点图片
- `NP2@2x.png` - 2x version (optional) / 2倍版本（可选）
- `NP2@3x.png` - 3x version (optional) / 3倍版本（可选）

- `NP3.png` - Third nearest place image / 第三个附近地点图片
- `NP3@2x.png` - 2x version (optional) / 2倍版本（可选）
- `NP3@3x.png` - 3x version (optional) / 3倍版本（可选）

## Usage in Code / 代码中的使用

Reference images in code as follows:  
在代码中引用图片的方式如下：

```typescript
require('@/assets/images/nearest-places/NP1.png')
require('@/assets/images/nearest-places/NP2.png')
require('@/assets/images/nearest-places/NP3.png')
```

## Notes / 注意事项

- PNG format is recommended for better image quality / 推荐使用 PNG 格式以获得更好的图片质量
- Images should be square or near-square (for display on the left side of cards) / 图片应为正方形或接近正方形（用于在卡片左侧显示）
- If using @2x and @3x versions, the system will automatically select the appropriate image based on device resolution / 如果使用 @2x 和 @3x 版本，系统会根据设备分辨率自动选择相应的图片
