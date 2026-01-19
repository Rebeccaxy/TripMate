# AI聊天功能使用说明

## 已完成的功能

### 1. 用户偏好管理系统
- ✅ 创建了 `userPreferencesService.ts` 用于管理用户偏好
- ✅ 支持以下偏好设置：
  - 交通偏好（经济型/舒适型/豪华型）
  - 住宿类型（经济/中档/豪华/青旅）
  - 旅行节奏（轻松/中等/快节奏）
  - MBTI性格类型
  - 开放态度
  - 价格敏感度
  - 冒险项目态度

### 2. 千问API集成
- ✅ 创建了 `qianwenService.ts` 用于调用通义千问API
- ✅ 自动将用户偏好转换为系统提示词
- ✅ 支持对话历史上下文
- ✅ 完善的错误处理

### 3. 聊天服务增强
- ✅ 在 `chatService.ts` 中添加了 `getAIResponse` 函数
- ✅ 聊天页面已集成真实的AI回复功能
- ✅ 支持加载状态和错误提示

### 4. 配置管理
- ✅ 创建了 `config/api.ts` 用于API配置
- ✅ 提供了配置说明文档

## 使用步骤

### 第一步：配置API密钥

1. 访问 [阿里云DashScope控制台](https://dashscope.aliyun.com/)
2. 注册/登录并获取API Key
3. 打开 `app/config/api.ts`
4. 将 `YOUR_QIANWEN_API_KEY_HERE` 替换为您的实际API密钥

```typescript
export const QIANWEN_CONFIG = {
  API_KEY: 'sk-your-actual-api-key-here', // 替换这里
  // ...
};
```

### 第二步：测试聊天功能

1. 启动应用
2. 进入聊天页面
3. 发送一条消息测试AI回复

### 第三步：设置用户偏好（可选）

用户偏好功能已准备好，但需要在个人中心页面添加UI来设置。参考 `userPreferencesService.ts` 中的接口：

```typescript
import { saveUserPreferences, getUserPreferences } from '@/services/userPreferencesService';

// 设置偏好
await saveUserPreferences({
  transportationPreference: 'comfort',
  accommodationType: 'mid-range',
  travelPace: 'moderate',
  // ... 其他偏好
});

// 获取偏好
const preferences = await getUserPreferences();
```

## 后续开发建议

### 1. 个人中心页面 - 用户偏好设置

需要在 `app/(tabs)/account.tsx` 中添加偏好设置UI：

- 交通偏好选择器
- 住宿类型选择器
- 旅行节奏滑块
- MBTI类型选择
- 开放态度滑块
- 价格敏感度滑块
- 冒险项目态度选择

可以参考 `userPreferencesService.ts` 中的类型定义来设计UI。

### 2. 关于价格相关API

当前实现中，AI会根据用户的**价格敏感度偏好**提供建议，但**不会调用实时价格API**。

如果需要价格查询功能，可以考虑：

**方案A：免费方案（推荐）**
- AI提供价格区间建议
- 引导用户到相关平台查询具体价格
- 不调用外部价格API，节省成本

**方案B：集成价格API（需要预算）**
- 集成携程、去哪儿等平台API
- 或使用聚合数据等第三方服务
- 需要申请API权限和支付费用

**当前建议**：先使用方案A，等有预算后再考虑方案B。

### 3. 优化建议

- **流式输出**：当前使用非流式API，可以后续升级为流式输出，实现打字机效果
- **缓存机制**：可以缓存常见问题的回复，减少API调用
- **错误重试**：添加自动重试机制
- **离线支持**：添加离线模式提示

## 文件结构

```
app/
├── config/
│   ├── api.ts              # API配置
│   └── README.md           # 配置说明
├── services/
│   ├── chatService.ts      # 聊天服务（已增强）
│   ├── qianwenService.ts   # 千问API服务（新增）
│   └── userPreferencesService.ts  # 用户偏好服务（新增）
└── app/
    └── chat/
        └── [id].tsx        # 聊天页面（已更新）
```

## 注意事项

1. **API密钥安全**：不要将API密钥提交到Git仓库
2. **费用控制**：注意API调用费用，开发阶段建议使用 `qwen-turbo` 模型
3. **网络要求**：需要网络连接才能使用AI功能
4. **错误处理**：已实现基础错误处理，可根据需要增强

## 故障排查

### AI不回复
- 检查API密钥是否配置
- 检查网络连接
- 查看控制台错误日志

### API调用失败
- 检查API密钥是否正确
- 检查API配额是否充足
- 查看 `app/config/README.md` 中的详细说明

## 技术支持

如有问题，请检查：
1. `app/config/README.md` - API配置说明
2. 控制台错误日志
3. 千问API文档：https://help.aliyun.com/zh/dashscope/



