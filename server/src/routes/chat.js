const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// 请求日志中间件
const logRequest = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [聊天API] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const bodyPreview = JSON.stringify(req.body).substring(0, 200);
    console.log(`[${timestamp}] [聊天API] 请求体预览: ${bodyPreview}...`);
  }
  next();
};

router.use(logRequest);

/**
 * GET /api/chat/conversations
 * 获取用户的所有对话
 * 需要认证
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.userId;
  
  try {
    console.log(`[聊天API] 获取对话列表 - 用户ID: ${userId}`);
    
    const conversations = await Conversation.findByUserId(userId);
    const elapsed = Date.now() - startTime;
    
    console.log(`[聊天API] ✅ 获取对话列表成功 - 数量: ${conversations.length}, 耗时: ${elapsed}ms`);
    
    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[聊天API] ❌ 获取对话列表失败 (${elapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: '获取对话列表失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/conversations/:id
 * 获取单个对话详情
 * 需要认证
 */
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.userId;
  const conversationId = req.params.id;
  
  try {
    console.log(`[聊天API] 获取对话详情 - 对话ID: ${conversationId}, 用户ID: ${userId}`);
    
    const conversation = await Conversation.findById(conversationId, userId);
    
    if (!conversation) {
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
      return res.status(404).json({
        success: false,
        message: '对话不存在',
      });
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`[聊天API] ✅ 获取对话详情成功 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
    
    res.json({
      success: true,
      conversation,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[聊天API] ❌ 获取对话详情失败 (${elapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: '获取对话详情失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/conversations
 * 创建新对话
 * 需要认证
 */
router.post(
  '/conversations',
  authenticateToken,
  [
    body('id').isString().notEmpty().withMessage('对话ID不能为空'),
    body('title').isString().notEmpty().withMessage('对话标题不能为空'),
    body('summary').optional().isString(),
  ],
  async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.userId;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const elapsed = Date.now() - startTime;
        console.log(`[聊天API] ⚠️ 请求参数验证失败 (${elapsed}ms):`, errors.array());
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array(),
        });
      }

      const { id, title, summary } = req.body;
      console.log(`[聊天API] 创建对话 - 对话ID: ${id}, 标题: ${title}, 用户ID: ${userId}`);
      
      const conversation = await Conversation.create(userId, { id, title, summary });
      const elapsed = Date.now() - startTime;
      
      console.log(`[聊天API] ✅ 创建对话成功 - 对话ID: ${id}, 耗时: ${elapsed}ms`);
      
      res.json({
        success: true,
        conversation,
      });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[聊天API] ❌ 创建对话失败 (${elapsed}ms):`, error);
      res.status(500).json({
        success: false,
        message: '创建对话失败',
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/chat/conversations/:id
 * 更新对话
 * 需要认证
 */
router.put(
  '/conversations/:id',
  authenticateToken,
  [
    body('title').optional().isString(),
    body('summary').optional().isString(),
  ],
  async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.userId;
    const conversationId = req.params.id;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const elapsed = Date.now() - startTime;
        console.log(`[聊天API] ⚠️ 请求参数验证失败 (${elapsed}ms):`, errors.array());
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array(),
        });
      }

      const updates = req.body;
      console.log(`[聊天API] 更新对话 - 对话ID: ${conversationId}, 用户ID: ${userId}`);
      
      const conversation = await Conversation.update(conversationId, userId, updates);
      
      if (!conversation) {
        const elapsed = Date.now() - startTime;
        console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
        return res.status(404).json({
          success: false,
          message: '对话不存在',
        });
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ✅ 更新对话成功 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
      
      res.json({
        success: true,
        conversation,
      });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[聊天API] ❌ 更新对话失败 (${elapsed}ms):`, error);
      res.status(500).json({
        success: false,
        message: '更新对话失败',
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/chat/conversations/:id
 * 删除对话
 * 需要认证
 */
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.userId;
  const conversationId = req.params.id;
  
  try {
    console.log(`[聊天API] 删除对话 - 对话ID: ${conversationId}, 用户ID: ${userId}`);
    
    const deleted = await Conversation.delete(conversationId, userId);
    
    if (!deleted) {
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
      return res.status(404).json({
        success: false,
        message: '对话不存在',
      });
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`[聊天API] ✅ 删除对话成功 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
    
    res.json({
      success: true,
      message: '对话已删除',
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[聊天API] ❌ 删除对话失败 (${elapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: '删除对话失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/conversations/:id/messages
 * 获取对话的所有消息
 * 需要认证
 */
router.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.userId;
  const conversationId = req.params.id;
  const limit = parseInt(req.query.limit) || 50;
  
  try {
    console.log(`[聊天API] 获取消息列表 - 对话ID: ${conversationId}, 用户ID: ${userId}, 限制: ${limit}`);
    
    // 先检查对话是否存在
    const conversation = await Conversation.findById(conversationId, userId);
    if (!conversation) {
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
      return res.status(404).json({
        success: false,
        message: '对话不存在',
      });
    }
    
    const messages = await Message.findByConversationId(conversationId, userId, limit);
    const elapsed = Date.now() - startTime;
    
    console.log(`[聊天API] ✅ 获取消息列表成功 - 对话ID: ${conversationId}, 数量: ${messages.length}, 耗时: ${elapsed}ms`);
    
    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[聊天API] ❌ 获取消息列表失败 (${elapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: '获取消息列表失败',
      error: error.message,
    });
  }
});

/**
 * POST /api/chat/conversations/:id/messages
 * 创建新消息
 * 需要认证
 */
router.post(
  '/conversations/:id/messages',
  authenticateToken,
  [
    body('id').isString().notEmpty().withMessage('消息ID不能为空'),
    body('text').isString().notEmpty().withMessage('消息内容不能为空'),
    body('isUser').isBoolean().withMessage('isUser必须是布尔值'),
    body('timestamp').optional().isISO8601().withMessage('时间戳格式不正确'),
  ],
  async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.userId;
    const conversationId = req.params.id;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const elapsed = Date.now() - startTime;
        console.log(`[聊天API] ⚠️ 请求参数验证失败 (${elapsed}ms):`, errors.array());
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array(),
        });
      }

      // 先检查对话是否存在
      const conversation = await Conversation.findById(conversationId, userId);
      if (!conversation) {
        const elapsed = Date.now() - startTime;
        console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
        return res.status(404).json({
          success: false,
          message: '对话不存在',
        });
      }

      const { id, text, isUser, timestamp } = req.body;
      console.log(`[聊天API] 创建消息 - 消息ID: ${id}, 对话ID: ${conversationId}, 用户ID: ${userId}, 是否用户: ${isUser}, 文本长度: ${text.length}`);
      
      const message = await Message.create(userId, conversationId, {
        id,
        text,
        isUser,
        timestamp,
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ✅ 创建消息成功 - 消息ID: ${id}, 耗时: ${elapsed}ms`);
      
      res.json({
        success: true,
        message,
      });
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error(`[聊天API] ❌ 创建消息失败 (${elapsed}ms):`, error);
      res.status(500).json({
        success: false,
        message: '创建消息失败',
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/chat/conversations/:id/messages
 * 清空对话的所有消息
 * 需要认证
 */
router.delete('/conversations/:id/messages', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.userId;
  const conversationId = req.params.id;
  
  try {
    console.log(`[聊天API] 清空消息 - 对话ID: ${conversationId}, 用户ID: ${userId}`);
    
    // 先检查对话是否存在
    const conversation = await Conversation.findById(conversationId, userId);
    if (!conversation) {
      const elapsed = Date.now() - startTime;
      console.log(`[聊天API] ⚠️ 对话不存在 - 对话ID: ${conversationId}, 耗时: ${elapsed}ms`);
      return res.status(404).json({
        success: false,
        message: '对话不存在',
      });
    }
    
    const deletedCount = await Message.clearByConversationId(conversationId, userId);
    const elapsed = Date.now() - startTime;
    
    console.log(`[聊天API] ✅ 清空消息成功 - 对话ID: ${conversationId}, 删除数量: ${deletedCount}, 耗时: ${elapsed}ms`);
    
    res.json({
      success: true,
      message: '消息已清空',
      deletedCount,
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[聊天API] ❌ 清空消息失败 (${elapsed}ms):`, error);
    res.status(500).json({
      success: false,
      message: '清空消息失败',
      error: error.message,
    });
  }
});

module.exports = router;
