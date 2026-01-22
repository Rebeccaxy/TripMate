const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/ai/travel-suggest
 * 根据用户的 Travel DNA 生成旅行建议
 * 需要认证
 */
router.post(
  '/travel-suggest',
  authenticateToken,
  [
    body('travelDNA').isObject().withMessage('travelDNA 必须是对象'),
    body('travelDNA.types').optional().isArray(),
    body('travelDNA.budget').optional().isString(),
    body('travelDNA.pace').optional().isString(),
    body('travelDNA.environment').optional().isArray(),
  ],
  async (req, res) => {
    const startTime = Date.now();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array(),
        });
      }

      const { travelDNA } = req.body;
      const userId = req.user.userId;

      // 构建提示词
      const preferenceParts = [];
      if (travelDNA.types && travelDNA.types.length > 0) {
        preferenceParts.push(`旅行类型：${travelDNA.types.join('、')}`);
      }
      if (travelDNA.budget) {
        preferenceParts.push(`预算范围：${travelDNA.budget}`);
      }
      if (travelDNA.pace) {
        preferenceParts.push(`出行节奏：${travelDNA.pace}`);
      }
      if (travelDNA.environment && travelDNA.environment.length > 0) {
        preferenceParts.push(`环境偏好：${travelDNA.environment.join('、')}`);
      }
      if (travelDNA.wishlist) {
        preferenceParts.push(`愿望清单：${travelDNA.wishlist}`);
      }

      const preferenceText = preferenceParts.length > 0 
        ? preferenceParts.join('；')
        : '暂无详细偏好';

      // 调用千问 API
      const qianwenApiKey = process.env.QIANWEN_API_KEY || '';
      console.log(`[AI路由] 检查API密钥 - 已配置: ${!!qianwenApiKey && qianwenApiKey !== 'YOUR_QIANWEN_API_KEY_HERE'}`);
      
      if (!qianwenApiKey || qianwenApiKey === 'YOUR_QIANWEN_API_KEY_HERE') {
        console.error('[AI路由] ❌ API密钥未配置');
        return res.status(500).json({
          success: false,
          message: 'AI 服务未配置，请配置 QIANWEN_API_KEY 环境变量',
        });
      }
      
      console.log(`[AI路由] ✅ API密钥已配置，前6位: ${qianwenApiKey.substring(0, 6)}...`);

      const prompt = `你是一个专业的旅行规划助手。根据用户的旅行偏好，生成 2-3 个适合的旅行目的地建议。

用户偏好：${preferenceText}

请以 JSON 数组格式返回建议，每个建议包含以下字段：
- country: 国家名称（字符串）
- city: 城市或地区名称（字符串）
- activities: 活动列表（字符串数组，2-3 个活动）
- days: 建议停留天数（数字）

示例格式：
[
  {
    "country": "日本",
    "city": "京都",
    "activities": ["寺庙参观", "抹茶体验"],
    "days": 3
  },
  {
    "country": "中国",
    "city": "丽江",
    "activities": ["古镇闲逛", "玉龙雪山徒步", "民族表演"],
    "days": 4
  }
]

请只返回 JSON 数组，不要包含其他文字说明。`;

      const apiStartTime = Date.now();
      console.log(`[AI路由] 开始调用千问API - 提示词长度: ${prompt.length}字符`);
      
      const qianwenResponse = await fetch(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${qianwenApiKey}`,
          },
          body: JSON.stringify({
            model: 'qwen-turbo',
            input: {
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
            },
            parameters: {
              temperature: 0.7,
              max_tokens: 1000,
              top_p: 0.9,
            },
          }),
        }
      );

      const apiElapsed = Date.now() - apiStartTime;
      console.log(`[AI路由] 千问API响应 - 状态码: ${qianwenResponse.status}, 耗时: ${apiElapsed}ms`);

      if (!qianwenResponse.ok) {
        const errorText = await qianwenResponse.text();
        console.error(`[AI路由] ❌ 千问API调用失败 (${apiElapsed}ms):`, errorText);
        return res.status(500).json({
          success: false,
          message: 'AI 服务调用失败',
          error: errorText.substring(0, 200),
        });
      }
      
      console.log(`[AI路由] ✅ 千问API调用成功 (${apiElapsed}ms)`);

      const qianwenData = await qianwenResponse.json();
      
      // 解析响应
      let suggestions = [];
      if (qianwenData.output?.text) {
        const text = qianwenData.output.text.trim();
        // 尝试提取 JSON 部分
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            suggestions = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('解析 AI 响应 JSON 失败:', e);
            return res.status(500).json({
              success: false,
              message: 'AI 响应格式错误',
            });
          }
        } else {
          // 如果没有找到 JSON，尝试直接解析整个文本
          try {
            suggestions = JSON.parse(text);
          } catch (e) {
            console.error('解析 AI 响应失败:', e);
            return res.status(500).json({
              success: false,
              message: 'AI 响应格式错误',
            });
          }
        }
      } else if (qianwenData.output?.choices && qianwenData.output.choices.length > 0) {
        const content = qianwenData.output.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            suggestions = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('解析 AI 响应 JSON 失败:', e);
            return res.status(500).json({
              success: false,
              message: 'AI 响应格式错误',
            });
          }
        }
      }

      // 验证和格式化建议
      if (!Array.isArray(suggestions)) {
        return res.status(500).json({
          success: false,
          message: 'AI 返回格式不正确',
        });
      }

      // 确保每个建议都有必需的字段
      const formattedSuggestions = suggestions
        .slice(0, 3) // 最多返回 3 个
        .map((s) => ({
          country: s.country || '未知',
          city: s.city || '未知',
          activities: Array.isArray(s.activities) ? s.activities : [],
          days: typeof s.days === 'number' ? s.days : 3,
        }))
        .filter((s) => s.country !== '未知' && s.city !== '未知');

      if (formattedSuggestions.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'AI 未能生成有效的旅行建议',
        });
      }

      res.json({
        success: true,
        suggestions: formattedSuggestions,
      });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[AI路由] ❌ 生成旅行建议失败 (${elapsed}ms):`, error);
      console.error(`[AI路由] 错误堆栈:`, error.stack);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error.message,
      });
    }
  }
);

module.exports = router;
