# 登录注册界面图片资源

此文件夹用于存放登录注册界面所需的图片资源。

## 需要的图片文件

### 背景图
- `login-bg.png` - 登录注册界面的背景图（覆盖整个界面）
- `login-bg@2x.png` - 2倍图（可选）
- `login-bg@3x.png` - 3倍图（可选）

### 快捷登录图标
请放置三个快捷登录方式的按钮图标，例如：
- `wechat.png` - 微信登录图标
- `apple.png` - Apple 登录图标  
- `google.png` - Google 登录图标

或者根据实际使用的登录方式命名，例如：
- `qq.png` - QQ登录图标
- `phone.png` - 手机号登录图标
- 等等...

## 使用方式

在代码中通过以下方式引用：
```typescript
require('@/assets/images/auth/login-bg.png')
require('@/assets/images/auth/wechat.png')
```






