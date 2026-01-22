const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 生成JWT令牌
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 注册路由
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('姓名不能为空'),
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').isLength({ min: 6 }).withMessage('密码长度至少为6位'),
  ],
  async (req, res) => {
    try {
      console.log('[auth/register] 收到注册请求:', {
        name: req.body?.name,
        email: req.body?.email,
      });

      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.warn('[auth/register] 输入验证失败:', errors.array());
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { name, email, password } = req.body;

      // 检查邮箱是否已存在
      User.emailExists(email, async (err, exists) => {
        if (err) {
          console.error('[auth/register] 检查邮箱失败:', err);
          return res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试',
          });
        }

        if (exists) {
          console.warn('[auth/register] 邮箱已存在:', email);
          return res.status(400).json({
            success: false,
            message: '该邮箱已被注册',
          });
        }

        // 创建新用户
        const newUser = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name,
          email,
          password,
          createdAt: new Date().toISOString(),
        };

        User.create(newUser, (err, user) => {
          if (err) {
            console.error('[auth/register] 创建用户失败:', err);
            return res.status(500).json({
              success: false,
              message: '注册失败，请稍后重试',
            });
          }

          // 生成JWT令牌
          const token = generateToken(user);

          console.log('[auth/register] 注册成功, userId=', user.id);
          res.status(201).json({
            success: true,
            message: '注册成功',
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              createdAt: user.createdAt,
            },
            token,
          });
        });
      });
    } catch (error) {
      console.error('[auth/register] 未捕获错误:', error);
      res.status(500).json({
        success: false,
        message: '，请稍后重试',
      });
    }
  }
);

// 登录路由
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('邮箱格式不正确'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      // 查找用户
      User.findByEmail(email, (err, user) => {
        if (err) {
          console.error('查找用户失败:', err);
          return res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试',
          });
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            message: '邮箱或密码错误',
          });
        }

        // 验证密码
        User.verifyPassword(password, user.password, (err, isMatch) => {
          if (err) {
            console.error('验证密码失败:', err);
            return res.status(500).json({
              success: false,
              message: '服务器错误，请稍后重试',
            });
          }

          if (!isMatch) {
            return res.status(401).json({
              success: false,
              message: '邮箱或密码错误',
            });
          }

          // 生成JWT令牌
          const token = generateToken(user);

          res.json({
            success: true,
            message: '登录成功',
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              createdAt: user.created_at,
            },
            token,
          });
        });
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '登录失败，请稍后重试',
      });
    }
  }
);

// 获取当前用户信息（需要认证）
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err) {
      console.error('查找用户失败:', err);
      return res.status(500).json({
        success: false,
        message: '服务器错误，请稍后重试',
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }

    // 从请求中尽量解析出客户端 IP（考虑反向代理场景）
    const xForwardedFor = req.headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : (xForwardedFor || '').split(',')[0].trim();
    const clientIp =
      ipFromHeader ||
      (req.connection && req.connection.remoteAddress) ||
      (req.socket && req.socket.remoteAddress) ||
      (req.connection &&
        req.connection.socket &&
        req.connection.socket.remoteAddress) ||
      req.ip ||
      null;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
        ip: clientIp,
      },
    });
  });
});

module.exports = router;
