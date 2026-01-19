# AI Agent 终端测试指南

## 快速测试

### 方法1: 使用测试脚本（推荐）

```bash
# 进入项目目录
cd /Users/morning_glory/codes/TripMate

# 运行测试脚本（使用默认问题）
./test-ai.sh

# 或者指定你的问题
./test-ai.sh "我想去日本旅行，有什么推荐吗？"
./test-ai.sh "帮我规划一个3天的东京行程"
```

### 方法2: 直接使用 curl 命令

```bash
curl -X POST https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-turbo",
    "input": {
      "messages": [
        {
          "role": "system",
          "content": "你是一个专业的旅行规划助手，名为TripMate。"
        },
        {
          "role": "user",
          "content": "你的问题"
        }
      ]
    },
    "parameters": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  }' | python3 -m json.tool
```

### 方法3: 使用 Python 脚本（更友好）

创建一个 `test_ai.py` 文件：

```python
#!/usr/bin/env python3
import json
import sys
import requests

API_KEY = "YOUR_API_KEY"  # 请替换为您的实际API密钥
API_ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"

question = sys.argv[1] if len(sys.argv) > 1 else "你好，请简单介绍一下你自己"

response = requests.post(
    API_ENDPOINT,
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "model": "qwen-turbo",
        "input": {
            "messages": [
                {
                    "role": "system",
                    "content": "你是一个专业的旅行规划助手，名为TripMate。你的任务是帮助用户规划旅行行程、推荐景点、提供旅行建议等。请用中文回复，语气友好、专业。"
                },
                {
                    "role": "user",
                    "content": question
                }
            ]
        },
        "parameters": {
            "temperature": 0.7,
            "max_tokens": 2000
        }
    }
)

data = response.json()
if "output" in data and "text" in data["output"]:
    print("=" * 50)
    print("AI回复:")
    print("=" * 50)
    print(data["output"]["text"])
    print("=" * 50)
else:
    print("错误:", json.dumps(data, indent=2, ensure_ascii=False))
```

然后运行：
```bash
python3 test_ai.py "你的问题"
```

## 测试示例

```bash
# 测试1: 简单问候
./test-ai.sh "你好"

# 测试2: 旅行规划
./test-ai.sh "我想去日本旅行，有什么推荐吗？"

# 测试3: 具体行程
./test-ai.sh "帮我规划一个3天的东京行程"

# 测试4: 景点推荐
./test-ai.sh "推荐一些京都的必去景点"
```

## 注意事项

1. 确保网络连接正常
2. 确保API密钥有效
3. 如果使用Python脚本，需要安装requests库：
   ```bash
   pip3 install requests
   ```

## 故障排查

如果遇到问题：

1. **检查API密钥**: 确认您的API密钥是否有效（请替换文档中的 `YOUR_API_KEY` 为实际密钥）
2. **检查网络**: 确保可以访问 `dashscope.aliyuncs.com`
3. **查看错误信息**: 终端会显示详细的错误信息



