# 故障排查指南

## 软件闪退问题

如果应用在调用AI时闪退，请按以下步骤排查：

### 1. 查看控制台日志

在终端中查看详细的错误信息，特别是：
- `API响应:` 开头的日志，会显示API返回的前500字符
- `调用千问API失败:` 开头的错误信息
- `获取AI回复失败:` 开头的错误信息

### 2. 检查API密钥和端点

**问题**：`qwen3-vl-flash` 是视觉语言模型，可能需要使用兼容模式端点。

**解决方案**：尝试切换到兼容模式端点

在 `app/config/api.ts` 中，将：
```typescript
API_ENDPOINT: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
```

改为：
```typescript
API_ENDPOINT: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
```

同时，如果使用兼容模式端点，可能需要调整请求格式。请告诉我是否需要我帮你修改。

### 3. 检查模型名称

确认 `qwen3-vl-flash` 模型名称是否正确。可以尝试：
- `qwen-turbo` - 标准文本模型，更稳定
- `qwen-plus` - 平衡性能和速度
- `qwen-max` - 最强性能

### 4. 检查API配额

- 登录 [DashScope控制台](https://dashscope.aliyun.com/)
- 检查API调用配额是否充足
- 检查账户余额

### 5. 测试API调用

可以在终端中测试API调用是否正常：

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3-vl-flash",
    "input": {
      "messages": [
        {
          "role": "user",
          "content": "你好"
        }
      ]
    },
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }'
```

### 6. 常见错误码

- **401**: API密钥无效
- **403**: 权限不足或配额用完
- **429**: 请求过于频繁
- **500**: 服务器内部错误

### 7. 临时解决方案

如果问题持续，可以：
1. 暂时切换到 `qwen-turbo` 模型测试
2. 检查网络连接
3. 重启开发服务器：`npm start -- --clear`

## 需要帮助？

如果问题仍然存在，请提供：
1. 控制台的完整错误日志
2. API响应的前500字符（会在控制台显示）
3. 使用的模型名称和API端点



