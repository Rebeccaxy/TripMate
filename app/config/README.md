# API配置说明

## 千问API配置

### 1. 获取API密钥

1. 访问 [阿里云DashScope控制台](https://dashscope.aliyun.com/)
2. 注册/登录账号
3. 在控制台中创建API Key
4. 复制您的API Key

### 2. 配置API密钥

打开 `app/config/api.ts` 文件，将 `YOUR_QIANWEN_API_KEY_HERE` 替换为您的实际API密钥：

```typescript
export const QIANWEN_CONFIG = {
  API_KEY: 'sk-your-actual-api-key-here', // 替换这里
  // ... 其他配置
};
```

### 3. 模型选择

可以根据需要选择不同的模型：

- **qwen-turbo**: 快速响应，适合对话（推荐用于开发测试）
- **qwen-plus**: 平衡性能和速度
- **qwen-max**: 最强性能（推荐用于生产环境）

在 `app/config/api.ts` 中修改 `MODEL` 字段即可。

### 4. 注意事项

⚠️ **安全提示**：
- 不要将API密钥提交到Git仓库
- 建议使用环境变量管理API密钥（生产环境）
- 当前实现使用代码中的配置，仅适合开发测试

### 5. 费用说明

千问API按调用次数和token数量计费，具体价格请参考：
- [千问API定价](https://help.aliyun.com/zh/dashscope/product-overview/billing)

建议在开发阶段使用 `qwen-turbo` 模型以节省成本。

## 关于价格相关API

当前实现中，AI助手会根据用户的**价格敏感度偏好**来提供建议，但**不会调用其他平台的实时价格API**（如酒店价格、机票价格等）。

如果需要价格查询功能，可以考虑：

1. **免费方案**：
   - 使用公开的旅游信息网站API（如果有免费额度）
   - 使用爬虫获取公开价格信息（需注意法律合规）

2. **付费方案**：
   - 集成携程、去哪儿等平台的API（需要申请API权限）
   - 使用聚合数据等第三方API服务

3. **当前方案**：
   - AI会根据用户偏好提供价格区间建议
   - 引导用户到相关平台自行查询具体价格

## 故障排查

### API调用失败

1. 检查API密钥是否正确配置
2. 检查网络连接
3. 检查API配额是否充足
4. 查看控制台错误日志

### 常见错误

- **API密钥未配置**: 请按照步骤2配置API密钥
- **网络连接失败**: 检查设备网络设置
- **API密钥无效**: 检查API密钥是否正确，是否已过期
- **配额不足**: 检查DashScope控制台中的API配额



