# 定位图标资源说明

这里用于存放「一键回到当前位置」的靶心图标，按 React Native / Expo 的 1x、2x、3x 规格管理。

## 命名约定

请在本目录下放入三张 PNG 图片（透明背景最佳）：

- `locate-target.png`      — 基础尺寸（1x）
- `locate-target@2x.png`   — 2 倍尺寸（2x）
- `locate-target@3x.png`   — 3 倍尺寸（3x）

注意：

- 三张图内容一致，只是像素尺寸不同（例如 24x24、48x48、72x72）。
- 放好之后，在代码里只需要引用 `require('@/assets/icons/location/locate-target.png')`，
  React Native 会自动根据设备像素比选择对应的 `@2x` / `@3x` 资源。

