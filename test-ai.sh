#!/bin/bash

# AI Agent 测试脚本
# 使用方法: ./test-ai.sh "你的问题"

API_KEY="sk-6bde007e38364ea4918c490a93f6856c"
API_ENDPOINT="https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
MODEL="qwen-turbo"

# 获取用户输入的问题
QUESTION="${1:-你好，请简单介绍一下你自己}"

echo "=========================================="
echo "🤖 TripMate AI Agent 测试"
echo "=========================================="
echo "📝 问题: $QUESTION"
echo "⏳ 正在请求AI回复..."
echo ""

# 发送请求并格式化输出
curl -s -X POST "$API_ENDPOINT" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"input\": {
      \"messages\": [
        {
          \"role\": \"system\",
          \"content\": \"你是一个专业的旅行规划助手，名为TripMate。你的任务是帮助用户规划旅行行程、推荐景点、提供旅行建议等。请用中文回复，语气友好、专业。\"
        },
        {
          \"role\": \"user\",
          \"content\": \"$QUESTION\"
        }
      ]
    },
    \"parameters\": {
      \"temperature\": 0.7,
      \"max_tokens\": 2000
    }
  }" | python3 -c "
import sys
import json

try:
    data = json.load(sys.stdin)
    if 'output' in data and 'text' in data['output']:
        print('✅ AI回复:')
        print('=' * 50)
        print(data['output']['text'])
        print('=' * 50)
        if 'usage' in data:
            usage = data['usage']
            print(f'\n📊 Token使用情况:')
            print(f'   - 输入: {usage.get(\"input_tokens\", 0)} tokens')
            print(f'   - 输出: {usage.get(\"output_tokens\", 0)} tokens')
            print(f'   - 总计: {usage.get(\"total_tokens\", 0)} tokens')
    elif 'message' in data:
        print('❌ 错误:', data['message'])
    else:
        print('❌ 未知响应格式:')
        print(json.dumps(data, indent=2, ensure_ascii=False))
except json.JSONDecodeError as e:
    print('❌ JSON解析失败:', e)
    sys.stdin.seek(0)
    print('原始响应:')
    print(sys.stdin.read())
except Exception as e:
    print('❌ 发生错误:', e)
    import traceback
    traceback.print_exc()
"

echo ""
echo "=========================================="
echo "✅ 测试完成"
echo "=========================================="



