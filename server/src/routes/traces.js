const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const LocationPoint = require('../models/LocationPoint');
const CityVisit = require('../models/CityVisit');
const { authenticateToken } = require('../middleware/auth');

/**
 * POST /api/traces/location
 * 上传位置点
 */
router.post(
  '/location',
  authenticateToken,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('纬度必须在-90到90之间'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('经度必须在-180到180之间'),
    body('timestamp').isInt({ min: 0 }).withMessage('时间戳必须是非负整数'),
    body('accuracy').optional().isFloat({ min: 0 }),
    // iOS/Android 可能返回 -1 表示未知值，这里允许 -1 或不传
    body('speed').optional().isFloat({ min: -1 }),
    body('heading').optional().isFloat({ min: -1, max: 360 }),
    body('cityName').optional().isString(),
    body('provinceName').optional().isString(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const locationData = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        timestamp: req.body.timestamp,
        accuracy: req.body.accuracy,
        speed: req.body.speed,
        heading: req.body.heading,
        cityName: req.body.cityName,
        provinceName: req.body.provinceName,
      };

      const savedLocation = await LocationPoint.save(userId, locationData);

      res.json({
        success: true,
        message: '位置已保存',
        location: savedLocation,
      });
    } catch (error) {
      console.error('上传位置失败:', error);
      res.status(500).json({
        success: false,
        message: '上传位置失败',
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/traces/cities
 * 获取用户的所有城市访问记录
 */
router.get('/cities', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cities = await CityVisit.getUserCityVisits(userId);

    res.json({
      success: true,
      cities,
    });
  } catch (error) {
    console.error('获取城市列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取城市列表失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/cities/:id
 * 获取城市详细信息
 */
router.get('/cities/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const cityId = parseInt(req.params.id);

    if (isNaN(cityId)) {
      return res.status(400).json({
        success: false,
        message: '无效的城市ID',
      });
    }

    const city = await CityVisit.getCityDetails(userId, cityId);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: '城市不存在',
      });
    }

    res.json({
      success: true,
      city,
    });
  } catch (error) {
    console.error('获取城市详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取城市详情失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/stats
 * 获取足迹统计信息
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await CityVisit.getStats(userId);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message,
    });
  }
});

/**
 * GET /api/traces/trajectory
 * 获取位置轨迹
 */
router.get(
  '/trajectory',
  authenticateToken,
  [
    query('startDate').optional().isInt({ min: 0 }),
    query('endDate').optional().isInt({ min: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '输入验证失败',
          errors: errors.array(),
        });
      }

      const userId = req.user.id;
      const startDate = req.query.startDate ? parseInt(req.query.startDate) : undefined;
      const endDate = req.query.endDate ? parseInt(req.query.endDate) : undefined;

      const trajectory = await LocationPoint.getTrajectory(userId, startDate, endDate);

      res.json({
        success: true,
        trajectory,
      });
    } catch (error) {
      console.error('获取轨迹失败:', error);
      res.status(500).json({
        success: false,
        message: '获取轨迹失败',
        error: error.message,
      });
    }
  }
);

module.exports = router;
